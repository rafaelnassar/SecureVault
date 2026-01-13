import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Copy, Check, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Modal } from './Modal';
import { secureCopyToClipboard } from '@/lib/security';

interface ShareConfirmProps {
  open: boolean;
  site: string;
  login?: string;
  password: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ShareConfirm({ open, site, login, password, onConfirm, onCancel }: ShareConfirmProps) {
  const [copied, setCopied] = useState(false);

  const handleConfirm = async () => {
    // Discord spoiler format using ||text|| to hide sensitive data
    const discordText = `🔐 **Dados de Acesso**\n\n📍 Site: ||${site}||\n${login ? `👤 Usuário: ||${login}||\n` : ''}🔑 Senha: ||${password}||`;
    // Clipboard seguro com auto-limpeza após 2 minutos (compartilhamento)
    await secureCopyToClipboard(discordText, 120000);
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
      onConfirm();
    }, 1200);
  };

  const handleCancel = () => {
    setCopied(false);
    onCancel();
  };

  return (
    <Modal open={open} onClose={handleCancel} showCloseButton={false}>
      <AnimatePresence mode="wait">
        {copied ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="py-4 text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 400, damping: 15 }}
              className="w-14 h-14 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4"
            >
              <Check className="w-7 h-7 text-success" />
            </motion.div>
            <p className="font-medium text-foreground">Copiado para a área de transferência!</p>
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
              className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4"
            >
              <AlertTriangle className="w-7 h-7 text-destructive" />
            </motion.div>
            
            <h2 className="text-lg font-semibold text-foreground mb-2">
              Compartilhar dados sensíveis
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              Você está prestes a copiar suas credenciais. Certifique-se de compartilhar apenas com pessoas de confiança.
            </p>
            
            <div className="bg-muted/50 rounded-xl p-4 mb-6 font-mono text-sm text-left border border-border">
              <p className="text-muted-foreground">Site: <span className="text-foreground">{site}</span></p>
              {login && <p className="text-muted-foreground">Usuário: <span className="text-foreground">{login}</span></p>}
              <p className="text-muted-foreground">Senha: <span className="text-foreground">••••••••</span></p>
            </div>
            
            <div className="flex gap-3">
              <motion.div whileTap={{ scale: 0.98 }} className="flex-1">
                <Button variant="outline" onClick={handleCancel} className="w-full">
                  Cancelar
                </Button>
              </motion.div>
              <motion.div whileTap={{ scale: 0.98 }} className="flex-1">
                <Button onClick={handleConfirm} className="w-full gap-2">
                  <Copy className="w-4 h-4" />
                  Copiar
                </Button>
              </motion.div>
            </div>
            
            <div className="flex items-center justify-center gap-2 mt-4 text-xs text-muted-foreground">
              <Shield className="w-3.5 h-3.5" />
              <span>Dados criptografados</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Modal>
  );
}
