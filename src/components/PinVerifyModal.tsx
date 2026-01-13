import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, Lock } from 'lucide-react';
import { Modal } from './Modal';
import { PinInput } from './PinInput';
import { unlockVault } from '@/lib/vault';
import { Button } from '@/components/ui/button';

interface PinVerifyModalProps {
  open: boolean;
  onVerified: () => void;
  onCancel: () => void;
  title?: string;
  description?: string;
}

export function PinVerifyModal({ 
  open, 
  onVerified, 
  onCancel,
  title = 'Verificar identidade',
  description = 'Digite seu PIN para continuar'
}: PinVerifyModalProps) {
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verified, setVerified] = useState(false);

  const handlePinComplete = async (pin: string) => {
    setError(false);
    setLoading(true);
    
    const isValid = await unlockVault(pin);
    setLoading(false);
    
    if (isValid) {
      setVerified(true);
      setTimeout(() => {
        setVerified(false);
        onVerified();
      }, 800);
    } else {
      setError(true);
    }
  };

  const handleClose = () => {
    setError(false);
    setVerified(false);
    onCancel();
  };

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
              <p className="text-foreground font-medium">Verificado!</p>
            </motion.div>
          ) : (
            <motion.div
              key="input"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                <Lock className="w-7 h-7 text-foreground" />
              </div>
              
              <h3 className="font-semibold text-foreground mb-1">{title}</h3>
              <p className="text-sm text-muted-foreground mb-6">{description}</p>
              
              <PinInput onComplete={handlePinComplete} error={error} disabled={loading} />
              
              <AnimatePresence>
                {error && (
                  <motion.p
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="text-destructive text-sm mt-4"
                  >
                    PIN incorreto
                  </motion.p>
                )}
              </AnimatePresence>
              
              <Button 
                variant="ghost" 
                onClick={handleClose} 
                className="mt-6 text-muted-foreground hover:text-foreground"
              >
                Cancelar
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Modal>
  );
}
