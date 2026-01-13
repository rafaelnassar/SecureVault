import { Button } from '@/components/ui/button'
import { CardButton } from '@/components/ui/card-button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { showToast } from '@/components/ui/sonner'
import { SuccessCheck } from '@/components/ui/success-check'
import { useVault } from '@/contexts/VaultContext'
import { validateRecoveryWords } from '@/lib/recoveryWords'
import {
  exportVault,
  getRecoveryWords,
  importVault,
  previewBackup,
  setupVault,
  unlockVault,
} from '@/lib/vault'
import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from '@tauri-apps/plugin-notification'
import { AnimatePresence, motion } from 'framer-motion'
import {
  AlertCircle,
  ArrowLeft,
  Check,
  Download,
  Key,
  Monitor,
  Moon,
  Sun,
  Trash2,
  Upload,
} from 'lucide-react'
import { useTheme } from 'next-themes'
import { useRef, useState } from 'react'
import { BackupPreview, BackupPreviewModal } from './BackupPreviewModal'
import { Modal } from './Modal'
import { PinInput } from './PinInput'
import { TotalWipeModal } from './TotalWipeModal'

interface SettingsModalProps {
  open: boolean
  onClose: () => void
  onDataChanged?: () => void
  passwordCount?: number
}

type SettingsView =
  | 'main'
  | 'change-pin-method'
  | 'change-pin-verify'
  | 'change-pin-recovery'
  | 'change-pin-new'
  | 'change-pin-confirm'
  | 'import-backup-pin'

export function SettingsModal({
  open,
  onClose,
  onDataChanged,
  passwordCount = 0,
}: SettingsModalProps) {
  const { theme, setTheme } = useTheme()
  const { destroy } = useVault()
  const [view, setView] = useState<SettingsView>('main')
  const [newPin, setNewPin] = useState<string | null>(null)
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [exportSuccess, setExportSuccess] = useState(false)
  const [importResult, setImportResult] = useState<{
    imported: number
    skipped: number
    duplicates: number
  } | null>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const [pendingImportJson, setPendingImportJson] = useState<string | null>(null)
  const [recoveryWords, setRecoveryWords] = useState(['', '', '', ''])
  const [totalWipeOpen, setTotalWipeOpen] = useState(false)
  const [backupPreview, setBackupPreview] = useState<BackupPreview | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)
  const hasPasswords = passwordCount > 0
  const fileInputRef = useRef<HTMLInputElement>(null)

  const themes = [
    { id: 'light', label: 'Claro', icon: Sun },
    { id: 'dark', label: 'Escuro', icon: Moon },
    { id: 'system', label: 'Sistema', icon: Monitor },
  ]

  const handleClose = () => {
    setView('main')
    setNewPin(null)
    setError(false)
    setSuccess(false)
    setExportSuccess(false)
    setImportResult(null)
    setImportError(null)
    setPendingImportJson(null)
    setRecoveryWords(['', '', '', ''])
    onClose()
  }

  const handleExport = async () => {
    try {
      setLoading(true)
      const data = await exportVault()

      const blob = new Blob([data], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `cofre-backup-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      setExportSuccess(true)
      showToast.exported()
      setTimeout(() => setExportSuccess(false), 2000)

      try {
        let permission = await isPermissionGranted()

        if (!permission) {
          const permissionRequest = await requestPermission()
          permission = permissionRequest === 'granted'
        }

        if (permission) {
          sendNotification({
            title: 'Exportação Concluída 📤',
            body: 'Seu backup foi salvo com sucesso na pasta de downloads.',
            icon: 'icons/icon.png',
          })
        }
      } catch (notifError) {
        console.warn('Erro ao tentar notificar (o arquivo foi salvo mesmo assim):', notifError)
      }
    } catch (err) {
      console.error('Export failed:', err)
      showToast.error('Erro ao exportar backup')
    } finally {
      setLoading(false)
    }
  }

  const handleImportClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const text = await file.text()

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }

    try {
      const preview = await previewBackup(text)
      setBackupPreview(preview)
      setPendingImportJson(text)
      setPreviewOpen(true)
    } catch (err) {
      setImportError('Erro ao ler arquivo')
      setTimeout(() => setImportError(null), 3000)
    }
  }

  const handlePreviewConfirm = async () => {
    if (!pendingImportJson || !backupPreview) return

    setPreviewOpen(false)

    if (backupPreview.hasDifferentVault) {
      setView('import-backup-pin')
      return
    }

    try {
      setLoading(true)
      setImportError(null)
      setImportResult(null)

      const result = await importVault(pendingImportJson)
      setImportResult(result)
      setPendingImportJson(null)
      setBackupPreview(null)

      if (result.imported > 0) {
        showToast.imported(result.imported)
        if (onDataChanged) {
          onDataChanged()
        }
      }

      setTimeout(() => setImportResult(null), 3000)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao importar arquivo'
      setImportError(message)
      showToast.error(message)
      setTimeout(() => setImportError(null), 3000)
    } finally {
      setLoading(false)
    }
  }

  const handlePreviewCancel = () => {
    setPreviewOpen(false)
    setPendingImportJson(null)
    setBackupPreview(null)
  }

  const handleImportWithBackupPin = async (pin: string) => {
    if (!pendingImportJson) return

    try {
      setLoading(true)
      setImportError(null)
      setImportResult(null)

      const result = await importVault(pendingImportJson, pin)
      setImportResult(result)
      setPendingImportJson(null)
      setBackupPreview(null)
      setView('main')

      if (result.imported > 0) {
        showToast.imported(result.imported)
        if (onDataChanged) {
          onDataChanged()
        }
      }

      setTimeout(() => setImportResult(null), 3000)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao importar arquivo'
      setImportError(message)
      showToast.error(message)
      setTimeout(() => setImportError(null), 3000)
    } finally {
      setLoading(false)
    }
  }

  const handleTotalWipe = async () => {
    setTotalWipeOpen(false)
    await destroy()

    window.location.reload()
  }

  const renderImportBackupPin = () => (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div className="text-center">
        <h3 className="text-lg font-semibold text-foreground mb-1">Confirmar PIN do backup</h3>
        <p className="text-base text-muted-foreground">
          Este backup foi criado em outro cofre. Digite o PIN usado no backup para importar com
          segurança.
        </p>
      </div>

      <div className="flex justify-center">
        {loading ? (
          <div className="h-14 flex items-center">
            <LoadingSpinner />
          </div>
        ) : (
          <PinInput onComplete={handleImportWithBackupPin} error={error} disabled={loading} />
        )}
      </div>

      <AnimatePresence>
        {importError && (
          <motion.p
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="text-destructive text-sm text-center"
          >
            {importError}
          </motion.p>
        )}
      </AnimatePresence>

      <Button
        variant="ghost"
        onClick={() => {
          setPendingImportJson(null)
          setBackupPreview(null)
          setImportError(null)
          setView('main')
        }}
        className="w-full h-11 gap-2"
        disabled={loading}
      >
        <ArrowLeft className="w-5 h-5" />
        Voltar
      </Button>
    </motion.div>
  )

  const handleVerifyOldPin = async (pin: string) => {
    setError(false)
    setLoading(true)

    const isValid = await unlockVault(pin)
    setLoading(false)

    if (isValid) {
      setView('change-pin-new')
    } else {
      setError(true)
    }
  }

  const handleRecoveryWordChange = (index: number, value: string) => {
    const newWords = [...recoveryWords]
    newWords[index] = value.toLowerCase().trim()
    setRecoveryWords(newWords)
    setError(false)
  }

  const handleVerifyRecoveryWords = async () => {
    setError(false)
    setLoading(true)

    try {
      const storedWords = await getRecoveryWords()
      if (!storedWords) {
        setError(true)
        setLoading(false)
        return
      }

      const isValid = validateRecoveryWords(recoveryWords, storedWords)

      if (isValid) {
        setView('change-pin-new')
        setRecoveryWords(['', '', '', ''])
      } else {
        setError(true)
      }
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  const handleNewPin = (pin: string) => {
    setNewPin(pin)
    setView('change-pin-confirm')
    setError(false)
  }

  const handleConfirmNewPin = async (pin: string) => {
    setError(false)

    if (pin !== newPin) {
      setError(true)
      setNewPin(null)
      setView('change-pin-new')
      return
    }

    setLoading(true)
    const result = await setupVault(pin)
    setLoading(false)

    if (result.success) {
      setSuccess(true)
      showToast.pinChanged()
      setTimeout(() => {
        setView('main')
        setNewPin(null)
        setSuccess(false)
      }, 1500)
    } else {
      setError(true)
      showToast.error('Erro ao alterar PIN')
      setNewPin(null)
      setView('change-pin-new')
    }
  }

  const renderMethodSelection = () => (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-4"
    >
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold text-foreground mb-1">Alterar PIN</h3>
        <p className="text-base text-muted-foreground">
          Escolha como deseja verificar sua identidade
        </p>
      </div>

      <CardButton
        icon={<Key className="w-5 h-5" />}
        title="Usar PIN atual"
        description="Digite seu PIN atual para continuar"
        onClick={() => setView('change-pin-verify')}
      />

      <CardButton
        icon={<Key className="w-5 h-5" />}
        title="Usar palavras de recuperação"
        description="Digite suas 4 palavras de recuperação"
        onClick={() => setView('change-pin-recovery')}
      />

      <Button variant="ghost" onClick={() => setView('main')} className="w-full h-11 gap-2 mt-4">
        <ArrowLeft className="w-5 h-5" />
        Voltar
      </Button>
    </motion.div>
  )

  const renderRecoveryWordsInput = () => (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-5"
    >
      <div className="text-center mb-5">
        <h3 className="text-lg font-semibold text-foreground mb-1">Palavras de recuperação</h3>
        <p className="text-base text-muted-foreground">Digite suas 4 palavras de recuperação</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {recoveryWords.map((word, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">
                {index + 1}.
              </span>
              <Input
                value={word}
                onChange={(e) => handleRecoveryWordChange(index, e.target.value)}
                placeholder="palavra"
                className="pl-9 h-12 font-mono text-base"
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
            className="text-destructive text-sm text-center"
          >
            Palavras incorretas. Tente novamente.
          </motion.p>
        )}
      </AnimatePresence>

      <div className="flex gap-3 pt-2">
        <Button
          variant="ghost"
          onClick={() => {
            setView('change-pin-method')
            setRecoveryWords(['', '', '', ''])
            setError(false)
          }}
          className="flex-1 h-11 gap-2"
          disabled={loading}
        >
          <ArrowLeft className="w-5 h-5" />
          Voltar
        </Button>
        <Button
          onClick={handleVerifyRecoveryWords}
          className="flex-1 h-11"
          disabled={!recoveryWords.every((w) => w.length > 0) || loading}
        >
          Verificar
        </Button>
      </div>
    </motion.div>
  )

  const renderPinView = () => {
    const viewConfig = {
      'change-pin-verify': {
        title: 'Verificar PIN atual',
        description: 'Digite seu PIN atual para continuar',
        onComplete: handleVerifyOldPin,
        errorMessage: 'PIN incorreto',
        backView: 'change-pin-method' as SettingsView,
      },
      'change-pin-new': {
        title: 'Novo PIN',
        description: 'Escolha um novo PIN de 6 dígitos',
        onComplete: handleNewPin,
        errorMessage: 'Os PINs não coincidem. Tente novamente.',
        backView: 'change-pin-method' as SettingsView,
      },
      'change-pin-confirm': {
        title: 'Confirmar novo PIN',
        description: 'Digite o novo PIN novamente para confirmar',
        onComplete: handleConfirmNewPin,
        errorMessage: '',
        backView: 'change-pin-new' as SettingsView,
      },
    }

    const config = viewConfig[view as keyof typeof viewConfig]
    if (!config) return null

    return (
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className="space-y-6"
      >
        <AnimatePresence mode="wait">
          {success ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="py-6 text-center space-y-4"
            >
              <SuccessCheck />
              <p className="font-medium text-foreground">PIN alterado com sucesso!</p>
            </motion.div>
          ) : (
            <motion.div
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              <div className="text-center">
                <h3 className="text-lg font-semibold text-foreground mb-1">{config.title}</h3>
                <p className="text-base text-muted-foreground">{config.description}</p>
              </div>

              <div className="flex justify-center">
                {loading ? (
                  <div className="h-14 flex items-center">
                    <LoadingSpinner />
                  </div>
                ) : (
                  <PinInput onComplete={config.onComplete} error={error} disabled={loading} />
                )}
              </div>

              <AnimatePresence>
                {error && config.errorMessage && (
                  <motion.p
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="text-destructive text-sm text-center"
                  >
                    {config.errorMessage}
                  </motion.p>
                )}
              </AnimatePresence>

              <Button
                variant="ghost"
                onClick={() => setView(config.backView)}
                className="w-full h-11 gap-2"
              >
                <ArrowLeft className="w-5 h-5" />
                Voltar
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    )
  }

  return (
    <>
      <Modal
        open={open}
        onClose={handleClose}
        title={view === 'main' ? 'Configurações' : undefined}
        maxWidth="md"
      >
        <AnimatePresence mode="wait">
          {view === 'main' ? (
            <motion.div
              key="main"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              {/* Theme Selection */}
              <div className="space-y-3">
                <Label className="text-sm font-medium text-muted-foreground">Aparência</Label>
                <div className="grid grid-cols-3 gap-3">
                  {themes.map(({ id, label, icon: Icon }) => {
                    const isSelected = theme === id
                    return (
                      <motion.button
                        key={id}
                        onClick={() => setTheme(id)}
                        whileTap={{ scale: 0.98 }}
                        className={`
                          relative flex flex-col items-center gap-2.5 p-4 rounded-xl border-2 transition-all duration-200
                          ${
                            isSelected
                              ? 'border-foreground bg-muted text-foreground'
                              : 'border-transparent bg-muted/40 text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                          }
                        `}
                      >
                        <div
                          className={`
                          w-11 h-11 rounded-xl flex items-center justify-center transition-colors
                          ${
                            isSelected
                              ? 'bg-foreground text-background'
                              : 'bg-background border border-border'
                          }
                        `}
                        >
                          <Icon className="w-5 h-5" />
                        </div>
                        <span className="text-sm font-medium">{label}</span>
                      </motion.button>
                    )
                  })}
                </div>
              </div>

              {/* Security Section */}
              <div className="space-y-3">
                <Label className="text-sm font-medium text-muted-foreground">Segurança</Label>
                <CardButton
                  icon={<Key className="w-5 h-5" />}
                  title="Alterar PIN"
                  description="Atualize seu código de acesso"
                  onClick={() => setView('change-pin-method')}
                />
              </div>

              {/* Backup Section */}
              <div className="space-y-3">
                <Label className="text-sm font-medium text-muted-foreground">Backup</Label>

                <CardButton
                  icon={
                    exportSuccess ? (
                      <Check className="w-5 h-5 text-success" />
                    ) : (
                      <Download className="w-5 h-5" />
                    )
                  }
                  title="Exportar dados"
                  description={
                    hasPasswords ? 'Baixe um backup criptografado' : 'Nenhuma senha para exportar'
                  }
                  onClick={handleExport}
                  disabled={loading || !hasPasswords}
                />

                <CardButton
                  icon={
                    importResult ? (
                      <Check className="w-5 h-5 text-success" />
                    ) : (
                      <Upload className="w-5 h-5" />
                    )
                  }
                  title="Importar dados"
                  description="Restaure a partir de um backup"
                  onClick={handleImportClick}
                  disabled={loading}
                />

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleFileChange}
                  className="hidden"
                />

                <AnimatePresence>
                  {importResult && (
                    <motion.div
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="flex items-center gap-3 text-sm text-success bg-success/10 rounded-xl p-4"
                    >
                      <Check className="w-5 h-5 flex-shrink-0" />
                      <span>
                        {importResult.imported > 0
                          ? `${importResult.imported} senha(s) importada(s)`
                          : 'Nenhuma senha nova para importar'}
                        {importResult.duplicates > 0 &&
                          ` • ${importResult.duplicates} duplicada(s)`}
                      </span>
                    </motion.div>
                  )}

                  {importError && (
                    <motion.div
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="flex items-center gap-3 text-sm text-destructive bg-destructive/10 rounded-xl p-4"
                    >
                      <AlertCircle className="w-5 h-5 flex-shrink-0" />
                      <span>{importError}</span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Danger Zone */}
              <div className="space-y-3">
                <Label className="text-sm font-medium text-destructive/70">Zona de perigo</Label>
                <CardButton
                  icon={<Trash2 className="w-5 h-5" />}
                  title="Limpeza total"
                  description="Apagar todos os dados permanentemente"
                  onClick={() => setTotalWipeOpen(true)}
                  variant="danger"
                />
              </div>
            </motion.div>
          ) : view === 'change-pin-method' ? (
            renderMethodSelection()
          ) : view === 'change-pin-recovery' ? (
            renderRecoveryWordsInput()
          ) : view === 'import-backup-pin' ? (
            renderImportBackupPin()
          ) : (
            renderPinView()
          )}
        </AnimatePresence>
      </Modal>

      <TotalWipeModal
        open={totalWipeOpen}
        onConfirm={handleTotalWipe}
        onCancel={() => setTotalWipeOpen(false)}
      />

      <BackupPreviewModal
        open={previewOpen}
        preview={backupPreview}
        onConfirm={handlePreviewConfirm}
        onCancel={handlePreviewCancel}
      />
    </>
  )
}
