import { Button } from '@/components/ui/button'
import { showToast } from '@/components/ui/sonner'
import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from '@tauri-apps/plugin-notification'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, Copy, Download, Key, ShieldAlert } from 'lucide-react'
import { useState } from 'react'
import { Modal } from './Modal'

interface RecoveryWordsModalProps {
  open: boolean
  words: string[]
  onConfirm: () => void
}

export function RecoveryWordsModal({ open, words, onConfirm }: RecoveryWordsModalProps) {
  const [copied, setCopied] = useState(false)
  const [downloaded, setDownloaded] = useState(false)
  const [confirmed, setConfirmed] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(words.join(' '))
      setCopied(true)
      showToast.copied('Palavras de recuperação')
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }

  const handleDownload = async () => {
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
═══════════════════════════════════════`

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `recuperacao-cofre-${new Date().toISOString().split('T')[0]}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    setDownloaded(true)
    showToast.success('Arquivo baixado')

    try {
      let permission = await isPermissionGranted()

      if (!permission) {
        permission = (await requestPermission()) === 'granted'
      }

      if (permission) {
        sendNotification({
          title: 'Backup Salvo com Sucesso! 🛡️',
          body: 'As palavras de recuperação foram salvas no seu computador.',
        })
      }
    } catch (error) {
      console.error('Erro ao enviar notificação:', error)
    }
  }

  const handleConfirm = () => {
    setConfirmed(true)
    setTimeout(() => {
      onConfirm()
    }, 500)
  }

  const canConfirm = copied || downloaded

  return (
    <Modal open={open} onClose={() => {}} showCloseButton={false}>
      <AnimatePresence mode="wait">
        {confirmed ? (
          <motion.div
            key="confirmed"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-4"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-5"
            >
              <Check className="w-10 h-10 text-success" />
            </motion.div>
            <p className="text-lg font-medium text-foreground">Cofre configurado!</p>
          </motion.div>
        ) : (
          <motion.div
            key="words"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-5"
          >
            <div className="text-center">
              <motion.div
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto mb-5"
              >
                <Key className="w-8 h-8 text-amber-500" />
              </motion.div>
              <h2 className="text-xl font-semibold text-foreground mb-2">
                Palavras de recuperação
              </h2>
              <p className="text-base text-muted-foreground">
                Guarde estas palavras em um local seguro. Elas são a única forma de recuperar o
                acesso.
              </p>
            </div>

            <div className="bg-muted/40 rounded-xl p-4 border border-border">
              <div className="grid grid-cols-2 gap-3">
                {words.map((word, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center gap-3 bg-background rounded-lg px-4 py-3 border border-border"
                  >
                    <span className="text-sm font-medium text-muted-foreground w-5">
                      {index + 1}.
                    </span>
                    <span className="font-mono text-base font-medium text-foreground">{word}</span>
                  </motion.div>
                ))}
              </div>
            </div>

            <div className="flex items-start gap-3 text-sm text-muted-foreground bg-destructive/5 rounded-xl p-4 border border-destructive/20">
              <ShieldAlert className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
              <p>
                <strong className="text-destructive">Importante:</strong> Estas palavras são
                exibidas apenas uma vez. Faça o download ou copie agora.
              </p>
            </div>

            <div className="flex gap-3">
              <motion.div whileTap={{ scale: 0.98 }} className="flex-1">
                <Button
                  variant="outline"
                  onClick={handleDownload}
                  className="w-full h-11 gap-2"
                  disabled={downloaded}
                >
                  {downloaded ? (
                    <>
                      <Check className="w-5 h-5 text-success" />
                      Baixado
                    </>
                  ) : (
                    <>
                      <Download className="w-5 h-5" />
                      Baixar TXT
                    </>
                  )}
                </Button>
              </motion.div>
              <motion.div whileTap={{ scale: 0.98 }} className="flex-1">
                <Button
                  variant="outline"
                  onClick={handleCopy}
                  className="w-full h-11 gap-2"
                  disabled={copied}
                >
                  {copied ? (
                    <>
                      <Check className="w-5 h-5 text-success" />
                      Copiado
                    </>
                  ) : (
                    <>
                      <Copy className="w-5 h-5" />
                      Copiar
                    </>
                  )}
                </Button>
              </motion.div>
            </div>

            <Button onClick={handleConfirm} className="w-full h-11" disabled={!canConfirm}>
              {canConfirm ? 'Continuar para o cofre' : 'Copie ou baixe as palavras primeiro'}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </Modal>
  )
}
