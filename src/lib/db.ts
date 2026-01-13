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
}

let dbInstance: IDBPDatabase<VaultDB> | null = null;

export async function getDB(): Promise<IDBPDatabase<VaultDB>> {
  if (dbInstance) return dbInstance;
  
  dbInstance = await openDB<VaultDB>('password-vault', 2, {
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
      
      // Crypto keys store (new in v2)
      if (oldVersion < 2) {
        if (!db.objectStoreNames.contains('cryptoKeys')) {
          const cryptoStore = db.createObjectStore('cryptoKeys', { keyPath: 'id' });
          cryptoStore.createIndex('by-network', 'network');
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
}
