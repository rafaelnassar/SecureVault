import { motion } from 'framer-motion';
import { FileJson, Calendar, Hash, Lock, AlertCircle } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from '@/components/ui/button';

export interface BackupPreview {
  version: number;
  exportedAt: number;
  passwordCount: number;
  cryptoKeyCount?: number;
  hasDifferentVault: boolean;
  isEncrypted?: boolean;
  isValid: boolean;
  errorMessage?: string;
}

interface BackupPreviewModalProps {
  open: boolean;
  preview: BackupPreview | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export function BackupPreviewModal({ open, preview, onConfirm, onCancel }: BackupPreviewModalProps) {
  if (!preview) return null;

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const totalItems = preview.passwordCount + (preview.cryptoKeyCount || 0);
  const itemsLabel = preview.cryptoKeyCount && preview.cryptoKeyCount > 0 
    ? `${preview.passwordCount} senhas, ${preview.cryptoKeyCount} carteiras`
    : `${preview.passwordCount} ${preview.passwordCount === 1 ? 'senha' : 'senhas'}`;

  const infoItems = [
    { icon: Hash, label: 'Versão do backup', value: `v${preview.version}` },
    { icon: Calendar, label: 'Data de exportação', value: formatDate(preview.exportedAt) },
    { icon: Lock, label: 'Itens no backup', value: itemsLabel },
  ];

  return (
    <Modal open={open} onClose={onCancel} maxWidth="sm">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        <div className="flex flex-col items-center text-center">
          <motion.div
            className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-4"
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
          >
            <FileJson className="w-7 h-7 text-foreground" />
          </motion.div>
          <h3 className="text-lg font-semibold text-foreground mb-1">
            Prévia do Backup
          </h3>
          <p className="text-sm text-muted-foreground">
            Verifique os detalhes antes de importar
          </p>
        </div>

        {!preview.isValid ? (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 p-4 rounded-xl bg-destructive/10 text-destructive"
          >
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm">{preview.errorMessage || 'Arquivo de backup inválido'}</p>
          </motion.div>
        ) : (
          <div className="space-y-3">
            {infoItems.map((item, index) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center gap-3 p-3 rounded-xl bg-muted/50"
              >
                <div className="w-9 h-9 rounded-lg bg-background flex items-center justify-center">
                  <item.icon className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                  <p className="text-sm font-medium text-foreground truncate">{item.value}</p>
                </div>
              </motion.div>
            ))}

            {preview.hasDifferentVault && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="flex items-center gap-3 p-3 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400"
              >
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <p className="text-xs">
                  Este backup foi criado em outro cofre. Será necessário informar o PIN do backup.
                </p>
              </motion.div>
            )}
          </div>
        )}

        <div className="flex gap-3">
          <Button variant="outline" onClick={onCancel} className="flex-1">
            Cancelar
          </Button>
          <Button 
            onClick={onConfirm} 
            className="flex-1"
            disabled={!preview.isValid || (preview.passwordCount === 0 && (preview.cryptoKeyCount || 0) === 0)}
          >
            {preview.isValid ? 'Importar' : 'Fechar'}
          </Button>
        </div>
      </motion.div>
    </Modal>
  );
}
