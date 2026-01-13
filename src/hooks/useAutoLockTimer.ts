import { useState, useEffect, useCallback, useRef } from 'react';

const SESSION_TIMEOUT = 2 * 60 * 1000; // 2 minutes in ms

export function useAutoLockTimer(isUnlocked: boolean) {
  const [remainingTime, setRemainingTime] = useState(SESSION_TIMEOUT);
  const lastActivityRef = useRef(Date.now());
  const isWindowActiveRef = useRef(true);

  const resetTimer = useCallback(() => {
    lastActivityRef.current = Date.now();
  }, []);

  // Detecta se a janela está ativa
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        isWindowActiveRef.current = true;
        // Reseta o timer quando a janela volta a ficar ativa
        resetTimer();
      } else {
        isWindowActiveRef.current = false;
      }
    };

    const handleFocus = () => {
      isWindowActiveRef.current = true;
      resetTimer();
    };

    const handleBlur = () => {
      isWindowActiveRef.current = false;
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
    };
  }, [resetTimer]);

  // Detecta atividade do usuário
  useEffect(() => {
    if (!isUnlocked) {
      setRemainingTime(SESSION_TIMEOUT);
      return;
    }

    const events = ['mousedown', 'keydown', 'touchstart', 'scroll', 'mousemove', 'click'];
    
    const handleActivity = () => {
      if (isWindowActiveRef.current) {
        resetTimer();
      }
    };

    events.forEach(event => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, [isUnlocked, resetTimer]);

  // Atualiza o tempo restante apenas se a janela estiver inativa
  useEffect(() => {
    if (!isUnlocked) return;

    const interval = setInterval(() => {
      // Só conta o tempo se a janela não estiver ativa
      if (!isWindowActiveRef.current) {
        const elapsed = Date.now() - lastActivityRef.current;
        const remaining = Math.max(0, SESSION_TIMEOUT - elapsed);
        setRemainingTime(remaining);
      } else {
        // Janela ativa = reseta o timer
        lastActivityRef.current = Date.now();
        setRemainingTime(SESSION_TIMEOUT);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isUnlocked]);

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
