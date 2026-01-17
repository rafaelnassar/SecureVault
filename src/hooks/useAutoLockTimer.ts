import { useState, useEffect, useCallback, useRef } from 'react';
import { getSessionTimeout } from '@/lib/vault';

const DEFAULT_TIMEOUT_MS = 2 * 60 * 1000;

export function useAutoLockTimer(isUnlocked: boolean) {
  const [sessionTimeoutMs, setSessionTimeoutMs] = useState(DEFAULT_TIMEOUT_MS);
  const [remainingTime, setRemainingTime] = useState(DEFAULT_TIMEOUT_MS);
  const lastActivityRef = useRef(Date.now());

  const resetTimer = useCallback(() => {
    lastActivityRef.current = Date.now();
  }, []);

  // Load timeout from persisted settings whenever we unlock
  useEffect(() => {
    let cancelled = false;

    if (!isUnlocked) {
      setRemainingTime(sessionTimeoutMs);
      return;
    }

    (async () => {
      try {
        const ms = await getSessionTimeout();
        if (cancelled) return;
        setSessionTimeoutMs(ms);
        setRemainingTime(ms);
        lastActivityRef.current = Date.now();
      } catch {
        // Keep default
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isUnlocked]);

  // React to changes coming from Settings (custom event dispatched by lib/vault)
  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ minutes?: number; ms?: number }>).detail;
      const ms = typeof detail?.ms === 'number'
        ? detail.ms
        : (typeof detail?.minutes === 'number' ? detail.minutes * 60 * 1000 : undefined);

      if (typeof ms === 'number' && Number.isFinite(ms) && ms > 0) {
        setSessionTimeoutMs(ms);
        setRemainingTime(ms);
        lastActivityRef.current = Date.now();
      }
    };

    window.addEventListener('vault:session-timeout-changed', handler);
    return () => window.removeEventListener('vault:session-timeout-changed', handler);
  }, []);

  // Detecta atividade do usuário
  useEffect(() => {
    if (!isUnlocked) return;

    const events = ['mousedown', 'keydown', 'touchstart', 'scroll', 'mousemove', 'click'];

    const handleActivity = () => {
      resetTimer();
    };

    events.forEach((event) => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, [isUnlocked, resetTimer]);

  // Atualiza o tempo restante com base em inatividade
  useEffect(() => {
    if (!isUnlocked) return;

    const interval = window.setInterval(() => {
      const elapsed = Date.now() - lastActivityRef.current;
      const remaining = Math.max(0, sessionTimeoutMs - elapsed);
      setRemainingTime(remaining);
    }, 1000);

    return () => window.clearInterval(interval);
  }, [isUnlocked, sessionTimeoutMs]);

  const formatTime = useCallback((ms: number) => {
    const totalSeconds = Math.ceil(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }, []);

  return {
    remainingTime,
    formattedTime: formatTime(remainingTime),
    isExpiringSoon: remainingTime <= 30000, // 30 seconds
    resetTimer,
  };
}
