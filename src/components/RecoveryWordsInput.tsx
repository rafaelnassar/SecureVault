import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Key, ArrowLeft, Check, ShieldCheck, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from './Modal';
import { WipeCountdown } from './WipeCountdown';
import { cn } from '@/lib/utils';
import { validateRecoveryWords } from '@/lib/recoveryWords';
import { getRecoveryWords, destroyVault } from '@/lib/vault';
import { 
  recordFailedAttempt, 
  recordSuccessfulAttempt, 
  getRemainingAttempts,
  isRecoveryLocked,
  wasLockedOnExit,
  clearRecoveryAttempts
} from '@/lib/recoveryAttempts';

interface RecoveryWordsInputProps {
  open: boolean;
  onVerified: () => void;
  onCancel: () => void;
  onWiped?: () => void;
  title?: string;
  description?: string;
}

export function RecoveryWordsInput({ 
  open, 
  onVerified, 
  onCancel,
  onWiped,
  title = 'Recuperar acesso',
  description = 'Digite suas 6 palavras de recuperação'
}: RecoveryWordsInputProps) {
  const [words, setWords] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verified, setVerified] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [showWipeCountdown, setShowWipeCountdown] = useState(false);
  const [remainingAttempts, setRemainingAttempts] = useState(2);

  // Verificar estado ao abrir o modal
  useEffect(() => {
    const checkState = async () => {
      if (open) {
        // Verificar se estava bloqueado antes de fechar o app
        const wasLocked = await wasLockedOnExit();
        const isLocked = await isRecoveryLocked();
        if (wasLocked || isLocked) {
          // Iniciar wipe imediatamente
          setShowWipeCountdown(true);
        } else {
          const remaining = await getRemainingAttempts();
          setRemainingAttempts(remaining);
          // Se já teve uma tentativa anterior, mostrar aviso
          if (remaining === 1) {
            setShowWarning(true);
          }
        }
      } else {
        // Reset visual state on close (mas não limpa as tentativas!)
        setWords(['', '', '', '', '', '']);
        setError(false);
        setShowWarning(false);
        setVerified(false);
      }
    };
    checkState();
  }, [open]);

  const handleWipe = async () => {
    try {
      await destroyVault();
      await clearRecoveryAttempts();
      
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
    if (onWiped) onWiped();
  };

  const handleWordChange = (index: number, value: string) => {
    const newWords = [...words];
    newWords[index] = value.toLowerCase().trim();
    setWords(newWords);
    setError(false);
  };

  const handleVerify = async () => {
    setError(false);
    setLoading(true);

    try {
      const storedWords = await getRecoveryWords();
      if (!storedWords) {
        setError(true);
        setLoading(false);
        return;
      }

      const isValid = validateRecoveryWords(words, storedWords);
      
      if (isValid) {
        // Sucesso! Limpa as tentativas
        await recordSuccessfulAttempt();
        setVerified(true);
        setTimeout(() => {
          setVerified(false);
          setWords(['', '', '', '', '', '']);
          onVerified();
        }, 800);
      } else {
        // Falha - registrar tentativa
        const result = await recordFailedAttempt();
        setRemainingAttempts(result.attemptsRemaining);
        
        if (result.shouldWipe) {
          // Atingiu limite - iniciar countdown de wipe
          setShowWipeCountdown(true);
        } else if (result.isWarning) {
          // Primeira falha - mostrar aviso
          setShowWarning(true);
          setError(true);
        } else {
          setError(true);
        }
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    // Não permitir fechar durante countdown de wipe
    if (showWipeCountdown) return;
    
    setWords(['', '', '', '', '', '']);
    setError(false);
    setVerified(false);
    setShowWarning(false);
    onCancel();
  };

  const allWordsFilled = words.every(w => w.length > 0);

  // Renderizar countdown via portal (independente do modal)
  if (showWipeCountdown) {
    return <WipeCountdown onComplete={handleWipe} />;
  }

  return (
    <Modal open={open} onClose={handleClose} showCloseButton={false} maxWidth="sm">
      <div className="text-center">
        <AnimatePresence mode="wait">
          {verified ? (
            <motion.div
              key="verified"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              className="py-6 sm:py-8"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.1, type: 'spring', stiffness: 300 }}
                className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4"
              >
                <ShieldCheck className="w-7 h-7 sm:w-8 sm:h-8 text-success" />
              </motion.div>
              <p className="text-foreground font-medium text-base sm:text-lg">Palavras verificadas!</p>
            </motion.div>
          ) : (
            <motion.div
              key="input"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4 sm:space-y-5"
            >
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                <Key className="w-6 h-6 sm:w-7 sm:h-7 text-foreground" />
              </div>
              
              <div>
                <h3 className="font-semibold text-foreground text-base sm:text-lg mb-1">{title}</h3>
                <p className="text-sm sm:text-base text-muted-foreground">{description}</p>
              </div>
              
              <div className={cn("grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3", error && "animate-shake")}>
                {words.map((word, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <div className="relative">
                      <span className="absolute left-3 sm:left-3.5 top-1/2 -translate-y-1/2 text-xs sm:text-sm font-medium text-muted-foreground">
                        {index + 1}.
                      </span>
                      <Input
                        value={word}
                        onChange={(e) => handleWordChange(index, e.target.value)}
                        placeholder="palavra"
                        className={cn(
                          "pl-7 sm:pl-8 font-mono text-sm sm:text-base h-11 sm:h-12",
                          error && "border-destructive"
                        )}
                        disabled={loading}
                      />
                    </div>
                  </motion.div>
                ))}
              </div>
              
              {/* Aviso de tentativas restantes */}
              <AnimatePresence>
                {showWarning && (
                  <motion.div
                    initial={{ opacity: 0, y: -5, height: 0 }}
                    animate={{ opacity: 1, y: 0, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex items-start gap-3 text-sm bg-destructive/10 text-destructive rounded-xl p-3 sm:p-4 border border-destructive/20"
                  >
                    <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <div className="text-left">
                      <p className="font-medium text-xs sm:text-sm">Atenção!</p>
                      <p className="text-xs sm:text-sm opacity-90">
                        Resta apenas 1 tentativa. Após isso, todos os dados serão apagados automaticamente.
                      </p>
                    </div>
                  </motion.div>
                )}
                
                {error && !showWarning && (
                  <motion.p
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="text-destructive text-sm sm:text-base"
                  >
                    Palavras incorretas.
                  </motion.p>
                )}
              </AnimatePresence>

              <div className="flex gap-2 sm:gap-3 pt-2">
                <Button 
                  variant="ghost" 
                  onClick={handleClose} 
                  className="flex-1 gap-2 h-11 sm:h-12 text-sm sm:text-base"
                  disabled={loading}
                >
                  <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                  Voltar
                </Button>
                <Button
                  onClick={handleVerify}
                  className="flex-1 gap-2 h-11 sm:h-12 text-sm sm:text-base"
                  disabled={!allWordsFilled || loading}
                >
                  <Check className="w-4 h-4 sm:w-5 sm:h-5" />
                  Verificar
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Modal>
  );
}