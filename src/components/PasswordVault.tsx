import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { showToast } from '@/components/ui/sonner'
import { useVault } from '@/contexts/VaultContext'
import { useAutoLockTimer } from '@/hooks/useAutoLockTimer'
import { secureCopyToClipboard } from '@/lib/security'
import { cn } from '@/lib/utils'
import {
  getCryptoKeys,
  getPasswords,
  removeCryptoKey,
  removePassword,
  saveCryptoKey,
  savePassword,
} from '@/lib/vault'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Bitcoin,
  KeyRound,
  Lock,
  Plus,
  Search,
  Settings,
  Shield,
  Sparkles,
  Timer,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { CryptoCardSkeleton, PasswordCardSkeleton } from './CardSkeleton'
import { CryptoKeyCard } from './CryptoKeyCard'
import { CryptoKeyData, CryptoKeyForm } from './CryptoKeyForm'
import { CryptoShareFormatSelector } from './CryptoShareFormatSelector'
import { CryptoShareWarningModal } from './CryptoShareWarningModal'
import { DeleteConfirm } from './DeleteConfirm'
import { PasswordCard } from './PasswordCard'
import { PasswordForm } from './PasswordForm'
import { PasswordGenerator } from './PasswordGenerator'
import { PinVerifyModal } from './PinVerifyModal'
import { SettingsModal } from './SettingsModal'
import { ShareFormatSelector } from './ShareFormatSelector'
import { ShareWarningModal } from './ShareWarningModal'
interface Password {
  id: string
  site: string
  login?: string
  password: string
  isSensitive?: boolean
  createdAt: number
  updatedAt: number
}

type Tab = 'passwords' | 'crypto'
type PendingAction =
  | { type: 'edit' | 'delete'; password: Password }
  | { type: 'edit-crypto' | 'delete-crypto'; cryptoKey: CryptoKeyData }

export function PasswordVault() {
  const { lock, state } = useVault()
  const { formattedTime, isExpiringSoon } = useAutoLockTimer(state === 'unlocked')
  const [passwords, setPasswords] = useState<Password[]>([])
  const [cryptoKeys, setCryptoKeys] = useState<CryptoKeyData[]>([])
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState<Tab>('passwords')
  const [formOpen, setFormOpen] = useState(false)
  const [cryptoFormOpen, setCryptoFormOpen] = useState(false)
  const [generatorOpen, setGeneratorOpen] = useState(false)
  const [editingPassword, setEditingPassword] = useState<Password | null>(null)
  const [editingCryptoKey, setEditingCryptoKey] = useState<CryptoKeyData | null>(null)
  const [deletingPassword, setDeletingPassword] = useState<Password | null>(null)
  const [deletingCryptoKey, setDeletingCryptoKey] = useState<CryptoKeyData | null>(null)
  const [pendingSharePassword, setPendingSharePassword] = useState<Password | null>(null)
  const [sharingPassword, setSharingPassword] = useState<Password | null>(null)
  const [pendingShareCrypto, setPendingShareCrypto] = useState<CryptoKeyData | null>(null)
  const [sharingCrypto, setSharingCrypto] = useState<CryptoKeyData | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [pinVerifyOpen, setPinVerifyOpen] = useState(false)
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null)

  const loadData = async () => {
    try {
      const [passwordData, cryptoData] = await Promise.all([getPasswords(), getCryptoKeys()])
      setPasswords(passwordData.sort((a, b) => b.updatedAt - a.updatedAt))
      setCryptoKeys(cryptoData.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)))
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleSave = async (data: {
    site: string
    login?: string
    password: string
    isSensitive?: boolean
  }) => {
    await savePassword(data.site, data.password, data.login, editingPassword?.id, data.isSensitive)
    await loadData()
    setEditingPassword(null)
    showToast.saved(editingPassword ? 'Senha atualizada' : 'Senha')
  }

  const handleSaveCryptoKey = async (data: CryptoKeyData) => {
    await saveCryptoKey(data)
    await loadData()
    setEditingCryptoKey(null)
    showToast.saved(editingCryptoKey ? 'Carteira atualizada' : 'Carteira')
  }

  const handleDelete = async () => {
    if (!deletingPassword) return
    await removePassword(deletingPassword.id)
    await loadData()
    setDeletingPassword(null)
    showToast.deleted('Senha')
  }

  const handleDeleteCryptoKey = async () => {
    if (!deletingCryptoKey?.id) return
    await removeCryptoKey(deletingCryptoKey.id)
    await loadData()
    setDeletingCryptoKey(null)
    showToast.deleted('Carteira')
  }

  const requestPinVerification = (action: PendingAction) => {
    setPendingAction(action)
    setPinVerifyOpen(true)
  }

  const handlePinVerified = () => {
    setPinVerifyOpen(false)
    if (!pendingAction) return

    if (pendingAction.type === 'edit') {
      setEditingPassword(pendingAction.password)
      setFormOpen(true)
    } else if (pendingAction.type === 'delete') {
      setDeletingPassword(pendingAction.password)
    } else if (pendingAction.type === 'edit-crypto') {
      setEditingCryptoKey(pendingAction.cryptoKey)
      setCryptoFormOpen(true)
    } else if (pendingAction.type === 'delete-crypto') {
      setDeletingCryptoKey(pendingAction.cryptoKey)
    }
    setPendingAction(null)
  }

  // Clipboard seguro com auto-limpeza após 30 segundos
  const handleCopyPassword = async (password: Password) => {
    await secureCopyToClipboard(password.password, 30000)
    showToast.copied('Senha')
  }

  const handleCopyLogin = async (password: Password) => {
    if (!password.login) return
    await secureCopyToClipboard(password.login, 60000)
    showToast.copied('Login')
  }

  const handleCopySite = async (password: Password) => {
    const domain = password.site
      .replace(/^https?:\/\//, '')
      .split('/')[0]
      .replace(/^www\./, '')
    await secureCopyToClipboard(domain, 60000)
    showToast.copied('Site')
  }

  const handleCopyCryptoAddress = async (cryptoKey: CryptoKeyData) => {
    await secureCopyToClipboard(cryptoKey.walletAddress, 30000)
    showToast.copied('Endereço')
  }

  const handleCopyCryptoLogin = async (cryptoKey: CryptoKeyData) => {
    if (!cryptoKey.login) return
    await secureCopyToClipboard(cryptoKey.login, 60000)
    showToast.copied('Login')
  }

  const handleCopyCryptoPrivateKey = async (cryptoKey: CryptoKeyData) => {
    if (!cryptoKey.privateKey) return
    await secureCopyToClipboard(cryptoKey.privateKey, 30000)
    showToast.copied('Chave privada')
  }

  const handleCopyCryptoSeedPhrase = async (cryptoKey: CryptoKeyData) => {
    if (!cryptoKey.seedPhrase) return
    await secureCopyToClipboard(cryptoKey.seedPhrase, 30000)
    showToast.copied('Seed phrase')
  }

  const handleCopyCryptoRecoveryWords = async (cryptoKey: CryptoKeyData) => {
    if (!cryptoKey.recoveryWords || cryptoKey.recoveryWords.length === 0) return
    await secureCopyToClipboard(cryptoKey.recoveryWords.join(' '), 30000)
    showToast.copied('Palavras de recuperação')
  }

  const handleCopyCryptoNotes = async (cryptoKey: CryptoKeyData) => {
    if (!cryptoKey.notes) return
    await secureCopyToClipboard(cryptoKey.notes, 60000)
    showToast.copied('Notas')
  }

  const handleShareRequest = (password: Password) => {
    setPendingSharePassword(password)
  }

  const handleShareConfirm = () => {
    if (pendingSharePassword) {
      setSharingPassword(pendingSharePassword)
      setPendingSharePassword(null)
    }
  }

  const handleCryptoShareRequest = (cryptoKey: CryptoKeyData) => {
    setPendingShareCrypto(cryptoKey)
  }

  const handleCryptoShareConfirm = () => {
    if (pendingShareCrypto) {
      setSharingCrypto(pendingShareCrypto)
      setPendingShareCrypto(null)
    }
  }

  const filteredPasswords = passwords.filter(
    (p) =>
      p.site.toLowerCase().includes(search.toLowerCase()) ||
      p.login?.toLowerCase().includes(search.toLowerCase())
  )

  const filteredCryptoKeys = cryptoKeys.filter(
    (k) =>
      k.name.toLowerCase().includes(search.toLowerCase()) ||
      k.login?.toLowerCase().includes(search.toLowerCase()) ||
      k.walletAddress.toLowerCase().includes(search.toLowerCase())
  )

  const totalItems = passwords.length + cryptoKeys.length

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="max-w-5xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <motion.div
                className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <KeyRound className="w-[18px] h-[18px] text-foreground" />
              </motion.div>
              <div>
                <h1 className="font-semibold text-foreground text-sm tracking-tight">Cofre</h1>
                <p className="text-xs text-muted-foreground tracking-tight">
                  {totalItems} {totalItems === 1 ? 'item' : 'itens'} salvos
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSettingsOpen(true)}
                className="h-9 w-9"
              >
                <Settings className="w-[18px] h-[18px]" />
              </Button>
              <Button variant="ghost" size="icon" onClick={lock} className="h-9 w-9">
                <Lock className="w-[18px] h-[18px]" />
              </Button>
              {activeTab === 'passwords' && (
                <Button
                  onClick={() => setGeneratorOpen(true)}
                  size="sm"
                  variant="outline"
                  className="gap-1.5 h-9 px-3"
                >
                  <Sparkles className="w-4 h-4" />
                  Gerar
                </Button>
              )}
              <Button
                onClick={() =>
                  activeTab === 'passwords' ? setFormOpen(true) : setCryptoFormOpen(true)
                }
                size="sm"
                className="gap-1.5 h-9 px-3"
              >
                <Plus className="w-4 h-4" />
                {activeTab === 'passwords' ? 'Nova' : 'Carteira'}
              </Button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 p-1 bg-muted/50 rounded-lg mb-3">
            <button
              onClick={() => setActiveTab('passwords')}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-md text-sm font-medium transition-all tracking-tight',
                activeTab === 'passwords'
                  ? 'bg-background text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <KeyRound className="w-4 h-4" />
              Senhas
              {passwords.length > 0 && (
                <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[11px] bg-muted rounded-full font-medium tabular-nums">
                  {passwords.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('crypto')}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-md text-sm font-medium transition-all tracking-tight',
                activeTab === 'crypto'
                  ? 'bg-background text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Bitcoin className="w-4 h-4" />
              Crypto
              {cryptoKeys.length > 0 && (
                <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[11px] bg-muted rounded-full font-medium tabular-nums">
                  {cryptoKeys.length}
                </span>
              )}
            </button>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-muted-foreground/60 pointer-events-none" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={activeTab === 'passwords' ? 'Buscar senhas...' : 'Buscar carteiras...'}
              className="pl-10 h-10 bg-muted/40 border-transparent focus:border-border focus:bg-background"
            />
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 pb-24">
        <AnimatePresence mode="wait" initial={false}>
          {loading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
            >
              {activeTab === 'passwords'
                ? Array.from({ length: 6 }).map((_, i) => <PasswordCardSkeleton key={i} />)
                : Array.from({ length: 6 }).map((_, i) => <CryptoCardSkeleton key={i} />)}
            </motion.div>
          ) : activeTab === 'passwords' ? (
            <motion.div
              key="passwords-tab"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              {filteredPasswords.length === 0 ? (
                <div className="text-center py-20">
                  <motion.div
                    className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4"
                    initial={{ scale: 0.9 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                  >
                    <Shield className="w-8 h-8 text-muted-foreground" />
                  </motion.div>
                  <h2 className="font-medium text-foreground mb-1">
                    {search ? 'Nenhum resultado encontrado' : 'Nenhuma senha salva'}
                  </h2>
                  <p className="text-sm text-muted-foreground mb-6">
                    {search
                      ? 'Tente buscar por outro termo'
                      : 'Adicione sua primeira senha para começar'}
                  </p>
                  {!search && (
                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                      <Button
                        onClick={() => setFormOpen(true)}
                        variant="outline"
                        size="sm"
                        className="gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        Adicionar senha
                      </Button>
                    </motion.div>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredPasswords.map((password) => (
                    <PasswordCard
                      key={password.id}
                      {...password}
                      onEdit={() => requestPinVerification({ type: 'edit', password })}
                      onDelete={() => requestPinVerification({ type: 'delete', password })}
                      onShare={() => handleShareRequest(password)}
                      onCopy={() => handleCopyPassword(password)}
                      onCopyLogin={() => handleCopyLogin(password)}
                      onCopySite={() => handleCopySite(password)}
                    />
                  ))}
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="crypto-tab"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              {filteredCryptoKeys.length === 0 ? (
                <div className="text-center py-20">
                  <motion.div
                    className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4"
                    initial={{ scale: 0.9 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                  >
                    <Bitcoin className="w-8 h-8 text-muted-foreground" />
                  </motion.div>
                  <h2 className="font-medium text-foreground mb-1">
                    {search ? 'Nenhum resultado encontrado' : 'Nenhuma carteira salva'}
                  </h2>
                  <p className="text-sm text-muted-foreground mb-6">
                    {search
                      ? 'Tente buscar por outro termo'
                      : 'Adicione sua primeira carteira crypto'}
                  </p>
                  {!search && (
                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                      <Button
                        onClick={() => setCryptoFormOpen(true)}
                        variant="outline"
                        size="sm"
                        className="gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        Adicionar carteira
                      </Button>
                    </motion.div>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredCryptoKeys.map((cryptoKey) => (
                    <CryptoKeyCard
                      key={cryptoKey.id}
                      name={cryptoKey.name}
                      login={cryptoKey.login}
                      walletAddress={cryptoKey.walletAddress}
                      privateKey={cryptoKey.privateKey}
                      seedPhrase={cryptoKey.seedPhrase}
                      recoveryWords={cryptoKey.recoveryWords}
                      notes={cryptoKey.notes}
                      onEdit={() => requestPinVerification({ type: 'edit-crypto', cryptoKey })}
                      onDelete={() => requestPinVerification({ type: 'delete-crypto', cryptoKey })}
                      onShare={() => handleCryptoShareRequest(cryptoKey)}
                      onCopyAddress={() => handleCopyCryptoAddress(cryptoKey)}
                      onCopyLogin={() => handleCopyCryptoLogin(cryptoKey)}
                      onCopyPrivateKey={() => handleCopyCryptoPrivateKey(cryptoKey)}
                      onCopySeedPhrase={() => handleCopyCryptoSeedPhrase(cryptoKey)}
                      onCopyRecoveryWords={() => handleCopyCryptoRecoveryWords(cryptoKey)}
                      onCopyNotes={() => handleCopyCryptoNotes(cryptoKey)}
                    />
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="fixed bottom-0 left-0 right-0 bg-background/80 backdrop-blur-lg border-t border-border">
        <div className="max-w-5xl mx-auto px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground tracking-tight">
            <Shield className="w-3.5 h-3.5" />
            <span>Criptografia AES-256</span>
          </div>

          <motion.div
            className={cn(
              'flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full transition-colors tracking-tight',
              isExpiringSoon
                ? 'bg-destructive/10 text-destructive'
                : 'bg-muted text-muted-foreground'
            )}
            animate={isExpiringSoon ? { scale: [1, 1.02, 1] } : {}}
            transition={{ repeat: isExpiringSoon ? Infinity : 0, duration: 1 }}
          >
            <Timer className="w-3.5 h-3.5" />
            <span className="font-mono font-medium">{formattedTime}</span>
          </motion.div>
        </div>
      </footer>

      <PasswordForm
        open={formOpen}
        onClose={() => {
          setFormOpen(false)
          setEditingPassword(null)
        }}
        onSave={handleSave}
        initialData={editingPassword || undefined}
      />
      <CryptoKeyForm
        open={cryptoFormOpen}
        onClose={() => {
          setCryptoFormOpen(false)
          setEditingCryptoKey(null)
        }}
        onSave={handleSaveCryptoKey}
        initialData={editingCryptoKey || undefined}
      />
      <DeleteConfirm
        open={!!deletingPassword}
        siteName={deletingPassword?.site || ''}
        onConfirm={handleDelete}
        onCancel={() => setDeletingPassword(null)}
        itemType="password"
      />
      <DeleteConfirm
        open={!!deletingCryptoKey}
        siteName={deletingCryptoKey?.name || ''}
        onConfirm={handleDeleteCryptoKey}
        onCancel={() => setDeletingCryptoKey(null)}
        itemType="crypto"
      />
      <ShareWarningModal
        open={!!pendingSharePassword}
        site={pendingSharePassword?.site || ''}
        onConfirm={handleShareConfirm}
        onCancel={() => setPendingSharePassword(null)}
      />
      <ShareFormatSelector
        open={!!sharingPassword}
        site={sharingPassword?.site || ''}
        login={sharingPassword?.login}
        password={sharingPassword?.password || ''}
        onClose={() => setSharingPassword(null)}
      />
      <CryptoShareWarningModal
        open={!!pendingShareCrypto}
        walletName={pendingShareCrypto?.name || ''}
        onConfirm={handleCryptoShareConfirm}
        onCancel={() => setPendingShareCrypto(null)}
      />
      <CryptoShareFormatSelector
        open={!!sharingCrypto}
        cryptoKey={sharingCrypto}
        onClose={() => setSharingCrypto(null)}
      />
      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onDataChanged={loadData}
        passwordCount={passwords.length}
      />
      <PasswordGenerator open={generatorOpen} onClose={() => setGeneratorOpen(false)} />
      <PinVerifyModal
        open={pinVerifyOpen}
        onVerified={handlePinVerified}
        onCancel={() => {
          setPinVerifyOpen(false)
          setPendingAction(null)
        }}
        title="Verificar identidade"
        description="Digite seu PIN para continuar"
      />
    </div>
  )
}
