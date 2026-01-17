/**
 * Secure logging utility that suppresses logs in production
 * Use this instead of console.log/error throughout the app
 */

const isDev = import.meta.env.DEV;

export const logger = {
  /**
   * Logs info messages (only in development)
   */
  info: (...args: unknown[]): void => {
    if (isDev) {
      console.log('[INFO]', ...args);
    }
  },

  /**
   * Logs warning messages (only in development)
   */
  warn: (...args: unknown[]): void => {
    if (isDev) {
      console.warn('[WARN]', ...args);
    }
  },

  /**
   * Logs error messages (only in development)
   */
  error: (...args: unknown[]): void => {
    if (isDev) {
      console.error('[ERROR]', ...args);
    }
  },

  /**
   * Logs debug messages (only in development)
   */
  debug: (...args: unknown[]): void => {
    if (isDev) {
      console.log('[DEBUG]', ...args);
    }
  },

  /**
   * Security warning - always shows (for devtools protection)
   * This is intentional to warn users about social engineering
   */
  securityWarning: (): void => {
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
  },
};

export default logger;
