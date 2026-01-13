import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Copy, MessageCircle, Hash, FileText, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Modal } from './Modal';
import { cn } from '@/lib/utils';
import { secureCopyToClipboard } from '@/lib/security';
import { showToast } from '@/components/ui/sonner';

interface ShareFormatSelectorProps {
  open: boolean;
  site: string;
  login?: string;
  password: string;
  onClose: () => void;
}

type ShareFormat = 'common' | 'discord' | 'whatsapp';

const formatOptions: { id: ShareFormat; label: string; icon: React.ElementType; description: string }[] = [
  { id: 'common', label: 'Texto comum', icon: FileText, description: 'Formatação simples e organizada' },
  { id: 'discord', label: 'Discord', icon: Hash, description: 'Com spoilers para ocultar dados' },
  { id: 'whatsapp', label: 'WhatsApp', icon: MessageCircle, description: 'Formatação estilizada' },
];

export function ShareFormatSelector({ open, site, login, password, onClose }: ShareFormatSelectorProps) {
  const [selectedFormat, setSelectedFormat] = useState<ShareFormat>('common');
  const [copied, setCopied] = useState(false);

  const generateText = (format: ShareFormat): string => {
    switch (format) {
      case 'common':
        return `🔐 Dados de Acesso

📍 Site: ${site}
${login ? `👤 Usuário: ${login}\n` : ''}🔑 Senha: ${password}

⚠️ Mantenha estas informações em segurança!`;

      case 'discord':
        return `🔐 **Dados de Acesso**

📍 Site: ||${site}||
${login ? `👤 Usuário: ||${login}||\n` : ''}🔑 Senha: ||${password}||

⚠️ *Clique nos spoilers para revelar*`;

      case 'whatsapp':
        return `🔐 *Dados de Acesso*

📍 *Site:* ${site}
${login ? `👤 *Usuário:* ${login}\n` : ''}🔑 *Senha:* \`${password}\`

⚠️ _Mantenha estas informações em segurança!_`;

      default:
        return '';
    }
  };

  const handleCopy = async () => {
    const text = generateText(selectedFormat);
    // Clipboard seguro com auto-limpeza após 2 minutos (compartilhamento)
    await secureCopyToClipboard(text, 120000);
    setCopied(true);
    showToast.copied('Dados de acesso');
    setTimeout(() => {
      setCopied(false);
      onClose();
    }, 1200);
  };

  const handleClose = () => {
    setCopied(false);
    setSelectedFormat('common');
    onClose();
  };

  return (
    <Modal open={open} onClose={handleClose} showCloseButton={false}>
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
            key="selector"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <h2 className="text-lg font-semibold text-foreground mb-2 text-center">
              Escolha o formato
            </h2>
            <p className="text-sm text-muted-foreground mb-5 text-center">
              Selecione como deseja compartilhar seus dados
            </p>

            <div className="space-y-2 mb-5">
              {formatOptions.map((option) => {
                const Icon = option.icon;
                const isSelected = selectedFormat === option.id;
                
                return (
                  <motion.button
                    key={option.id}
                    onClick={() => setSelectedFormat(option.id)}
                    className={cn(
                      "w-full flex items-center gap-3 p-3 rounded-xl border transition-all duration-200 text-left",
                      isSelected 
                        ? "border-primary bg-primary/5" 
                        : "border-border hover:border-muted-foreground/30 hover:bg-muted/30"
                    )}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center transition-colors",
                      isSelected ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                    )}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        "font-medium text-sm transition-colors",
                        isSelected ? "text-primary" : "text-foreground"
                      )}>
                        {option.label}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {option.description}
                      </p>
                    </div>
                    {isSelected && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="w-5 h-5 rounded-full bg-primary flex items-center justify-center"
                      >
                        <Check className="w-3 h-3 text-primary-foreground" />
                      </motion.div>
                    )}
                  </motion.button>
                );
              })}
            </div>

            {/* Preview */}
            <div className="bg-muted/50 rounded-xl p-3 mb-5 border border-border">
              <p className="text-xs text-muted-foreground mb-2 font-medium">Pré-visualização:</p>
              <pre className="text-xs text-foreground whitespace-pre-wrap font-mono leading-relaxed">
                {generateText(selectedFormat)}
              </pre>
            </div>

            <div className="flex gap-3">
              <motion.div whileTap={{ scale: 0.98 }} className="flex-1">
                <Button variant="outline" onClick={handleClose} className="w-full">
                  Cancelar
                </Button>
              </motion.div>
              <motion.div whileTap={{ scale: 0.98 }} className="flex-1">
                <Button onClick={handleCopy} className="w-full gap-2">
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
