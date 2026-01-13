import { motion } from 'framer-motion';
import { Share2, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Modal } from './Modal';

interface ShareWarningModalProps {
  open: boolean;
  site: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ShareWarningModal({ open, site, onConfirm, onCancel }: ShareWarningModalProps) {
  return (
    <Modal open={open} onClose={onCancel} showCloseButton={false}>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="text-center"
      >
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          className="w-14 h-14 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto mb-4"
        >
          <ShieldAlert className="w-7 h-7 text-amber-500" />
        </motion.div>
        
        <h2 className="text-lg font-semibold text-foreground mb-2">
          Compartilhar credenciais?
        </h2>
        <p className="text-sm text-muted-foreground mb-6">
          Você está prestes a compartilhar os dados de acesso de{' '}
          <span className="font-medium text-foreground">{site}</span>. 
          Certifique-se de que está enviando para a pessoa certa.
        </p>
        
        <div className="flex items-start gap-2 text-xs text-muted-foreground bg-destructive/5 rounded-lg p-3 border border-destructive/20 mb-6">
          <ShieldAlert className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
          <p className="text-left">
            <strong className="text-destructive">Aviso:</strong> Nunca compartilhe suas credenciais com pessoas desconhecidas ou em canais não seguros.
          </p>
        </div>
        
        <div className="flex gap-3">
          <motion.div whileTap={{ scale: 0.98 }} className="flex-1">
            <Button variant="outline" onClick={onCancel} className="w-full">
              Cancelar
            </Button>
          </motion.div>
          <motion.div whileTap={{ scale: 0.98 }} className="flex-1">
            <Button onClick={onConfirm} className="w-full gap-2">
              <Share2 className="w-4 h-4" />
              Continuar
            </Button>
          </motion.div>
        </div>
      </motion.div>
    </Modal>
  );
}
