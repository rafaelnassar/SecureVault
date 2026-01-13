import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface TotalWipeModalProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function TotalWipeModal({ open, onConfirm, onCancel }: TotalWipeModalProps) {
  const [step, setStep] = useState<'warning' | 'confirm' | 'countdown'>('warning');
  const [confirmText, setConfirmText] = useState('');
  const [countdown, setCountdown] = useState(5);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  const CONFIRM_PHRASE = 'APAGAR TUDO';

  useEffect(() => {
    if (!open) {
      setStep('warning');
      setConfirmText('');
      setCountdown(5);
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
      }
    }
  }, [open]);

  useEffect(() => {
    if (step === 'countdown') {
      countdownRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            if (countdownRef.current) {
              clearInterval(countdownRef.current);
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => {
        if (countdownRef.current) {
          clearInterval(countdownRef.current);
        }
      };
    }
  }, [step]);

  const handleFirstConfirm = () => {
    setStep('confirm');
  };

  const handleSecondConfirm = () => {
    if (confirmText === CONFIRM_PHRASE) {
      setStep('countdown');
    }
  };

  const handleFinalConfirm = () => {
    onConfirm();
  };

  return (
    <Modal open={open} onClose={onCancel} maxWidth="sm">
      <AnimatePresence mode="wait">
        {step === 'warning' && (
          <motion.div
            key="warning"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="space-y-6"
          >
            <div className="flex flex-col items-center text-center">
              <motion.div
                className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mb-4"
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
              >
                <AlertTriangle className="w-8 h-8 text-destructive" />
              </motion.div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Limpeza Total
              </h3>
              <p className="text-sm text-muted-foreground">
                Esta ação irá <strong className="text-destructive">apagar permanentemente</strong> todas as suas senhas, 
                configurações e palavras de recuperação. Esta ação é irreversível.
              </p>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={onCancel} className="flex-1">
                Cancelar
              </Button>
              <Button variant="destructive" onClick={handleFirstConfirm} className="flex-1">
                Continuar
              </Button>
            </div>
          </motion.div>
        )}

        {step === 'confirm' && (
          <motion.div
            key="confirm"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="text-center">
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Confirmar exclusão
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Digite <strong className="text-destructive font-mono">{CONFIRM_PHRASE}</strong> para confirmar
              </p>
              <Input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
                placeholder="Digite aqui..."
                className="text-center font-mono"
                autoFocus
              />
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep('warning')} className="flex-1">
                Voltar
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleSecondConfirm} 
                className="flex-1"
                disabled={confirmText !== CONFIRM_PHRASE}
              >
                Confirmar
              </Button>
            </div>
          </motion.div>
        )}

        {step === 'countdown' && (
          <motion.div
            key="countdown"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="space-y-6"
          >
            <div className="flex flex-col items-center text-center">
              <motion.div
                className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mb-4 relative"
              >
                <motion.div
                  className="absolute inset-0 rounded-full border-4 border-destructive"
                  initial={{ opacity: 0.3 }}
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ repeat: Infinity, duration: 1 }}
                />
                <span className="text-3xl font-bold text-destructive font-mono">
                  {countdown}
                </span>
              </motion.div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {countdown > 0 ? 'Aguarde...' : 'Pronto para apagar'}
              </h3>
              <p className="text-sm text-muted-foreground">
                {countdown > 0 
                  ? 'Você ainda pode cancelar esta operação' 
                  : 'Clique em "Apagar Tudo" para concluir'}
              </p>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={onCancel} className="flex-1">
                Cancelar
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleFinalConfirm} 
                className="flex-1 gap-2"
                disabled={countdown > 0}
              >
                <Trash2 className="w-4 h-4" />
                Apagar Tudo
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Modal>
  );
}
