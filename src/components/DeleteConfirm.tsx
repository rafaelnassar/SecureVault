import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Modal } from './Modal';

interface DeleteConfirmProps {
  open: boolean;
  siteName: string;
  onConfirm: () => void;
  onCancel: () => void;
  itemType?: 'password' | 'crypto';
}

export function DeleteConfirm({ open, siteName, onConfirm, onCancel, itemType = 'password' }: DeleteConfirmProps) {
  const [deleted, setDeleted] = useState(false);

  const handleConfirm = () => {
    setDeleted(true);
    setTimeout(() => {
      setDeleted(false);
      onConfirm();
    }, 600);
  };

  const handleCancel = () => {
    setDeleted(false);
    onCancel();
  };

  const labels = {
    password: {
      title: 'Excluir senha?',
      message: 'A senha de',
      successMessage: 'Senha excluída!'
    },
    crypto: {
      title: 'Excluir carteira?',
      message: 'A carteira',
      successMessage: 'Carteira excluída!'
    }
  };

  const label = labels[itemType];

  return (
    <Modal open={open} onClose={handleCancel} showCloseButton={false}>
      <AnimatePresence mode="wait">
        {deleted ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="py-6 text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 400, damping: 15 }}
              className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4"
            >
              <Check className="w-8 h-8 text-success" />
            </motion.div>
            <p className="text-base font-medium text-foreground">{label.successMessage}</p>
          </motion.div>
        ) : (
          <motion.div
            key="confirm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center"
          >
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-5"
            >
              <AlertTriangle className="w-8 h-8 text-destructive" />
            </motion.div>
            
            <h2 className="text-xl font-semibold mb-2">
              {label.title}
            </h2>
            <p className="text-muted-foreground text-base mb-6">
              {label.message} <span className="font-medium text-foreground">{siteName}</span> será excluída permanentemente.
            </p>
            
            <div className="flex gap-3">
              <motion.div whileTap={{ scale: 0.98 }} className="flex-1">
                <Button variant="outline" onClick={handleCancel} className="w-full h-11">
                  Cancelar
                </Button>
              </motion.div>
              <motion.div whileTap={{ scale: 0.98 }} className="flex-1">
                <Button variant="destructive" onClick={handleConfirm} className="w-full h-11">
                  Excluir
                </Button>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Modal>
  );
}