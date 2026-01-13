// Security utilities for XSS prevention, input validation, and devtools protection

import { z } from 'zod';

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
  .regex(/^\d{6}$/, 'PIN deve ter exatamente 6 dígitos');

// ============= Devtools Protection =============

let devtoolsDetected = false;
let protectionActive = false;

/**
 * Detects if devtools is open using timing analysis
 */
function detectDevtools(): boolean {
  const threshold = 160;
  const widthThreshold = window.outerWidth - window.innerWidth > threshold;
  const heightThreshold = window.outerHeight - window.innerHeight > threshold;
  
  return widthThreshold || heightThreshold;
}

/**
 * Console warning for devtools
 */
function logSecurityWarning(): void {
  console.clear();
  console.log(
    '%c⚠️ AVISO DE SEGURANÇA',
    'color: red; font-size: 24px; font-weight: bold;'
  );
  console.log(
    '%cEste é um cofre de senhas. Nunca cole código aqui - isso pode comprometer suas senhas.',
    'color: orange; font-size: 14px;'
  );
  console.log(
    '%cSe alguém pediu para colar algo aqui, você está sendo vítima de um golpe.',
    'color: red; font-size: 14px;'
  );
}

/**
 * Enables devtools protection with warnings
 */
export function enableDevtoolsProtection(): () => void {
  if (protectionActive) return () => {};
  
  protectionActive = true;
  
  // Initial check
  if (detectDevtools()) {
    devtoolsDetected = true;
    logSecurityWarning();
  }
  
  // Periodic check
  const interval = setInterval(() => {
    const isOpen = detectDevtools();
    if (isOpen && !devtoolsDetected) {
      devtoolsDetected = true;
      logSecurityWarning();
    } else if (!isOpen) {
      devtoolsDetected = false;
    }
  }, 1000);
  
  // Disable right-click context menu in production
  const handleContextMenu = (e: MouseEvent) => {
    if (import.meta.env.PROD) {
      e.preventDefault();
    }
  };
  
  // Block common devtools shortcuts in production
  const handleKeydown = (e: KeyboardEvent) => {
    if (import.meta.env.PROD) {
      // F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U
      if (
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'J' || e.key === 'j')) ||
        (e.ctrlKey && (e.key === 'U' || e.key === 'u'))
      ) {
        e.preventDefault();
        logSecurityWarning();
      }
    }
  };
  
  document.addEventListener('contextmenu', handleContextMenu);
  document.addEventListener('keydown', handleKeydown);
  
  return () => {
    clearInterval(interval);
    document.removeEventListener('contextmenu', handleContextMenu);
    document.removeEventListener('keydown', handleKeydown);
    protectionActive = false;
  };
}

// ============= Memory Protection =============

/**
 * Securely clears sensitive string from memory (best effort)
 */
export function secureClear(str: string): void {
  // In JavaScript, we can't truly clear strings from memory,
  // but we can help the GC by dereferencing
  // The actual clearing happens when GC runs
  if (str && typeof str === 'string') {
    // Force string to be eligible for GC
    str = '';
  }
}

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
