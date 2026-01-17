import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Lock, KeyRound, AlertTriangle, Timer } from 'lucide-react';
import { PinInput } from './PinInput';
import { RecoveryWordsModal } from './RecoveryWordsModal';
import { RecoveryWordsInput } from './RecoveryWordsInput';
import { WipeCountdown } from './WipeCountdown';
import { Button } from '@/components/ui/button';
import { useVault } from '@/contexts/VaultContext';
import { 
  recordFailedPinAttempt, 
  recordSuccessfulPinAttempt, 
  getRemainingPinAttempts,
  isPinLocked,
  wasPinLockedOnExit,
  clearPinAttempts,
  getTimeUntilNextAttempt
} from '@/lib/pinAttempts';
import { destroyVault } from '@/lib/vault';
import { isWeakPin } from '@/lib/security';

export function LockScreen() {
  const { state, setup, unlock, completeRecoverySetup, pendingRecoveryWords } = useVault();
  const [error, setError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirmPin, setConfirmPin] = useState<string | null>(null);
  const [remainingAttempts, setRemainingAttempts] = useState(5);
  const [showRecoveryOption, setShowRecoveryOption] = useState(false);
  const [showRecoveryInput, setShowRecoveryInput] = useState(false);
  const [showWipeCountdown, setShowWipeCountdown] = useState(false);
  const [waitTimeMs, setWaitTimeMs] = useState(0);
  const [isRateLimited, setIsRateLimited] = useState(false);

  const isSetup = state === 'setup';
  const isShowRecovery = state === 'show-recovery';

  // Check rate limiting countdown
  const checkRateLimiting = useCallback(async () => {
    const timeUntil = await getTimeUntilNextAttempt();
    if (timeUntil > 0) {
      setWaitTimeMs(timeUntil);
      setIsRateLimited(true);
    } else {
      setWaitTimeMs(0);
      setIsRateLimited(false);
    }
  }, []);

  // Rate limiting countdown timer
  useEffect(() => {
    if (waitTimeMs > 0) {
      const timer = setInterval(() => {
        setWaitTimeMs(prev => {
          const newTime = prev - 1000;
          if (newTime <= 0) {
            setIsRateLimited(false);
            return 0;
          }
          return newTime;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [waitTimeMs]);

  // Verificar estado ao carregar
  useEffect(() => {
    const checkLockState = async () => {
      if (state === 'locked') {
        // Check rate limiting first
        await checkRateLimiting();
        
        // Verificar se estava bloqueado antes de fechar o app
        const wasLocked = await wasPinLockedOnExit();
        const isLocked = await isPinLocked();
        if (wasLocked || isLocked) {
          setShowWipeCountdown(true);
        } else {
          const remaining = await getRemainingPinAttempts();
          setRemainingAttempts(remaining);
          // Mostrar opção de recuperação se já passou de 3 tentativas
          const attempts = 5 - remaining;
          if (attempts >= 3) {
            setShowRecoveryOption(true);
          }
        }
      } else if (state === 'unlocked' || state === 'setup') {
        // Limpar tentativas após sucesso
        await clearPinAttempts();
        setShowRecoveryOption(false);
      }
    };
    checkLockState();
  }, [state, checkRateLimiting]);

  const handleWipe = async () => {
    try {
      await destroyVault();
      await clearPinAttempts();
      
      // Garantia extra: solicita a remoção completa do IndexedDB
      await new Promise<void>((resolve) => {
        try {
          const req = indexedDB.deleteDatabase('password-vault');
          req.onsuccess = () => resolve();
          req.onerror = () => resolve();
          req.onblocked = () => resolve();
        } catch {
          resolve();
        }
      });
      
      window.location.reload();
    } catch {
      window.location.reload();
    }
  };

  const handlePinComplete = async (pin: string) => {
    setError(false);
    setErrorMessage(null);
    
    // Check rate limiting before allowing attempt
    if (!isSetup) {
      const timeUntil = await getTimeUntilNextAttempt();
      if (timeUntil > 0) {
        setWaitTimeMs(timeUntil);
        setIsRateLimited(true);
        return;
      }
    }
    
    if (isSetup) {
      // Validate PIN strength during setup
      if (isWeakPin(pin)) {
        setError(true);
        setErrorMessage('PIN muito fraco. Evite sequências ou números repetidos.');
        return;
      }
      
      if (!confirmPin) {
        setConfirmPin(pin);
        return;
      }
      
      if (pin !== confirmPin) {
        setError(true);
        setErrorMessage('Os PINs não coincidem. Tente novamente.');
        setConfirmPin(null);
        return;
      }
      
      setLoading(true);
      const result = await setup(pin);
      setLoading(false);
      
      if (!result.success) {
        setError(true);
        setErrorMessage('Erro ao configurar o cofre.');
        setConfirmPin(null);
      }
    } else {
      setLoading(true);
      const success = await unlock(pin);
      setLoading(false);
      
      if (success) {
        // Sucesso! Limpar tentativas
        await recordSuccessfulPinAttempt();
      } else {
        // Falha - registrar tentativa
        const result = await recordFailedPinAttempt();
        setRemainingAttempts(result.attemptsRemaining);
        setError(true);
        setErrorMessage(`PIN incorreto. ${result.attemptsRemaining} tentativa(s) restante(s).`);
        
        // Set rate limiting wait time
        if (result.waitTimeMs > 0) {
          setWaitTimeMs(result.waitTimeMs);
          setIsRateLimited(true);
        }
        
        if (result.shouldWipe) {
          setShowWipeCountdown(true);
        } else if (result.showRecoveryOption) {
          setShowRecoveryOption(true);
        }
      }
    }
  };

  const handleRecoveryVerified = async () => {
    setShowRecoveryInput(false);
    // Limpar tentativas de PIN após recuperação bem-sucedida
    await clearPinAttempts();
    setRemainingAttempts(5);
    setConfirmPin(null);
    setShowRecoveryOption(false);
  };

  // Tela de countdown para wipe (não pode ser fechada)
  if (showWipeCountdown) {
    return <WipeCountdown onComplete={handleWipe} />;
  }

  // Show recovery words modal after initial setup
  if (isShowRecovery && pendingRecoveryWords) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4 safe-area-inset">
        <RecoveryWordsModal
          open={true}
          words={pendingRecoveryWords}
          onConfirm={completeRecoverySetup}
        />
      </div>
    );
  }

  // Show recovery words input modal
  if (showRecoveryInput) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4 safe-area-inset">
        <RecoveryWordsInput
          open={true}
          onVerified={handleRecoveryVerified}
          onCancel={() => setShowRecoveryInput(false)}
          onWiped={() => window.location.reload()}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 safe-area-inset">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-sm px-2"
      >
        <div className="text-center mb-8 sm:mb-10">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.1 }}
            className="inline-flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-muted mb-6"
          >
            {isSetup ? (
              <KeyRound className="w-9 h-9 sm:w-11 sm:h-11 text-foreground" />
            ) : (
              <Lock className="w-9 h-9 sm:w-11 sm:h-11 text-foreground" />
            )}
          </motion.div>
          
          <h1 className="text-2xl sm:text-3xl font-semibold text-foreground mb-2 tracking-tight">
            {isSetup 
              ? (confirmPin ? 'Confirme seu PIN' : 'Crie seu PIN') 
              : 'Bem-vindo de volta'}
          </h1>
          <p className="text-muted-foreground text-base sm:text-lg text-balance">
            {isSetup 
              ? (confirmPin 
                  ? 'Digite o PIN novamente para confirmar' 
                  : 'Este PIN protegerá suas senhas')
              : 'Digite seu PIN para acessar o cofre'}
          </p>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={confirmPin ? 'confirm' : 'initial'}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.2 }}
          >
            <PinInput
              onComplete={handlePinComplete}
              error={error}
              disabled={loading || isRateLimited}
            />
            
            {/* Rate limiting countdown */}
            {isRateLimited && waitTimeMs > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 flex items-center justify-center gap-2 text-amber-600 dark:text-amber-500 text-sm sm:text-base p-3 bg-amber-500/10 rounded-xl"
              >
                <Timer className="w-4 h-4" />
                <span>Aguarde {Math.ceil(waitTimeMs / 1000)}s para tentar novamente</span>
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>

        <AnimatePresence>
          {error && errorMessage && (
            <motion.p
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-destructive text-sm sm:text-base text-center mt-5"
            >
              {errorMessage}
            </motion.p>
          )}
        </AnimatePresence>

        {/* Mostrar tentativas restantes mesmo sem erro (ao recarregar) */}
        {!error && !isSetup && remainingAttempts < 5 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-5 flex items-center justify-center gap-2 text-amber-600 dark:text-amber-500 text-sm sm:text-base"
          >
            <AlertTriangle className="w-4 h-4" />
            <span>{remainingAttempts} tentativa(s) restante(s)</span>
          </motion.div>
        )}

        {showRecoveryOption && !isSetup && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6"
          >
            <Button
              variant="outline"
              onClick={() => setShowRecoveryInput(true)}
              className="w-full gap-2 h-12 text-base"
            >
              <KeyRound className="w-5 h-5" />
              Usar palavras de recuperação
            </Button>
          </motion.div>
        )}

        <div className="mt-10 sm:mt-12 flex items-center justify-center gap-2 text-muted-foreground text-sm sm:text-base">
          <Shield className="w-4 h-4 sm:w-5 sm:h-5" />
          <span className="tracking-tight">Criptografia AES-256</span>
        </div>
      </motion.div>
    </div>
  );
}