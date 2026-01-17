// Gerenciamento de tentativas de recuperação anti-brute force
// Armazenado em IndexedDB com verificação de integridade
// 
// IMPORTANTE: MAX_ATTEMPTS = 2 significa:
// - Primeira falha: Mostra aviso (1 tentativa usada, resta 1)
// - Segunda falha: Inicia wipe automático (2 tentativas usadas, limite atingido)

import { getSecurityAttempts, setSecurityAttempts, clearSecurityAttempts, SecurityAttemptData } from './db';

const STORAGE_KEY = 'recovery_attempts';
const MAX_ATTEMPTS = 2; // Após 2 falhas, faz wipe
const LOCKOUT_DURATION = 24 * 60 * 60 * 1000; // 24 horas

// Cache local para evitar chamadas assíncronas desnecessárias
let cachedData: SecurityAttemptData | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 1000; // 1 segundo

// Gera hash de integridade para detectar manipulação
async function generateIntegrityHash(data: Omit<SecurityAttemptData, 'integrityHash'>): Promise<string> {
  const str = `${data.key}:${data.attempts}:${data.lastAttemptAt}:${data.isLocked}:${data.lockedAt || 0}:${data.nextAllowedAttempt || 0}`;
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(str));
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.slice(0, 8).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function verifyIntegrity(data: SecurityAttemptData): Promise<boolean> {
  const expectedHash = await generateIntegrityHash(data);
  return data.integrityHash === expectedHash;
}

async function getStoredData(): Promise<SecurityAttemptData> {
  // Usar cache se ainda válido
  if (cachedData && Date.now() - cacheTimestamp < CACHE_TTL) {
    return cachedData;
  }

  try {
    const stored = await getSecurityAttempts(STORAGE_KEY);
    if (stored) {
      // Verificar integridade
      const isValid = await verifyIntegrity(stored);
      if (!isValid) {
        // Dados manipulados - considerar como bloqueado
        return {
          key: STORAGE_KEY,
          attempts: MAX_ATTEMPTS,
          lastAttemptAt: Date.now(),
          isLocked: true,
          lockedAt: Date.now(),
          integrityHash: ''
        };
      }
      
      // Verificar se o bloqueio expirou (após 24h)
      if (stored.isLocked && stored.lockedAt) {
        const elapsed = Date.now() - stored.lockedAt;
        if (elapsed > LOCKOUT_DURATION) {
          const newData = { 
            key: STORAGE_KEY,
            attempts: 0, 
            lastAttemptAt: 0, 
            isLocked: false,
            integrityHash: ''
          };
          newData.integrityHash = await generateIntegrityHash(newData);
          await setSecurityAttempts(newData);
          cachedData = newData;
          cacheTimestamp = Date.now();
          return newData;
        }
      }
      
      cachedData = stored;
      cacheTimestamp = Date.now();
      return stored;
    }
  } catch {
    // Em caso de erro, retorna estado limpo
  }
  
  const defaultData: SecurityAttemptData = { 
    key: STORAGE_KEY,
    attempts: 0, 
    lastAttemptAt: 0, 
    isLocked: false,
    integrityHash: ''
  };
  defaultData.integrityHash = await generateIntegrityHash(defaultData);
  return defaultData;
}

async function saveData(data: Omit<SecurityAttemptData, 'integrityHash'>): Promise<void> {
  const dataWithHash: SecurityAttemptData = {
    ...data,
    integrityHash: await generateIntegrityHash(data)
  };
  
  try {
    await setSecurityAttempts(dataWithHash);
    cachedData = dataWithHash;
    cacheTimestamp = Date.now();
  } catch {
    // Silencioso em caso de erro
  }
}

export async function getRecoveryAttempts(): Promise<number> {
  return (await getStoredData()).attempts;
}

export async function isRecoveryLocked(): Promise<boolean> {
  return (await getStoredData()).isLocked;
}

export async function getRemainingAttempts(): Promise<number> {
  const data = await getStoredData();
  if (data.isLocked) return 0;
  return Math.max(0, MAX_ATTEMPTS - data.attempts);
}

export async function recordFailedAttempt(): Promise<{ 
  shouldWipe: boolean; 
  attemptsRemaining: number;
  isWarning: boolean;
}> {
  const data = await getStoredData();
  
  // Se já estava bloqueado, retorna que deve fazer wipe imediatamente
  if (data.isLocked) {
    return { shouldWipe: true, attemptsRemaining: 0, isWarning: false };
  }
  
  const newAttempts = data.attempts + 1;
  const attemptsRemaining = Math.max(0, MAX_ATTEMPTS - newAttempts);
  
  // Se atingiu o limite, marca como bloqueado
  if (newAttempts >= MAX_ATTEMPTS) {
    await saveData({
      key: STORAGE_KEY,
      attempts: newAttempts,
      lastAttemptAt: Date.now(),
      isLocked: true,
      lockedAt: Date.now(),
    });
    return { shouldWipe: true, attemptsRemaining: 0, isWarning: false };
  }
  
  // Ainda tem tentativas, salva o progresso
  await saveData({
    key: STORAGE_KEY,
    attempts: newAttempts,
    lastAttemptAt: Date.now(),
    isLocked: false,
  });
  
  // Aviso na primeira falha
  return { 
    shouldWipe: false, 
    attemptsRemaining,
    isWarning: newAttempts === 1
  };
}

export async function recordSuccessfulAttempt(): Promise<void> {
  try {
    await clearSecurityAttempts(STORAGE_KEY);
    cachedData = null;
    cacheTimestamp = 0;
    // Limpar também o localStorage antigo (migração)
    localStorage.removeItem('vault_recovery_attempts');
  } catch {
    // Silencioso
  }
}

export async function clearRecoveryAttempts(): Promise<void> {
  try {
    await clearSecurityAttempts(STORAGE_KEY);
    cachedData = null;
    cacheTimestamp = 0;
    localStorage.removeItem('vault_recovery_attempts');
  } catch {
    // Silencioso
  }
}

// Verificar se o usuário estava bloqueado antes de fechar o app
export async function wasLockedOnExit(): Promise<boolean> {
  return (await getStoredData()).isLocked;
}
