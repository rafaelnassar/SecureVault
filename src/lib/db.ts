import { openDB, DBSchema, IDBPDatabase } from 'idb';

export interface PasswordEntry {
  id: string;
  site: string;
  login?: string;
  encryptedPassword: string;
  iv: string;
  isSensitive?: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface CryptoKeyEntry {
  id: string;
  name: string;
  network?: string; // deprecated, kept for backwards compatibility
  encryptedLogin?: string;
  loginIv?: string;
  encryptedWalletAddress: string;
  walletAddressIv: string;
  encryptedPrivateKey?: string;
  privateKeyIv?: string;
  encryptedSeedPhrase?: string;
  seedPhraseIv?: string;
  encryptedRecoveryWords?: string;
  recoveryWordsIv?: string;
  encryptedNotes?: string;
  notesIv?: string;
  createdAt: number;
  updatedAt: number;
}

export interface VaultConfig {
  salt: string;
  verificationData: string;
  verificationIv: string;
  recoveryWords?: string[];
  recoverySetupComplete?: boolean;
  // Encrypted recovery words (new secure storage)
  encryptedRecoveryWords?: string;
  recoveryWordsIv?: string;
  recoveryWordsHash?: string; // SHA-256 hash for verification
  // Session timeout in minutes (1, 2, 5, 10)
  sessionTimeoutMinutes?: number;
}

// Dados de tentativas de segurança (armazenados criptografados)
export interface SecurityAttemptData {
  key: string; // 'pin_attempts' ou 'recovery_attempts'
  attempts: number;
  lastAttemptAt: number;
  isLocked: boolean;
  lockedAt?: number;
  nextAllowedAttempt?: number; // Para rate limiting exponencial
  // Hash de integridade para detectar manipulação
  integrityHash: string;
}

interface VaultDB extends DBSchema {
  passwords: {
    key: string;
    value: PasswordEntry;
    indexes: { 'by-site': string };
  };
  cryptoKeys: {
    key: string;
    value: CryptoKeyEntry;
    indexes: { 'by-network': string };
  };
  config: {
    key: string;
    value: VaultConfig;
  };
  securityAttempts: {
    key: string;
    value: SecurityAttemptData;
  };
}

let dbInstance: IDBPDatabase<VaultDB> | null = null;

export async function getDB(): Promise<IDBPDatabase<VaultDB>> {
  if (dbInstance) return dbInstance;
  
  dbInstance = await openDB<VaultDB>('password-vault', 3, {
    upgrade(db, oldVersion) {
      // Passwords store (existing)
      if (!db.objectStoreNames.contains('passwords')) {
        const passwordStore = db.createObjectStore('passwords', { keyPath: 'id' });
        passwordStore.createIndex('by-site', 'site');
      }
      
      // Config store (existing)
      if (!db.objectStoreNames.contains('config')) {
        db.createObjectStore('config', { keyPath: 'key' });
      }
      
      // Crypto keys store (v2)
      if (oldVersion < 2) {
        if (!db.objectStoreNames.contains('cryptoKeys')) {
          const cryptoStore = db.createObjectStore('cryptoKeys', { keyPath: 'id' });
          cryptoStore.createIndex('by-network', 'network');
        }
      }
      
      // Security attempts store (v3 - rate limiting seguro)
      if (oldVersion < 3) {
        if (!db.objectStoreNames.contains('securityAttempts')) {
          db.createObjectStore('securityAttempts', { keyPath: 'key' });
        }
      }
    },
  });
  
  return dbInstance;
}

export async function getConfig(): Promise<VaultConfig | undefined> {
  const db = await getDB();
  const config = await db.get('config', 'vault');
  return config;
}

export async function setConfig(config: VaultConfig): Promise<void> {
  const db = await getDB();
  await db.put('config', { ...config, key: 'vault' } as VaultConfig & { key: string });
}

export async function getAllPasswords(): Promise<PasswordEntry[]> {
  const db = await getDB();
  return db.getAll('passwords');
}

export async function addPassword(entry: PasswordEntry): Promise<void> {
  const db = await getDB();
  await db.add('passwords', entry);
}

export async function updatePassword(entry: PasswordEntry): Promise<void> {
  const db = await getDB();
  await db.put('passwords', entry);
}

export async function deletePassword(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('passwords', id);
}

// Crypto Keys functions
export async function getAllCryptoKeys(): Promise<CryptoKeyEntry[]> {
  const db = await getDB();
  return db.getAll('cryptoKeys');
}

export async function addCryptoKey(entry: CryptoKeyEntry): Promise<void> {
  const db = await getDB();
  await db.add('cryptoKeys', entry);
}

export async function updateCryptoKey(entry: CryptoKeyEntry): Promise<void> {
  const db = await getDB();
  await db.put('cryptoKeys', entry);
}

export async function deleteCryptoKey(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('cryptoKeys', id);
}

export async function clearAllData(): Promise<void> {
  const db = await getDB();
  await db.clear('passwords');
  await db.clear('cryptoKeys');
  await db.clear('config');
  await db.clear('securityAttempts');
}

// Security Attempts functions
export async function getSecurityAttempts(key: string): Promise<SecurityAttemptData | undefined> {
  const db = await getDB();
  return db.get('securityAttempts', key);
}

export async function setSecurityAttempts(data: SecurityAttemptData): Promise<void> {
  const db = await getDB();
  await db.put('securityAttempts', data);
}

export async function clearSecurityAttempts(key: string): Promise<void> {
  const db = await getDB();
  await db.delete('securityAttempts', key);
}
