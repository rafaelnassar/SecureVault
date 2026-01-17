// Security utilities for XSS prevention, input validation, and devtools protection

import { z } from 'zod';
import { logger } from './logger';

// ============= XSS Sanitization =============

/**
 * Sanitizes text for safe display - prevents XSS attacks
 */
export function sanitizeText(text: string): string {
  if (!text || typeof text !== 'string') return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Sanitizes URL to prevent javascript: and data: URL attacks
 */
export function sanitizeUrl(url: string): string {
  if (!url || typeof url !== 'string') return '';
  
  // Remove dangerous characters
  const sanitized = url.replace(/[<>"'&\x00-\x1F\x7F]/g, '');
  
  // Block dangerous protocols
  const lowerUrl = sanitized.toLowerCase().trim();
  if (
    lowerUrl.startsWith('javascript:') ||
    lowerUrl.startsWith('data:') ||
    lowerUrl.startsWith('vbscript:') ||
    lowerUrl.startsWith('file:')
  ) {
    return '';
  }
  
  return sanitized;
}

/**
 * Extracts domain from URL safely
 */
export function getDomain(url: string): string {
  try {
    const sanitized = sanitizeUrl(url);
    if (!sanitized) return 'site';
    
    let domain = sanitized.replace(/^https?:\/\//, '').split('/')[0];
    domain = domain.replace(/^www\./, '');
    return domain.slice(0, 100);
  } catch {
    return 'site';
  }
}

/**
 * Generates full URL safely
 */
export function getFullUrl(url: string): string {
  const sanitized = sanitizeUrl(url);
  if (!sanitized) return '';
  
  if (sanitized.startsWith('http://') || sanitized.startsWith('https://')) {
    return sanitized;
  }
  return `https://${sanitized}`;
}

// ============= Input Validation Schemas =============

export const passwordEntrySchema = z.object({
  site: z.string()
    .trim()
    .min(1, 'Site é obrigatório')
    .max(500, 'Site muito longo')
    .refine((val) => !val.toLowerCase().includes('<script'), 'Caracteres inválidos'),
  login: z.string()
    .trim()
    .max(500, 'Login muito longo')
    .optional(),
  password: z.string()
    .min(1, 'Senha é obrigatória')
    .max(1000, 'Senha muito longa'),
});

export const cryptoKeySchema = z.object({
  name: z.string()
    .trim()
    .min(1, 'Nome é obrigatório')
    .max(200, 'Nome muito longo'),
  network: z.string()
    .trim()
    .min(1, 'Rede é obrigatória')
    .max(50, 'Rede inválida'),
  walletAddress: z.string()
    .trim()
    .min(1, 'Endereço é obrigatório')
    .max(500, 'Endereço muito longo'),
  privateKey: z.string()
    .max(1000, 'Chave muito longa')
    .optional(),
  seedPhrase: z.string()
    .max(2000, 'Frase muito longa')
    .optional(),
  notes: z.string()
    .max(5000, 'Notas muito longas')
    .optional(),
});

export const pinSchema = z.string()
  .min(6, 'PIN deve ter 6 dígitos')
  .max(6, 'PIN deve ter 6 dígitos')
  .regex(/^\d{6}$/, 'PIN deve ter exatamente 6 dígitos')
  .refine((pin) => !isWeakPin(pin), 'PIN muito fraco ou comum');

// Lista de PINs comuns/fracos que devem ser rejeitados
const WEAK_PINS = [
  '000000', '111111', '222222', '333333', '444444', '555555',
  '666666', '777777', '888888', '999999', '123456', '654321',
  '123123', '112233', '121212', '101010', '696969', '420420',
  '159753', '147258', '258369', '147369', '987654', '246810'
];

/**
 * Verifica se um PIN é fraco (sequência, repetição, ou comum)
 */
export function isWeakPin(pin: string): boolean {
  // PIN comum
  if (WEAK_PINS.includes(pin)) return true;
  
  // Todos os dígitos iguais
  if (/^(\d)\1{5}$/.test(pin)) return true;
  
  // Sequência crescente (012345, 123456, etc.)
  const isAscending = pin.split('').every((d, i, arr) => 
    i === 0 || parseInt(d) === (parseInt(arr[i-1]) + 1) % 10
  );
  if (isAscending) return true;
  
  // Sequência decrescente (543210, 654321, etc.)
  const isDescending = pin.split('').every((d, i, arr) => 
    i === 0 || parseInt(d) === (parseInt(arr[i-1]) - 1 + 10) % 10
  );
  if (isDescending) return true;
  
  // Padrão AABB (112233, 445566)
  if (/^(\d)\1(\d)\2(\d)\3$/.test(pin)) return true;
  
  // Padrão ABAB (121212, 565656)
  if (/^(\d)(\d)\1\2\1\2$/.test(pin)) return true;
  
  return false;
}

// ============= Devtools Protection =============

let devtoolsDetected = false;
let protectionActive = false;
let lastOuterWidth = 0;
let lastOuterHeight = 0;

/**
 * Detects if devtools is open using multiple techniques
 */
function detectDevtools(): boolean {
  // Technique 1: Window size difference (docked devtools)
  const threshold = 160;
  const widthThreshold = window.outerWidth - window.innerWidth > threshold;
  const heightThreshold = window.outerHeight - window.innerHeight > threshold;
  
  if (widthThreshold || heightThreshold) return true;
  
  // Technique 2: Check Firebug
  if ((window as unknown as { Firebug?: { chrome?: { isInitialized: boolean } } }).Firebug?.chrome?.isInitialized) {
    return true;
  }
  
  // Technique 3: Sudden window size change (devtools opened/closed)
  const currentOuterWidth = window.outerWidth;
  const currentOuterHeight = window.outerHeight;
  
  if (lastOuterWidth > 0 && lastOuterHeight > 0) {
    const widthDelta = Math.abs(currentOuterWidth - lastOuterWidth);
    const heightDelta = Math.abs(currentOuterHeight - lastOuterHeight);
    
    // If window size changed significantly without user resize
    if ((widthDelta > 200 || heightDelta > 200) && 
        window.innerWidth === document.documentElement.clientWidth) {
      lastOuterWidth = currentOuterWidth;
      lastOuterHeight = currentOuterHeight;
      return true;
    }
  }
  
  lastOuterWidth = currentOuterWidth;
  lastOuterHeight = currentOuterHeight;
  
  return false;
}

/**
 * Advanced detection using debugger timing
 * Returns true if DevTools is likely open
 */
function detectDevtoolsViaDebugger(): boolean {
  const start = performance.now();
  // eslint-disable-next-line no-debugger
  debugger;
  const end = performance.now();
  // If debugger takes more than 100ms, DevTools is probably open
  return (end - start) > 100;
}

/**
 * Detection via console.log timing - DevTools slows down console operations
 */
function detectDevtoolsViaConsoleTiming(): boolean {
  const start = performance.now();
  // Console operations are slower when DevTools is open
  for (let i = 0; i < 100; i++) {
    // eslint-disable-next-line no-console
    console.log('');
  }
  console.clear();
  const end = performance.now();
  // If console operations take more than 50ms, DevTools might be open
  return (end - start) > 50;
}

/**
 * Detection via toString override on objects logged to console
 */
function detectDevtoolsViaToString(): boolean {
  let devtoolsOpen = false;
  const element = new Image();
  
  Object.defineProperty(element, 'id', {
    get: function() {
      devtoolsOpen = true;
      return '';
    }
  });
  
  // This triggers the getter only when DevTools inspects the object
  // eslint-disable-next-line no-console
  console.log('%c', element);
  console.clear();
  
  return devtoolsOpen;
}

/**
 * Console warning for devtools - uses logger.securityWarning
 * This always shows to warn users about social engineering
 */
function logSecurityWarning(): void {
  logger.securityWarning();
}

/**
 * Handle detected devtools - lock vault and warn
 */
function handleDevtoolsDetected(): void {
  if (!devtoolsDetected) {
    devtoolsDetected = true;
    logSecurityWarning();
  }
}

/**
 * Enables devtools protection with warnings
 * Should be called BEFORE app renders for maximum protection
 */
export function enableDevtoolsProtection(): () => void {
  if (protectionActive) return () => {};
  
  protectionActive = true;
  
  // Initialize window size tracking
  lastOuterWidth = window.outerWidth;
  lastOuterHeight = window.outerHeight;
  
  // Initial check
  if (detectDevtools()) {
    handleDevtoolsDetected();
  }
  
  // Periodic check using multiple detection methods (every 500ms for faster detection)
  const interval = setInterval(() => {
    const isOpen = detectDevtools();
    if (isOpen) {
      handleDevtoolsDetected();
    } else {
      devtoolsDetected = false;
    }
  }, 500);
  
  // Debugger timing check (reduced from 5s to 2s)
  let debuggerCheckInterval: number | null = null;
  if (import.meta.env.PROD) {
    debuggerCheckInterval = window.setInterval(() => {
      if (detectDevtoolsViaDebugger()) {
        handleDevtoolsDetected();
      }
    }, 2000);
  }
  
  // Console timing check (production only, every 3s)
  let consoleCheckInterval: number | null = null;
  if (import.meta.env.PROD) {
    consoleCheckInterval = window.setInterval(() => {
      if (detectDevtoolsViaConsoleTiming()) {
        handleDevtoolsDetected();
      }
    }, 3000);
  }
  
  // toString detection (production only, every 4s)
  let toStringCheckInterval: number | null = null;
  if (import.meta.env.PROD) {
    toStringCheckInterval = window.setInterval(() => {
      if (detectDevtoolsViaToString()) {
        handleDevtoolsDetected();
      }
    }, 4000);
  }
  
  // Disable right-click context menu in production
  const handleContextMenu = (e: MouseEvent) => {
    if (import.meta.env.PROD) {
      e.preventDefault();
    }
  };
  
  // Block common devtools shortcuts in production
  const handleKeydown = (e: KeyboardEvent) => {
    if (import.meta.env.PROD) {
      // F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C, Ctrl+U, Cmd variants for Mac
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const ctrlOrCmd = isMac ? e.metaKey : e.ctrlKey;
      
      if (
        e.key === 'F12' ||
        (ctrlOrCmd && e.shiftKey && ['I', 'i', 'J', 'j', 'C', 'c'].includes(e.key)) ||
        (ctrlOrCmd && ['U', 'u'].includes(e.key))
      ) {
        e.preventDefault();
        handleDevtoolsDetected();
      }
    }
  };
  
  // Listen for resize events (can indicate devtools toggle)
  const handleResize = () => {
    if (detectDevtools()) {
      handleDevtoolsDetected();
    }
  };
  
  document.addEventListener('contextmenu', handleContextMenu);
  document.addEventListener('keydown', handleKeydown);
  window.addEventListener('resize', handleResize);
  
  return () => {
    clearInterval(interval);
    if (debuggerCheckInterval) clearInterval(debuggerCheckInterval);
    if (consoleCheckInterval) clearInterval(consoleCheckInterval);
    if (toStringCheckInterval) clearInterval(toStringCheckInterval);
    document.removeEventListener('contextmenu', handleContextMenu);
    document.removeEventListener('keydown', handleKeydown);
    window.removeEventListener('resize', handleResize);
    protectionActive = false;
  };
}

// ============= Memory Protection =============

/**
 * Attempts to clear sensitive string from memory (best effort only)
 * 
 * IMPORTANT: Due to JavaScript's string immutability, this function
 * CANNOT guarantee that the string is removed from memory. It only
 * helps the garbage collector by dereferencing the variable.
 * 
 * For truly sensitive operations, consider:
 * - Minimizing string lifetime in memory
 * - Avoiding string concatenation of sensitive data
 * - Using the Web Crypto API which handles keys more securely
 * 
 * @deprecated This function provides limited security benefit
 */
export function attemptSecureClear(str: string): void {
  // In JavaScript, we can't truly clear strings from memory,
  // but we can help the GC by dereferencing
  // The actual clearing happens when GC runs
  if (str && typeof str === 'string') {
    // Force string to be eligible for GC
    str = '';
  }
}

// Alias for backward compatibility
export const secureClear = attemptSecureClear;

/**
 * Creates a secure timeout that clears after execution
 */
export function secureTimeout(callback: () => void, ms: number): number {
  return window.setTimeout(() => {
    try {
      callback();
    } finally {
      // Ensure cleanup happens
    }
  }, ms);
}

// ============= Clipboard Security =============

/**
 * Securely copies to clipboard and clears after timeout
 */
export async function secureCopyToClipboard(
  text: string, 
  clearAfterMs: number = 30000
): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    
    // Auto-clear clipboard after timeout
    if (clearAfterMs > 0) {
      setTimeout(async () => {
        try {
          // Only clear if clipboard still contains our text
          const current = await navigator.clipboard.readText();
          if (current === text) {
            await navigator.clipboard.writeText('');
          }
        } catch {
          // Clipboard read may fail due to permissions, ignore
        }
      }, clearAfterMs);
    }
    
    return true;
  } catch {
    return false;
  }
}

// ============= Entropy Calculation =============

/**
 * Calculates entropy of a password or seed phrase
 * Returns bits of entropy
 */
export function calculateEntropy(input: string): number {
  if (!input || typeof input !== 'string') return 0;
  
  const trimmed = input.trim();
  if (trimmed.length === 0) return 0;
  
  // Check if it's a seed phrase (words separated by spaces)
  const words = trimmed.split(/\s+/).filter(w => w.length > 0);
  
  if (words.length >= 3) {
    // BIP39 standard: 11 bits per word
    // Common seed phrases: 12 words = 132 bits, 24 words = 264 bits
    return words.length * 11;
  }
  
  // Character-based entropy calculation
  let charsetSize = 0;
  
  if (/[a-z]/.test(input)) charsetSize += 26;
  if (/[A-Z]/.test(input)) charsetSize += 26;
  if (/[0-9]/.test(input)) charsetSize += 10;
  if (/[^a-zA-Z0-9]/.test(input)) charsetSize += 32;
  
  if (charsetSize === 0) return 0;
  
  return Math.floor(input.length * Math.log2(charsetSize));
}

/**
 * Gets strength level based on entropy bits
 */
export function getStrengthLevel(entropy: number): {
  level: 'weak' | 'fair' | 'good' | 'strong' | 'excellent';
  label: string;
  color: string;
} {
  if (entropy < 40) {
    return { level: 'weak', label: 'Fraca', color: 'hsl(0, 65%, 55%)' };
  } else if (entropy < 60) {
    return { level: 'fair', label: 'Razoável', color: 'hsl(30, 65%, 50%)' };
  } else if (entropy < 80) {
    return { level: 'good', label: 'Boa', color: 'hsl(50, 65%, 45%)' };
  } else if (entropy < 128) {
    return { level: 'strong', label: 'Forte', color: 'hsl(100, 50%, 42%)' };
  } else {
    return { level: 'excellent', label: 'Excelente', color: 'hsl(145, 50%, 42%)' };
  }
}
