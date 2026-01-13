import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Key, ArrowLeft, Check, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from './Modal';
import { validateRecoveryWords } from '@/lib/recoveryWords';
import { getRecoveryWords } from '@/lib/vault';

interface RecoveryWordsInputProps {
  open: boolean;
  onVerified: () => void;
  onCancel: () => void;
  title?: string;
  description?: string;
}

export function RecoveryWordsInput({ 
  open, 
  onVerified, 
  onCancel,
  title = 'Recuperar acesso',
  description = 'Digite suas 4 palavras de recuperação'
}: RecoveryWordsInputProps) {
  const [words, setWords] = useState(['', '', '', '']);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verified, setVerified] = useState(false);

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
        setVerified(true);
        setTimeout(() => {
          setVerified(false);
          setWords(['', '', '', '']);
          onVerified();
        }, 800);
      } else {
        setError(true);
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setWords(['', '', '', '']);
    setError(false);
    setVerified(false);
    onCancel();
  };

  const allWordsFilled = words.every(w => w.length > 0);

  return (
    <Modal open={open} onClose={handleClose} showCloseButton={false}>
      <div className="text-center">
        <AnimatePresence mode="wait">
          {verified ? (
            <motion.div
              key="verified"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              className="py-8"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.1, type: 'spring', stiffness: 300 }}
                className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4"
              >
                <ShieldCheck className="w-8 h-8 text-success" />
              </motion.div>
              <p className="text-foreground font-medium">Palavras verificadas!</p>
            </motion.div>
          ) : (
            <motion.div
              key="input"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                <Key className="w-7 h-7 text-foreground" />
              </div>
              
              <h3 className="font-semibold text-foreground mb-1">{title}</h3>
              <p className="text-sm text-muted-foreground mb-4">{description}</p>
              
              <div className="grid grid-cols-2 gap-3">
                {words.map((word, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground">
                        {index + 1}.
                      </span>
                      <Input
                        value={word}
                        onChange={(e) => handleWordChange(index, e.target.value)}
                        placeholder="palavra"
                        className="pl-7 font-mono text-sm"
                        disabled={loading}
                      />
                    </div>
                  </motion.div>
                ))}
              </div>
              
              <AnimatePresence>
                {error && (
                  <motion.p
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="text-destructive text-sm"
                  >
                    Palavras incorretas. Tente novamente.
                  </motion.p>
                )}
              </AnimatePresence>

              <div className="flex gap-3 pt-2">
                <Button 
                  variant="ghost" 
                  onClick={handleClose} 
                  className="flex-1 gap-2"
                  disabled={loading}
                >
                  <ArrowLeft className="w-4 h-4" />
                  Voltar
                </Button>
                <Button
                  onClick={handleVerify}
                  className="flex-1 gap-2"
                  disabled={!allWordsFilled || loading}
                >
                  <Check className="w-4 h-4" />
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
