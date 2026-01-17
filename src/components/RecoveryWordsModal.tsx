import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, Copy, Check, ShieldAlert, Key } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Modal } from './Modal';
import { showToast } from '@/components/ui/sonner';

interface RecoveryWordsModalProps {
  open: boolean;
  words: string[];
  onConfirm: () => void;
}

export function RecoveryWordsModal({ open, words, onConfirm }: RecoveryWordsModalProps) {
  const [copied, setCopied] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(words.join(' '));
      setCopied(true);
      showToast.copied('Palavras de recuperação');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback silencioso
    }
  };

  const handleDownload = () => {
    const content = `═══════════════════════════════════════
       PALAVRAS DE RECUPERAÇÃO DO COFRE
═══════════════════════════════════════

🔐 Guarde estas palavras em um local seguro.
   Elas são a única forma de recuperar o acesso
   caso você esqueça seu PIN.

📝 Suas palavras de recuperação:

   ${words.map((word, i) => `${i + 1}. ${word}`).join('\n   ')}

⚠️  IMPORTANTE:
   • Nunca compartilhe estas palavras
   • Guarde em local seguro e offline
   • Estas palavras não podem ser recuperadas

═══════════════════════════════════════
         Gerado em: ${new Date().toLocaleString('pt-BR')}
═══════════════════════════════════════`;

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `recuperacao-cofre-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setDownloaded(true);
    showToast.success('Arquivo baixado');
  };

  const handleConfirm = () => {
    setConfirmed(true);
    setTimeout(() => {
      onConfirm();
    }, 500);
  };

  const canConfirm = copied || downloaded;

  return (
    <Modal open={open} onClose={() => {}} showCloseButton={false} maxWidth="sm">
      <AnimatePresence mode="wait">
        {confirmed ? (
          <motion.div
            key="confirmed"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-6 sm:py-8"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4 sm:mb-5"
            >
              <Check className="w-8 h-8 sm:w-10 sm:h-10 text-success" />
            </motion.div>
            <p className="text-base sm:text-lg font-medium text-foreground">Cofre configurado!</p>
          </motion.div>
        ) : (
          <motion.div
            key="words"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4 sm:space-y-5"
          >
            <div className="text-center">
              <motion.div
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto mb-4 sm:mb-5"
              >
                <Key className="w-7 h-7 sm:w-8 sm:h-8 text-amber-500" />
              </motion.div>
              <h2 className="text-lg sm:text-xl font-semibold text-foreground mb-2">
                Palavras de recuperação
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                Guarde estas palavras em um local seguro. Elas são a única forma de recuperar o acesso.
              </p>
            </div>

            <div className="bg-muted/40 rounded-xl p-3 sm:p-4 border border-border">
              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                {words.map((word, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center gap-2 bg-background rounded-lg px-3 py-2.5 border border-border min-h-[44px] overflow-hidden"
                  >
                    <span className="text-xs font-medium text-muted-foreground shrink-0 w-5 text-right tabular-nums">
                      {index + 1}.
                    </span>
                    <span className="font-mono text-sm font-medium text-foreground truncate">
                      {word}
                    </span>
                  </motion.div>
                ))}
              </div>
            </div>

            <div className="flex items-start gap-3 text-sm text-muted-foreground bg-destructive/5 rounded-xl p-3 sm:p-4 border border-destructive/20">
              <ShieldAlert className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
              <p className="text-xs sm:text-sm leading-relaxed">
                <strong className="text-destructive">Importante:</strong> Estas palavras são exibidas apenas uma vez. Faça o download ou copie agora.
              </p>
            </div>

            <div className="flex gap-2 sm:gap-3">
              <motion.div whileTap={{ scale: 0.98 }} className="flex-1">
                <Button
                  variant="outline"
                  onClick={handleDownload}
                  className="w-full h-11 sm:h-12 gap-2 text-sm sm:text-base"
                  disabled={downloaded}
                >
                  {downloaded ? (
                    <>
                      <Check className="w-4 h-4 sm:w-5 sm:h-5 text-success" />
                      <span className="hidden xs:inline">Baixado</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 sm:w-5 sm:h-5" />
                      <span className="hidden xs:inline">Baixar</span> TXT
                    </>
                  )}
                </Button>
              </motion.div>
              <motion.div whileTap={{ scale: 0.98 }} className="flex-1">
                <Button
                  variant="outline"
                  onClick={handleCopy}
                  className="w-full h-11 sm:h-12 gap-2 text-sm sm:text-base"
                  disabled={copied}
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 sm:w-5 sm:h-5 text-success" />
                      Copiado
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 sm:w-5 sm:h-5" />
                      Copiar
                    </>
                  )}
                </Button>
              </motion.div>
            </div>

            <Button
              onClick={handleConfirm}
              className="w-full h-11 sm:h-12 text-sm sm:text-base"
              disabled={!canConfirm}
            >
              {canConfirm ? 'Continuar para o cofre' : 'Copie ou baixe as palavras primeiro'}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </Modal>
  );
}