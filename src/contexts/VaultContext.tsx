import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { isVaultSetup, isVaultLocked, setupVault, unlockVault, lockVault, updateActivity, isRecoverySetupComplete, markRecoverySetupComplete, destroyVault } from '@/lib/vault';

type VaultState = 'loading' | 'setup' | 'locked' | 'unlocked' | 'show-recovery';

interface SetupResult {
  success: boolean;
  recoveryWords?: string[];
}

interface VaultContextType {
  state: VaultState;
  setup: (pin: string) => Promise<SetupResult>;
  unlock: (pin: string) => Promise<boolean>;
  lock: () => void;
  refreshState: () => void;
  completeRecoverySetup: () => void;
  pendingRecoveryWords: string[] | null;
  destroy: () => Promise<void>;
}

const VaultContext = createContext<VaultContextType | null>(null);

export function VaultProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<VaultState>('loading');
  const [pendingRecoveryWords, setPendingRecoveryWords] = useState<string[] | null>(null);

  const checkState = useCallback(async () => {
    const setup = await isVaultSetup();
    if (!setup) {
      setState('setup');
      return;
    }
    
    if (isVaultLocked()) {
      setState('locked');
    } else {
      // Check if recovery setup is complete
      const recoveryComplete = await isRecoverySetupComplete();
      if (!recoveryComplete && pendingRecoveryWords) {
        setState('show-recovery');
      } else {
        setState('unlocked');
      }
    }
  }, [pendingRecoveryWords]);

  useEffect(() => {
    checkState();
  }, [checkState]);

  // Activity tracking
  useEffect(() => {
    if (state !== 'unlocked') return;

    const handleActivity = () => {
      updateActivity();
    };

    const events = ['mousedown', 'keydown', 'touchstart', 'scroll'];
    events.forEach(event => {
      window.addEventListener(event, handleActivity);
    });

    const checkLock = setInterval(() => {
      if (isVaultLocked()) {
        setState('locked');
      }
    }, 5000);

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
      clearInterval(checkLock);
    };
  }, [state]);

  const handleSetup = async (pin: string): Promise<SetupResult> => {
    const result = await setupVault(pin);
    if (result.success) {
      if (result.recoveryWords) {
        setPendingRecoveryWords(result.recoveryWords);
        setState('show-recovery');
      } else {
        setState('unlocked');
      }
    }
    return result;
  };

  const handleUnlock = async (pin: string): Promise<boolean> => {
    const success = await unlockVault(pin);
    if (success) {
      setState('unlocked');
    }
    return success;
  };

  const handleLock = () => {
    lockVault();
    setState('locked');
  };

  const completeRecoverySetup = async () => {
    await markRecoverySetupComplete();
    setPendingRecoveryWords(null);
    setState('unlocked');
  };

  const handleDestroy = async () => {
    await destroyVault();
    setPendingRecoveryWords(null);
    setState('setup');
  };

  return (
    <VaultContext.Provider
      value={{
        state,
        setup: handleSetup,
        unlock: handleUnlock,
        lock: handleLock,
        refreshState: checkState,
        completeRecoverySetup,
        pendingRecoveryWords,
        destroy: handleDestroy,
      }}
    >
      {children}
    </VaultContext.Provider>
  );
}

export function useVault() {
  const context = useContext(VaultContext);
  if (!context) {
    throw new Error('useVault must be used within a VaultProvider');
  }
  return context;
}
