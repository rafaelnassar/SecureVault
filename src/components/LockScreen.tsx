import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Lock, KeyRound, AlertTriangle } from 'lucide-react';
import { PinInput } from './PinInput';
import { RecoveryWordsModal } from './RecoveryWordsModal';
import { RecoveryWordsInput } from './RecoveryWordsInput';
import { Button } from '@/components/ui/button';
import { useVault } from '@/contexts/VaultContext';
import { getRecoveryWords, setupVault } from '@/lib/vault';
import { validateRecoveryWords } from '@/lib/recoveryWords';

const MAX_ATTEMPTS_BEFORE_RECOVERY = 3;
const MAX_ATTEMPTS_BEFORE_DESTROY = 5;

export function LockScreen() {
  const { state, setup, unlock, completeRecoverySetup, pendingRecoveryWords, destroy } = useVault();
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [confirmPin, setConfirmPin] = useState<string | null>(null);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [showRecoveryOption, setShowRecoveryOption] = useState(false);
  const [showRecoveryInput, setShowRecoveryInput] = useState(false);
  const [showDestroyWarning, setShowDestroyWarning] = useState(false);
  const [destroying, setDestroying] = useState(false);

  const isSetup = state === 'setup';
  const isShowRecovery = state === 'show-recovery';

  // Reset failed attempts when vault state changes
  useEffect(() => {
    if (state === 'unlocked' || state === 'setup') {
      setFailedAttempts(0);
      setShowRecoveryOption(false);
      setShowDestroyWarning(false);
    }
  }, [state]);

  const handlePinComplete = async (pin: string) => {
    setError(false);
    
    if (isSetup) {
      if (!confirmPin) {
        setConfirmPin(pin);
        return;
      }
      
      if (pin !== confirmPin) {
        setError(true);
        setConfirmPin(null);
        return;
      }
      
      setLoading(true);
      const result = await setup(pin);
      setLoading(false);
      
      if (!result.success) {
        setError(true);
        setConfirmPin(null);
      }
    } else {
      setLoading(true);
      const success = await unlock(pin);
      setLoading(false);
      
      if (!success) {
        const newAttempts = failedAttempts + 1;
        setFailedAttempts(newAttempts);
        setError(true);
        
        if (newAttempts >= MAX_ATTEMPTS_BEFORE_DESTROY) {
          setShowDestroyWarning(true);
        } else if (newAttempts >= MAX_ATTEMPTS_BEFORE_RECOVERY) {
          setShowRecoveryOption(true);
        }
      }
    }
  };

  const handleRecoveryVerified = async () => {
    setShowRecoveryInput(false);
    // After recovery verification, go to PIN change
    // The vault is now "unlocked" via recovery - redirect to change PIN
    setConfirmPin(null);
    setFailedAttempts(0);
    setShowRecoveryOption(false);
  };

  const handleDestroy = async () => {
    setDestroying(true);
    await destroy();

    // Garantia extra: solicita a remoção completa do IndexedDB do cofre.
    // Mesmo que o navegador marque como "blocked", o reload fecha as conexões e finaliza a limpeza.
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

    setDestroying(false);
    window.location.reload();
  };

  // Show recovery words modal after initial setup
  if (isShowRecovery && pendingRecoveryWords) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
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
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <RecoveryWordsInput
          open={true}
          onVerified={handleRecoveryVerified}
          onCancel={() => setShowRecoveryInput(false)}
        />
      </div>
    );
  }

  // Show destroy warning
  if (showDestroyWarning) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-destructive/10 mb-6"
          >
            <AlertTriangle className="w-10 h-10 text-destructive" />
          </motion.div>
          
          <h1 className="text-2xl font-semibold text-foreground mb-2">
            Limite de tentativas
          </h1>
          <p className="text-muted-foreground text-sm mb-6">
            Você excedeu o número máximo de tentativas. Por segurança, todos os dados serão apagados.
          </p>
          
          <div className="flex flex-col gap-3">
            <Button
              variant="destructive"
              onClick={handleDestroy}
              disabled={destroying}
              className="w-full"
            >
              {destroying ? 'Apagando dados...' : 'Entendi, apagar tudo'}
            </Button>
            
            <Button
              variant="outline"
              onClick={() => setShowRecoveryInput(true)}
              className="w-full"
            >
              Usar palavras de recuperação
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-xs"
      >
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.1 }}
            className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-muted mb-6"
          >
            {isSetup ? (
              <KeyRound className="w-9 h-9 text-foreground" />
            ) : (
              <Lock className="w-9 h-9 text-foreground" />
            )}
          </motion.div>
          
          <h1 className="text-2xl font-semibold text-foreground mb-2 tracking-tight">
            {isSetup 
              ? (confirmPin ? 'Confirme seu PIN' : 'Crie seu PIN') 
              : 'Bem-vindo de volta'}
          </h1>
          <p className="text-muted-foreground text-base">
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
              disabled={loading}
            />
          </motion.div>
        </AnimatePresence>

        <AnimatePresence>
          {error && (
            <motion.p
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-destructive text-sm text-center mt-4"
            >
              {isSetup && confirmPin 
                ? 'Os PINs não coincidem. Tente novamente.' 
                : `PIN incorreto. ${MAX_ATTEMPTS_BEFORE_DESTROY - failedAttempts} tentativa(s) restante(s).`}
            </motion.p>
          )}
        </AnimatePresence>

        {showRecoveryOption && !isSetup && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6"
          >
            <Button
              variant="outline"
              onClick={() => setShowRecoveryInput(true)}
              className="w-full gap-2"
            >
              <KeyRound className="w-4 h-4" />
              Usar palavras de recuperação
            </Button>
          </motion.div>
        )}

        <div className="mt-10 flex items-center justify-center gap-2 text-muted-foreground text-sm">
          <Shield className="w-4 h-4" />
          <span className="tracking-tight">Criptografia AES-256</span>
        </div>
      </motion.div>
    </div>
  );
}
