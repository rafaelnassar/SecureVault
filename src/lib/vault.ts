import { deriveKey, encrypt, decrypt, generateSalt, arrayBufferToBase64, base64ToArrayBuffer } from './crypto';
import { getConfig, setConfig, getAllPasswords, addPassword, updatePassword, deletePassword, PasswordEntry, clearAllData, getAllCryptoKeys, addCryptoKey, updateCryptoKey, deleteCryptoKey, CryptoKeyEntry } from './db';
import { generateRecoveryWords } from './recoveryWords';

const VERIFICATION_TEXT = 'vault-verified';
const DEFAULT_SESSION_TIMEOUT = 2 * 60 * 1000; // 2 minutes default

let currentKey: CryptoKey | null = null;
let lastActivity: number = Date.now();
let sessionCheckInterval: number | null = null;
let currentSessionTimeout: number = DEFAULT_SESSION_TIMEOUT;

export type { CryptoKeyEntry } from './db';

/**
 * Gets the current session timeout in milliseconds
 */
export async function getSessionTimeout(): Promise<number> {
  const config = await getConfig();
  const minutes = config?.sessionTimeoutMinutes || 2;
  return minutes * 60 * 1000;
}

/**
 * Sets the session timeout in minutes
 */
export async function setSessionTimeout(minutes: number): Promise<void> {
  const config = await getConfig();
  if (config) {
    await setConfig({ ...config, sessionTimeoutMinutes: minutes });
    currentSessionTimeout = minutes * 60 * 1000;
    // Reset lastActivity to apply the new timeout immediately
    lastActivity = Date.now();

    // Notify UI hooks (e.g., useAutoLockTimer) to update instantly
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('vault:session-timeout-changed', {
          detail: { minutes, ms: currentSessionTimeout },
        })
      );
    }
  }
}

/**
 * Forces a refresh of the session timeout from the database
 * Should be called when settings change
 */
export async function refreshSessionTimeout(): Promise<void> {
  const config = await getConfig();
  if (config?.sessionTimeoutMinutes) {
    currentSessionTimeout = config.sessionTimeoutMinutes * 60 * 1000;

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('vault:session-timeout-changed', {
          detail: { minutes: config.sessionTimeoutMinutes, ms: currentSessionTimeout },
        })
      );
    }
  }
}

export function isVaultLocked(): boolean {
  if (!currentKey) return true;
  if (Date.now() - lastActivity > currentSessionTimeout) {
    lockVault();
    return true;
  }
  return false;
}

export function updateActivity(): void {
  lastActivity = Date.now();
}

export function lockVault(): void {
  currentKey = null;
  if (sessionCheckInterval) {
    clearInterval(sessionCheckInterval);
    sessionCheckInterval = null;
  }
}

export async function isVaultSetup(): Promise<boolean> {
  const config = await getConfig();
  return !!config;
}

export async function isRecoverySetupComplete(): Promise<boolean> {
  const config = await getConfig();
  return config?.recoverySetupComplete === true;
}

export async function markRecoverySetupComplete(): Promise<void> {
  const config = await getConfig();
  if (config) {
    await setConfig({ ...config, recoverySetupComplete: true });
  }
}

export async function getRecoveryWords(): Promise<string[] | undefined> {
  const config = await getConfig();
  
  // Try to decrypt encrypted recovery words first (new secure format)
  if (config?.encryptedRecoveryWords && config.recoveryWordsIv && currentKey) {
    try {
      const iv = base64ToArrayBuffer(config.recoveryWordsIv);
      const ciphertext = base64ToArrayBuffer(config.encryptedRecoveryWords);
      const decrypted = await decrypt(ciphertext, iv, currentKey);
      return JSON.parse(decrypted);
    } catch {
      // Fall back to legacy plain text storage
    }
  }
  
  // Legacy: plain text recovery words
  return config?.recoveryWords;
}

/**
 * Generates SHA-256 hash of recovery words for verification
 */
async function hashRecoveryWords(words: string[]): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(words.join(' ').toLowerCase());
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function setupVault(pin: string): Promise<{ success: boolean; recoveryWords?: string[] }> {
  try {
    const existingConfig = await getConfig();
    const salt = existingConfig ? base64ToArrayBuffer(existingConfig.salt) : await generateSalt();
    const key = await deriveKey(pin, salt);
    
    // Create verification data
    const { iv, ciphertext } = await encrypt(VERIFICATION_TEXT, key);
    
    // Generate recovery words only for new setup (6 words = 66 bits entropy)
    let recoveryWords: string[] | undefined;
    let encryptedRecoveryWords: string | undefined;
    let recoveryWordsIv: string | undefined;
    let recoveryWordsHash: string | undefined;
    
    if (existingConfig?.encryptedRecoveryWords) {
      // Keep existing encrypted recovery words
      encryptedRecoveryWords = existingConfig.encryptedRecoveryWords;
      recoveryWordsIv = existingConfig.recoveryWordsIv;
      recoveryWordsHash = existingConfig.recoveryWordsHash;
    } else if (existingConfig?.recoveryWords) {
      // Migrate legacy plain text to encrypted format
      recoveryWords = existingConfig.recoveryWords;
      const wordsJson = JSON.stringify(recoveryWords);
      const encrypted = await encrypt(wordsJson, key);
      encryptedRecoveryWords = arrayBufferToBase64(encrypted.ciphertext);
      recoveryWordsIv = arrayBufferToBase64(encrypted.iv);
      recoveryWordsHash = await hashRecoveryWords(recoveryWords);
    } else {
      // Generate new recovery words
      recoveryWords = generateRecoveryWords(6);
      const wordsJson = JSON.stringify(recoveryWords);
      const encrypted = await encrypt(wordsJson, key);
      encryptedRecoveryWords = arrayBufferToBase64(encrypted.ciphertext);
      recoveryWordsIv = arrayBufferToBase64(encrypted.iv);
      recoveryWordsHash = await hashRecoveryWords(recoveryWords);
    }
    
    await setConfig({
      salt: arrayBufferToBase64(salt),
      verificationData: arrayBufferToBase64(ciphertext),
      verificationIv: arrayBufferToBase64(iv),
      // Store encrypted recovery words
      encryptedRecoveryWords,
      recoveryWordsIv,
      recoveryWordsHash,
      // Keep legacy field for backward compatibility during migration
      recoveryWords: undefined, // Clear legacy plain text storage
      recoverySetupComplete: existingConfig?.recoverySetupComplete || false,
      sessionTimeoutMinutes: existingConfig?.sessionTimeoutMinutes || 2,
    });
    
    currentKey = key;
    lastActivity = Date.now();
    currentSessionTimeout = (existingConfig?.sessionTimeoutMinutes || 2) * 60 * 1000;
    startSessionCheck();
    
    // Return words only if this is a new setup
    return { 
      success: true, 
      recoveryWords: existingConfig?.recoverySetupComplete ? undefined : recoveryWords 
    };
  } catch {
    return { success: false };
  }
}

export async function unlockVault(pin: string): Promise<boolean> {
  try {
    const config = await getConfig();
    if (!config) return false;
    
    const salt = base64ToArrayBuffer(config.salt);
    const key = await deriveKey(pin, salt);
    
    // Verify PIN by attempting to decrypt verification data
    const iv = base64ToArrayBuffer(config.verificationIv);
    const ciphertext = base64ToArrayBuffer(config.verificationData);
    
    const decrypted = await decrypt(ciphertext, iv, key);
    
    if (decrypted !== VERIFICATION_TEXT) {
      return false;
    }
    
    currentKey = key;
    lastActivity = Date.now();
    currentSessionTimeout = (config.sessionTimeoutMinutes || 2) * 60 * 1000;
    startSessionCheck();
    
    // Migrate legacy plain text recovery words to encrypted format
    if (config.recoveryWords && !config.encryptedRecoveryWords) {
      const wordsJson = JSON.stringify(config.recoveryWords);
      const encrypted = await encrypt(wordsJson, currentKey);
      const recoveryWordsHash = await hashRecoveryWords(config.recoveryWords);
      
      await setConfig({
        ...config,
        encryptedRecoveryWords: arrayBufferToBase64(encrypted.ciphertext),
        recoveryWordsIv: arrayBufferToBase64(encrypted.iv),
        recoveryWordsHash,
        recoveryWords: undefined, // Clear legacy plain text
      });
    }
    
    return true;
  } catch {
    return false;
  }
}

export async function destroyVault(): Promise<void> {
  lockVault();
  await clearAllData();
}

function startSessionCheck(): void {
  if (sessionCheckInterval) {
    clearInterval(sessionCheckInterval);
  }
  sessionCheckInterval = window.setInterval(() => {
    if (Date.now() - lastActivity > currentSessionTimeout) {
      lockVault();
    }
  }, 10000);
}

export async function getPasswords(): Promise<Array<{ id: string; site: string; login?: string; password: string; isSensitive?: boolean; createdAt: number; updatedAt: number }>> {
  if (!currentKey) throw new Error('Vault is locked');
  updateActivity();
  
  const entries = await getAllPasswords();
  const decrypted = await Promise.all(
    entries.map(async (entry) => {
      try {
        const iv = base64ToArrayBuffer(entry.iv);
        const ciphertext = base64ToArrayBuffer(entry.encryptedPassword);
        const password = await decrypt(ciphertext, iv, currentKey!);
        
        return {
          id: entry.id,
          site: entry.site,
          login: entry.login,
          password,
          isSensitive: entry.isSensitive,
          createdAt: entry.createdAt,
          updatedAt: entry.updatedAt,
        };
      } catch {
        // Skip corrupted entries
        return null;
      }
    })
  );
  
  return decrypted.filter((entry): entry is NonNullable<typeof entry> => entry !== null);
}

export async function savePassword(site: string, password: string, login?: string, existingId?: string, isSensitive?: boolean): Promise<void> {
  if (!currentKey) throw new Error('Vault is locked');
  updateActivity();
  
  const { iv, ciphertext } = await encrypt(password, currentKey);
  
  const entry: PasswordEntry = {
    id: existingId || crypto.randomUUID(),
    site,
    login: login || undefined,
    encryptedPassword: arrayBufferToBase64(ciphertext),
    iv: arrayBufferToBase64(iv),
    isSensitive: isSensitive || undefined,
    createdAt: existingId ? Date.now() : Date.now(),
    updatedAt: Date.now(),
  };
  
  if (existingId) {
    const existing = (await getAllPasswords()).find(p => p.id === existingId);
    if (existing) {
      entry.createdAt = existing.createdAt;
    }
    await updatePassword(entry);
  } else {
    await addPassword(entry);
  }
}

export async function removePassword(id: string): Promise<void> {
  if (!currentKey) throw new Error('Vault is locked');
  updateActivity();
  await deletePassword(id);
}

// Export/Import functionality

// Encrypted backup format marker
const ENCRYPTED_BACKUP_MARKER = 'ENCRYPTED_VAULT_BACKUP_V1';

export interface VaultBackup {
  version: 1 | 2 | 3 | 4;
  exportedAt: number;
  checksum: string;
  /** Salt do cofre no momento do backup (necessário para restauração em outro cofre) */
  vaultSalt?: string;
  passwords: PasswordEntry[];
  /** Chaves de criptomoeda (v3+) */
  cryptoKeys?: CryptoKeyEntry[];
}

export interface EncryptedVaultBackup {
  marker: typeof ENCRYPTED_BACKUP_MARKER;
  salt: string;
  iv: string;
  data: string;
}

/**
 * Generates SHA-256 checksum for backup integrity verification
 * Returns first 16 hex characters for compact representation
 */
async function generateChecksumSHA256(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(data));
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.slice(0, 8).map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Legacy djb2 checksum for backward compatibility with v3 backups
 */
function generateChecksumLegacy(data: string): string {
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
}

/**
 * Verifies checksum supporting both SHA-256 and legacy djb2
 */
async function verifyChecksum(data: string, checksum: string): Promise<boolean> {
  // Try SHA-256 first (new format - 16 hex chars)
  const sha256Checksum = await generateChecksumSHA256(data);
  if (sha256Checksum === checksum) {
    return true;
  }
  
  // Fall back to legacy djb2 for older backups
  const legacyChecksum = generateChecksumLegacy(data);
  return legacyChecksum === checksum;
}

export async function exportVault(backupPassword?: string): Promise<string> {
  if (!currentKey) throw new Error('Vault is locked');
  updateActivity();

  const config = await getConfig();
  if (!config?.salt) {
    throw new Error('Configuração do cofre inválida');
  }

  const passwords = await getAllPasswords();
  const cryptoKeys = await getAllCryptoKeys();

  // Validate each password entry before export
  const validPasswords = passwords.filter(p =>
    p.id && p.site && p.encryptedPassword && p.iv &&
    typeof p.createdAt === 'number' && typeof p.updatedAt === 'number'
  );

  // Validate each crypto key entry before export
  const validCryptoKeys = cryptoKeys.filter(k =>
    k.id && k.name && k.network && k.encryptedWalletAddress && k.walletAddressIv &&
    typeof k.createdAt === 'number' && typeof k.updatedAt === 'number'
  );

  // Generate SHA-256 checksum from all data
  const dataJson = JSON.stringify({ passwords: validPasswords, cryptoKeys: validCryptoKeys });
  const checksum = await generateChecksumSHA256(dataJson);

  // v4 includes crypto keys and optional encryption
  const backup: VaultBackup = {
    version: 4,
    exportedAt: Date.now(),
    checksum,
    vaultSalt: config.salt,
    passwords: validPasswords,
    cryptoKeys: validCryptoKeys,
  };

  const backupJson = JSON.stringify(backup, null, 2);

  // If password provided, encrypt the entire backup
  if (backupPassword && backupPassword.length >= 4) {
    const salt = await generateSalt();
    const key = await deriveKey(backupPassword, salt);
    const { iv, ciphertext } = await encrypt(backupJson, key);

    const encryptedBackup: EncryptedVaultBackup = {
      marker: ENCRYPTED_BACKUP_MARKER,
      salt: arrayBufferToBase64(salt),
      iv: arrayBufferToBase64(iv),
      data: arrayBufferToBase64(ciphertext),
    };

    return JSON.stringify(encryptedBackup, null, 2);
  }

  return backupJson;
}

/**
 * Checks if a backup file is encrypted with an additional password
 */
export function isBackupEncrypted(jsonData: string): boolean {
  try {
    const parsed = JSON.parse(jsonData);
    return parsed?.marker === ENCRYPTED_BACKUP_MARKER;
  } catch {
    return false;
  }
}

/**
 * Decrypts an encrypted backup with the provided password
 */
export async function decryptBackup(jsonData: string, password: string): Promise<string> {
  const encrypted: EncryptedVaultBackup = JSON.parse(jsonData);
  
  if (encrypted.marker !== ENCRYPTED_BACKUP_MARKER) {
    throw new Error('Backup não está criptografado');
  }

  const salt = base64ToArrayBuffer(encrypted.salt);
  const iv = base64ToArrayBuffer(encrypted.iv);
  const data = base64ToArrayBuffer(encrypted.data);

  const key = await deriveKey(password, salt);
  
  try {
    const decrypted = await decrypt(data, iv, key);
    return decrypted;
  } catch {
    throw new Error('Senha do backup incorreta');
  }
}

export async function importVault(
  jsonData: string,
  backupPin?: string
): Promise<{ imported: number; skipped: number; duplicates: number; cryptoImported?: number }> {
  if (!currentKey) throw new Error('Vault is locked');
  updateActivity();

  let backup: VaultBackup;

  // Step 1: Parse JSON
  try {
    backup = JSON.parse(jsonData);
  } catch {
    throw new Error('Arquivo JSON inválido ou corrompido');
  }

  // Step 2: Validate backup structure
  if (!backup || typeof backup !== 'object') {
    throw new Error('Formato de backup inválido');
  }

  if (backup.version !== 1 && backup.version !== 2 && backup.version !== 3 && backup.version !== 4) {
    throw new Error('Versão de backup não suportada');
  }

  // Allow backups with either passwords or crypto keys
  const hasPasswords = backup.passwords && Array.isArray(backup.passwords) && backup.passwords.length > 0;
  const hasCryptoKeys = backup.cryptoKeys && Array.isArray(backup.cryptoKeys) && backup.cryptoKeys.length > 0;

  if (!hasPasswords && !hasCryptoKeys) {
    throw new Error('Backup não contém dados válidos');
  }

  if (typeof backup.exportedAt !== 'number') {
    throw new Error('Backup não contém data de exportação válida');
  }

  // Step 3: Validate checksum if present (supports SHA-256 and legacy djb2)
  if (backup.checksum) {
    let dataJson: string;
    if (backup.version === 3 || backup.version === 4) {
      dataJson = JSON.stringify({ passwords: backup.passwords || [], cryptoKeys: backup.cryptoKeys || [] });
    } else {
      dataJson = JSON.stringify(backup.passwords || []);
    }
    const isValidChecksum = await verifyChecksum(dataJson, backup.checksum);
    if (!isValidChecksum) {
      throw new Error('Checksum inválido - arquivo pode estar corrompido');
    }
  }

  // Step 4: Get existing data for duplicate detection
  const existingPasswords = await getAllPasswords();
  const existingPasswordIds = new Set(existingPasswords.map(p => p.id));
  const existingPasswordKeys = new Set(existingPasswords.map(p => `${p.site.toLowerCase()}|${(p.login || '').toLowerCase()}`));

  const existingCryptoKeys = await getAllCryptoKeys();
  const existingCryptoIds = new Set(existingCryptoKeys.map(k => k.id));
  const existingCryptoAddresses = new Set(existingCryptoKeys.map(k => `${k.network}|${k.name.toLowerCase()}`));

  let imported = 0;
  let skipped = 0;
  let duplicates = 0;
  let cryptoImported = 0;

  // Determine if re-encryption is needed
  const currentConfig = await getConfig();
  const currentSalt = currentConfig?.salt;
  const backupSalt = backup.vaultSalt;
  const requiresReencrypt = !!(backupSalt && currentSalt && backupSalt !== currentSalt);

  let backupKey: CryptoKey | null = null;
  if (requiresReencrypt) {
    if (!backupPin) {
      throw new Error('Digite o PIN do backup para importar');
    }

    backupKey = await deriveKey(backupPin, base64ToArrayBuffer(backupSalt!));

    // Sanity check: validate PIN by trying to decrypt an entry
    const sample = backup.passwords?.find((e) => e?.encryptedPassword && e?.iv) || 
                   backup.cryptoKeys?.find((e) => e?.encryptedWalletAddress && e?.walletAddressIv);
    if (sample) {
      try {
        if ('encryptedPassword' in sample) {
          await decrypt(
            base64ToArrayBuffer(sample.encryptedPassword),
            base64ToArrayBuffer(sample.iv),
            backupKey
          );
        } else {
          await decrypt(
            base64ToArrayBuffer(sample.encryptedWalletAddress),
            base64ToArrayBuffer(sample.walletAddressIv),
            backupKey
          );
        }
      } catch {
        throw new Error('PIN do backup incorreto');
      }
    }
  }

  // Step 5: Process password entries
  if (backup.passwords && Array.isArray(backup.passwords)) {
    for (const entry of backup.passwords) {
      if (!entry || typeof entry !== 'object') { skipped++; continue; }
      if (!entry.id || typeof entry.id !== 'string') { skipped++; continue; }
      if (!entry.site || typeof entry.site !== 'string') { skipped++; continue; }
      if (!entry.encryptedPassword || typeof entry.encryptedPassword !== 'string') { skipped++; continue; }
      if (!entry.iv || typeof entry.iv !== 'string') { skipped++; continue; }

      try {
        base64ToArrayBuffer(entry.encryptedPassword);
        base64ToArrayBuffer(entry.iv);
      } catch { skipped++; continue; }

      const entryKey = `${entry.site.toLowerCase()}|${(entry.login || '').toLowerCase()}`;

      if (existingPasswordIds.has(entry.id) || existingPasswordKeys.has(entryKey)) {
        duplicates++;
        continue;
      }

      try {
        let encryptedPassword = entry.encryptedPassword;
        let iv = entry.iv;

        if (requiresReencrypt && backupKey) {
          const plaintext = await decrypt(
            base64ToArrayBuffer(entry.encryptedPassword),
            base64ToArrayBuffer(entry.iv),
            backupKey
          );
          const reencrypted = await encrypt(plaintext, currentKey);
          encryptedPassword = arrayBufferToBase64(reencrypted.ciphertext);
          iv = arrayBufferToBase64(reencrypted.iv);
        }

        const newEntry: PasswordEntry = {
          id: crypto.randomUUID(),
          site: entry.site,
          login: entry.login || undefined,
          encryptedPassword,
          iv,
          createdAt: typeof entry.createdAt === 'number' ? entry.createdAt : Date.now(),
          updatedAt: Date.now(),
        };

        await addPassword(newEntry);
        imported++;
        existingPasswordKeys.add(entryKey);
        existingPasswordIds.add(newEntry.id);
      } catch { skipped++; }
    }
  }

  // Step 6: Process crypto key entries (v3+)
  if (backup.cryptoKeys && Array.isArray(backup.cryptoKeys)) {
    for (const entry of backup.cryptoKeys) {
      if (!entry || typeof entry !== 'object') { skipped++; continue; }
      if (!entry.id || !entry.name || !entry.network) { skipped++; continue; }
      if (!entry.encryptedWalletAddress || !entry.walletAddressIv) { skipped++; continue; }

      try {
        base64ToArrayBuffer(entry.encryptedWalletAddress);
        base64ToArrayBuffer(entry.walletAddressIv);
      } catch { skipped++; continue; }

      const cryptoKey = `${entry.network}|${entry.name.toLowerCase()}`;

      if (existingCryptoIds.has(entry.id) || existingCryptoAddresses.has(cryptoKey)) {
        duplicates++;
        continue;
      }

      try {
        let newEntry: CryptoKeyEntry = {
          id: crypto.randomUUID(),
          name: entry.name,
          network: entry.network,
          encryptedWalletAddress: entry.encryptedWalletAddress,
          walletAddressIv: entry.walletAddressIv,
          encryptedPrivateKey: entry.encryptedPrivateKey,
          privateKeyIv: entry.privateKeyIv,
          encryptedSeedPhrase: entry.encryptedSeedPhrase,
          seedPhraseIv: entry.seedPhraseIv,
          encryptedNotes: entry.encryptedNotes,
          notesIv: entry.notesIv,
          createdAt: typeof entry.createdAt === 'number' ? entry.createdAt : Date.now(),
          updatedAt: Date.now(),
        };

        // Re-encrypt all fields if needed
        if (requiresReencrypt && backupKey) {
          // Re-encrypt wallet address
          const walletAddr = await decrypt(base64ToArrayBuffer(entry.encryptedWalletAddress), base64ToArrayBuffer(entry.walletAddressIv), backupKey);
          const reWallet = await encrypt(walletAddr, currentKey);
          newEntry.encryptedWalletAddress = arrayBufferToBase64(reWallet.ciphertext);
          newEntry.walletAddressIv = arrayBufferToBase64(reWallet.iv);

          // Re-encrypt private key if present
          if (entry.encryptedPrivateKey && entry.privateKeyIv) {
            const pk = await decrypt(base64ToArrayBuffer(entry.encryptedPrivateKey), base64ToArrayBuffer(entry.privateKeyIv), backupKey);
            const rePk = await encrypt(pk, currentKey);
            newEntry.encryptedPrivateKey = arrayBufferToBase64(rePk.ciphertext);
            newEntry.privateKeyIv = arrayBufferToBase64(rePk.iv);
          }

          // Re-encrypt seed phrase if present
          if (entry.encryptedSeedPhrase && entry.seedPhraseIv) {
            const sp = await decrypt(base64ToArrayBuffer(entry.encryptedSeedPhrase), base64ToArrayBuffer(entry.seedPhraseIv), backupKey);
            const reSp = await encrypt(sp, currentKey);
            newEntry.encryptedSeedPhrase = arrayBufferToBase64(reSp.ciphertext);
            newEntry.seedPhraseIv = arrayBufferToBase64(reSp.iv);
          }

          // Re-encrypt notes if present
          if (entry.encryptedNotes && entry.notesIv) {
            const notes = await decrypt(base64ToArrayBuffer(entry.encryptedNotes), base64ToArrayBuffer(entry.notesIv), backupKey);
            const reNotes = await encrypt(notes, currentKey);
            newEntry.encryptedNotes = arrayBufferToBase64(reNotes.ciphertext);
            newEntry.notesIv = arrayBufferToBase64(reNotes.iv);
          }
        }

        await addCryptoKey(newEntry);
        cryptoImported++;
        existingCryptoAddresses.add(cryptoKey);
        existingCryptoIds.add(newEntry.id);
      } catch { skipped++; }
    }
  }

  return { imported, skipped, duplicates, cryptoImported };
}

export async function getPasswordCount(): Promise<number> {
  const passwords = await getAllPasswords();
  return passwords.length;
}

// Backup Preview
export interface BackupPreviewResult {
  version: number;
  exportedAt: number;
  passwordCount: number;
  cryptoKeyCount: number;
  hasDifferentVault: boolean;
  isEncrypted: boolean;
  isValid: boolean;
  errorMessage?: string;
}

export async function previewBackup(jsonData: string): Promise<BackupPreviewResult> {
  try {
    const parsed = JSON.parse(jsonData);
    
    // Check if backup is encrypted
    if (parsed?.marker === ENCRYPTED_BACKUP_MARKER) {
      return { 
        version: 0, 
        exportedAt: 0, 
        passwordCount: 0, 
        cryptoKeyCount: 0, 
        hasDifferentVault: false, 
        isEncrypted: true,
        isValid: true,
        errorMessage: undefined
      };
    }
    
    const backup = parsed as VaultBackup;
    
    if (!backup || typeof backup !== 'object') {
      return { version: 0, exportedAt: 0, passwordCount: 0, cryptoKeyCount: 0, hasDifferentVault: false, isEncrypted: false, isValid: false, errorMessage: 'Formato de backup inválido' };
    }
    
    if (backup.version !== 1 && backup.version !== 2 && backup.version !== 3 && backup.version !== 4) {
      return { version: 0, exportedAt: 0, passwordCount: 0, cryptoKeyCount: 0, hasDifferentVault: false, isEncrypted: false, isValid: false, errorMessage: 'Versão de backup não suportada' };
    }
    
    const passwordCount = Array.isArray(backup.passwords) ? backup.passwords.length : 0;
    const cryptoKeyCount = Array.isArray(backup.cryptoKeys) ? backup.cryptoKeys.length : 0;
    
    if (passwordCount === 0 && cryptoKeyCount === 0) {
      return { version: backup.version, exportedAt: backup.exportedAt || 0, passwordCount: 0, cryptoKeyCount: 0, hasDifferentVault: false, isEncrypted: false, isValid: false, errorMessage: 'Backup vazio' };
    }
    
    const currentConfig = await getConfig();
    const currentSalt = currentConfig?.salt;
    const backupSalt = backup.vaultSalt;
    const hasDifferentVault = !!(backupSalt && currentSalt && backupSalt !== currentSalt);
    
    // Validate checksum (supports SHA-256 and legacy djb2)
    if (backup.checksum) {
      let dataJson: string;
      if (backup.version === 3 || backup.version === 4) {
        dataJson = JSON.stringify({ passwords: backup.passwords || [], cryptoKeys: backup.cryptoKeys || [] });
      } else {
        dataJson = JSON.stringify(backup.passwords || []);
      }
      const isValidChecksum = await verifyChecksum(dataJson, backup.checksum);
      if (!isValidChecksum) {
        return { version: backup.version, exportedAt: backup.exportedAt, passwordCount, cryptoKeyCount, hasDifferentVault, isEncrypted: false, isValid: false, errorMessage: 'Checksum inválido' };
      }
    }
    
    return { version: backup.version, exportedAt: backup.exportedAt || 0, passwordCount, cryptoKeyCount, hasDifferentVault, isEncrypted: false, isValid: true };
  } catch {
    return { version: 0, exportedAt: 0, passwordCount: 0, cryptoKeyCount: 0, hasDifferentVault: false, isEncrypted: false, isValid: false, errorMessage: 'Arquivo JSON inválido' };
  }
}


// Crypto Key functions
export interface CryptoKeyData {
  id?: string;
  name: string;
  login?: string;
  walletAddress: string;
  privateKey?: string;
  seedPhrase?: string;
  recoveryWords?: string[];
  notes?: string;
  createdAt?: number;
  updatedAt?: number;
}

export async function getCryptoKeys(): Promise<CryptoKeyData[]> {
  if (!currentKey) throw new Error('Vault is locked');
  updateActivity();
  
  const entries = await getAllCryptoKeys();
  const decrypted = await Promise.all(
    entries.map(async (entry) => {
      try {
        const walletAddress = await decrypt(
          base64ToArrayBuffer(entry.encryptedWalletAddress),
          base64ToArrayBuffer(entry.walletAddressIv),
          currentKey!
        );
        
        let login: string | undefined;
        if (entry.encryptedLogin && entry.loginIv) {
          login = await decrypt(
            base64ToArrayBuffer(entry.encryptedLogin),
            base64ToArrayBuffer(entry.loginIv),
            currentKey!
          );
        }
        
        let privateKey: string | undefined;
        if (entry.encryptedPrivateKey && entry.privateKeyIv) {
          privateKey = await decrypt(
            base64ToArrayBuffer(entry.encryptedPrivateKey),
            base64ToArrayBuffer(entry.privateKeyIv),
            currentKey!
          );
        }
        
        let seedPhrase: string | undefined;
        if (entry.encryptedSeedPhrase && entry.seedPhraseIv) {
          seedPhrase = await decrypt(
            base64ToArrayBuffer(entry.encryptedSeedPhrase),
            base64ToArrayBuffer(entry.seedPhraseIv),
            currentKey!
          );
        }
        
        let recoveryWords: string[] | undefined;
        if (entry.encryptedRecoveryWords && entry.recoveryWordsIv) {
          const recoveryWordsJson = await decrypt(
            base64ToArrayBuffer(entry.encryptedRecoveryWords),
            base64ToArrayBuffer(entry.recoveryWordsIv),
            currentKey!
          );
          try {
            recoveryWords = JSON.parse(recoveryWordsJson);
          } catch {
            recoveryWords = undefined;
          }
        }
        
        let notes: string | undefined;
        if (entry.encryptedNotes && entry.notesIv) {
          notes = await decrypt(
            base64ToArrayBuffer(entry.encryptedNotes),
            base64ToArrayBuffer(entry.notesIv),
            currentKey!
          );
        }
        
        return {
          id: entry.id,
          name: entry.name,
          login,
          walletAddress,
          privateKey,
          seedPhrase,
          recoveryWords,
          notes,
          createdAt: entry.createdAt,
          updatedAt: entry.updatedAt,
        };
      } catch {
        return null;
      }
    })
  );
  
  return decrypted.filter((entry): entry is NonNullable<typeof entry> => entry !== null);
}

export async function saveCryptoKey(data: CryptoKeyData): Promise<void> {
  if (!currentKey) throw new Error('Vault is locked');
  updateActivity();
  
  const { iv: walletIv, ciphertext: walletCiphertext } = await encrypt(data.walletAddress, currentKey);
  
  const entry: CryptoKeyEntry = {
    id: data.id || crypto.randomUUID(),
    name: data.name,
    encryptedWalletAddress: arrayBufferToBase64(walletCiphertext),
    walletAddressIv: arrayBufferToBase64(walletIv),
    createdAt: data.createdAt || Date.now(),
    updatedAt: Date.now(),
  };
  
  if (data.login) {
    const { iv, ciphertext } = await encrypt(data.login, currentKey);
    entry.encryptedLogin = arrayBufferToBase64(ciphertext);
    entry.loginIv = arrayBufferToBase64(iv);
  }
  
  if (data.privateKey) {
    const { iv, ciphertext } = await encrypt(data.privateKey, currentKey);
    entry.encryptedPrivateKey = arrayBufferToBase64(ciphertext);
    entry.privateKeyIv = arrayBufferToBase64(iv);
  }
  
  if (data.seedPhrase) {
    const { iv, ciphertext } = await encrypt(data.seedPhrase, currentKey);
    entry.encryptedSeedPhrase = arrayBufferToBase64(ciphertext);
    entry.seedPhraseIv = arrayBufferToBase64(iv);
  }
  
  if (data.recoveryWords && data.recoveryWords.length > 0) {
    const recoveryWordsJson = JSON.stringify(data.recoveryWords);
    const { iv, ciphertext } = await encrypt(recoveryWordsJson, currentKey);
    entry.encryptedRecoveryWords = arrayBufferToBase64(ciphertext);
    entry.recoveryWordsIv = arrayBufferToBase64(iv);
  }
  
  if (data.notes) {
    const { iv, ciphertext } = await encrypt(data.notes, currentKey);
    entry.encryptedNotes = arrayBufferToBase64(ciphertext);
    entry.notesIv = arrayBufferToBase64(iv);
  }
  
  if (data.id) {
    const existing = (await getAllCryptoKeys()).find(k => k.id === data.id);
    if (existing) {
      entry.createdAt = existing.createdAt;
    }
    await updateCryptoKey(entry);
  } else {
    await addCryptoKey(entry);
  }
}

export async function removeCryptoKey(id: string): Promise<void> {
  if (!currentKey) throw new Error('Vault is locked');
  updateActivity();
  await deleteCryptoKey(id);
}

