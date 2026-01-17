// Gerenciamento de tentativas de PIN anti-brute force
// Armazenado em IndexedDB com rate limiting exponencial

import { getSecurityAttempts, setSecurityAttempts, clearSecurityAttempts, SecurityAttemptData } from './db';

const STORAGE_KEY = 'pin_attempts';
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION = 24 * 60 * 60 * 1000; // 24 horas

// Delays exponenciais em ms: 0s, 2s, 5s, 15s, 30s
const EXPONENTIAL_DELAYS = [0, 2000, 5000, 15000, 30000];

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

export async function getPinAttempts(): Promise<number> {
  return (await getStoredData()).attempts;
}

export async function isPinLocked(): Promise<boolean> {
  return (await getStoredData()).isLocked;
}

export async function getRemainingPinAttempts(): Promise<number> {
  const data = await getStoredData();
  if (data.isLocked) return 0;
  return Math.max(0, MAX_ATTEMPTS - data.attempts);
}

// Retorna o tempo em ms até a próxima tentativa ser permitida
export async function getTimeUntilNextAttempt(): Promise<number> {
  const data = await getStoredData();
  if (!data.nextAllowedAttempt) return 0;
  return Math.max(0, data.nextAllowedAttempt - Date.now());
}

export async function recordFailedPinAttempt(): Promise<{ 
  shouldWipe: boolean; 
  attemptsRemaining: number;
  showRecoveryOption: boolean;
  waitTimeMs: number;
}> {
  const data = await getStoredData();
  
  // Se já estava bloqueado, retorna que deve fazer wipe imediatamente
  if (data.isLocked) {
    return { shouldWipe: true, attemptsRemaining: 0, showRecoveryOption: false, waitTimeMs: 0 };
  }
  
  const newAttempts = data.attempts + 1;
  const attemptsRemaining = Math.max(0, MAX_ATTEMPTS - newAttempts);
  
  // Calcular delay exponencial para próxima tentativa
  const delayIndex = Math.min(newAttempts - 1, EXPONENTIAL_DELAYS.length - 1);
  const delay = EXPONENTIAL_DELAYS[delayIndex];
  const nextAllowedAttempt = Date.now() + delay;
  
  // Se atingiu o limite, marca como bloqueado
  if (newAttempts >= MAX_ATTEMPTS) {
    await saveData({
      key: STORAGE_KEY,
      attempts: newAttempts,
      lastAttemptAt: Date.now(),
      isLocked: true,
      lockedAt: Date.now(),
      nextAllowedAttempt: undefined,
    });
    return { shouldWipe: true, attemptsRemaining: 0, showRecoveryOption: false, waitTimeMs: 0 };
  }
  
  // Ainda tem tentativas, salva o progresso
  await saveData({
    key: STORAGE_KEY,
    attempts: newAttempts,
    lastAttemptAt: Date.now(),
    isLocked: false,
    nextAllowedAttempt,
  });
  
  // Mostrar opção de recuperação após 3 tentativas
  return { 
    shouldWipe: false, 
    attemptsRemaining,
    showRecoveryOption: newAttempts >= 3,
    waitTimeMs: delay
  };
}

export async function recordSuccessfulPinAttempt(): Promise<void> {
  try {
    await clearSecurityAttempts(STORAGE_KEY);
    cachedData = null;
    cacheTimestamp = 0;
    // Limpar também o localStorage antigo (migração)
    localStorage.removeItem('vault_pin_attempts');
  } catch {
    // Silencioso
  }
}

export async function clearPinAttempts(): Promise<void> {
  try {
    await clearSecurityAttempts(STORAGE_KEY);
    cachedData = null;
    cacheTimestamp = 0;
    localStorage.removeItem('vault_pin_attempts');
  } catch {
    // Silencioso
  }
}

// Verificar se o usuário estava bloqueado antes de fechar o app
export async function wasPinLockedOnExit(): Promise<boolean> {
  return (await getStoredData()).isLocked;
}
