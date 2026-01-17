import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, Lock, Shield, KeyRound, Settings, Timer, Sparkles, Bitcoin } from 'lucide-react';
import { PasswordGenerator } from './PasswordGenerator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordCard } from './PasswordCard';
import { PasswordForm } from './PasswordForm';
import { DeleteConfirm } from './DeleteConfirm';
import { SettingsModal } from './SettingsModal';
import { ShareFormatSelector } from './ShareFormatSelector';
import { ShareWarningModal } from './ShareWarningModal';
import { CryptoShareFormatSelector } from './CryptoShareFormatSelector';
import { CryptoShareWarningModal } from './CryptoShareWarningModal';
import { PinVerifyModal } from './PinVerifyModal';
import { CryptoKeyCard } from './CryptoKeyCard';
import { CryptoKeyForm, CryptoKeyData } from './CryptoKeyForm';
import { PasswordCardSkeleton, CryptoCardSkeleton } from './CardSkeleton';
import { useVault } from '@/contexts/VaultContext';
import { useAutoLockTimer } from '@/hooks/useAutoLockTimer';
import { getPasswords, savePassword, removePassword, getCryptoKeys, saveCryptoKey, removeCryptoKey } from '@/lib/vault';
import { cn } from '@/lib/utils';
import { secureCopyToClipboard } from '@/lib/security';
import { showToast } from '@/components/ui/sonner';
import { logger } from '@/lib/logger';
interface Password {
  id: string;
  site: string;
  login?: string;
  password: string;
  isSensitive?: boolean;
  createdAt: number;
  updatedAt: number;
}

type Tab = 'passwords' | 'crypto';
type PendingAction = { type: 'edit' | 'delete'; password: Password } | { type: 'edit-crypto' | 'delete-crypto'; cryptoKey: CryptoKeyData };

export function PasswordVault() {
  const { lock, state } = useVault();
  const { formattedTime, isExpiringSoon } = useAutoLockTimer(state === 'unlocked');
  const [passwords, setPasswords] = useState<Password[]>([]);
  const [cryptoKeys, setCryptoKeys] = useState<CryptoKeyData[]>([]);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<Tab>('passwords');
  const [formOpen, setFormOpen] = useState(false);
  const [cryptoFormOpen, setCryptoFormOpen] = useState(false);
  const [generatorOpen, setGeneratorOpen] = useState(false);
  const [editingPassword, setEditingPassword] = useState<Password | null>(null);
  const [editingCryptoKey, setEditingCryptoKey] = useState<CryptoKeyData | null>(null);
  const [deletingPassword, setDeletingPassword] = useState<Password | null>(null);
  const [deletingCryptoKey, setDeletingCryptoKey] = useState<CryptoKeyData | null>(null);
  const [pendingSharePassword, setPendingSharePassword] = useState<Password | null>(null);
  const [sharingPassword, setSharingPassword] = useState<Password | null>(null);
  const [pendingShareCrypto, setPendingShareCrypto] = useState<CryptoKeyData | null>(null);
  const [sharingCrypto, setSharingCrypto] = useState<CryptoKeyData | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pinVerifyOpen, setPinVerifyOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  
  const loadData = async () => {
    try {
      const [passwordData, cryptoData] = await Promise.all([
        getPasswords(),
        getCryptoKeys()
      ]);
      setPasswords(passwordData.sort((a, b) => b.updatedAt - a.updatedAt));
      setCryptoKeys(cryptoData.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)));
    } catch (error) {
      logger.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSave = async (data: { site: string; login?: string; password: string; isSensitive?: boolean }) => {
    await savePassword(data.site, data.password, data.login, editingPassword?.id, data.isSensitive);
    await loadData();
    setEditingPassword(null);
    showToast.saved(editingPassword ? 'Senha atualizada' : 'Senha');
  };

  const handleSaveCryptoKey = async (data: CryptoKeyData) => {
    await saveCryptoKey(data);
    await loadData();
    setEditingCryptoKey(null);
    showToast.saved(editingCryptoKey ? 'Carteira atualizada' : 'Carteira');
  };

  const handleDelete = async () => {
    if (!deletingPassword) return;
    await removePassword(deletingPassword.id);
    await loadData();
    setDeletingPassword(null);
    showToast.deleted('Senha');
  };

  const handleDeleteCryptoKey = async () => {
    if (!deletingCryptoKey?.id) return;
    await removeCryptoKey(deletingCryptoKey.id);
    await loadData();
    setDeletingCryptoKey(null);
    showToast.deleted('Carteira');
  };

  const requestPinVerification = (action: PendingAction) => {
    setPendingAction(action);
    setPinVerifyOpen(true);
  };

  const handlePinVerified = () => {
    setPinVerifyOpen(false);
    if (!pendingAction) return;

    if (pendingAction.type === 'edit') {
      setEditingPassword(pendingAction.password);
      setFormOpen(true);
    } else if (pendingAction.type === 'delete') {
      setDeletingPassword(pendingAction.password);
    } else if (pendingAction.type === 'edit-crypto') {
      setEditingCryptoKey(pendingAction.cryptoKey);
      setCryptoFormOpen(true);
    } else if (pendingAction.type === 'delete-crypto') {
      setDeletingCryptoKey(pendingAction.cryptoKey);
    }
    setPendingAction(null);
  };

  // Clipboard seguro com auto-limpeza após 30 segundos
  const handleCopyPassword = async (password: Password) => {
    await secureCopyToClipboard(password.password, 30000);
    showToast.copied('Senha');
  };

  const handleCopyLogin = async (password: Password) => {
    if (!password.login) return;
    await secureCopyToClipboard(password.login, 60000);
    showToast.copied('Login');
  };

  const handleCopySite = async (password: Password) => {
    const domain = password.site.replace(/^https?:\/\//, '').split('/')[0].replace(/^www\./, '');
    await secureCopyToClipboard(domain, 60000);
    showToast.copied('Site');
  };

  const handleCopyCryptoAddress = async (cryptoKey: CryptoKeyData) => {
    await secureCopyToClipboard(cryptoKey.walletAddress, 30000);
    showToast.copied('Endereço');
  };

  const handleCopyCryptoLogin = async (cryptoKey: CryptoKeyData) => {
    if (!cryptoKey.login) return;
    await secureCopyToClipboard(cryptoKey.login, 60000);
    showToast.copied('Login');
  };

  const handleCopyCryptoPrivateKey = async (cryptoKey: CryptoKeyData) => {
    if (!cryptoKey.privateKey) return;
    await secureCopyToClipboard(cryptoKey.privateKey, 30000);
    showToast.copied('Chave privada');
  };

  const handleCopyCryptoSeedPhrase = async (cryptoKey: CryptoKeyData) => {
    if (!cryptoKey.seedPhrase) return;
    await secureCopyToClipboard(cryptoKey.seedPhrase, 30000);
    showToast.copied('Seed phrase');
  };

  const handleCopyCryptoRecoveryWords = async (cryptoKey: CryptoKeyData) => {
    if (!cryptoKey.recoveryWords || cryptoKey.recoveryWords.length === 0) return;
    await secureCopyToClipboard(cryptoKey.recoveryWords.join(' '), 30000);
    showToast.copied('Palavras de recuperação');
  };

  const handleCopyCryptoNotes = async (cryptoKey: CryptoKeyData) => {
    if (!cryptoKey.notes) return;
    await secureCopyToClipboard(cryptoKey.notes, 60000);
    showToast.copied('Notas');
  };

  const handleShareRequest = (password: Password) => {
    setPendingSharePassword(password);
  };

  const handleShareConfirm = () => {
    if (pendingSharePassword) {
      setSharingPassword(pendingSharePassword);
      setPendingSharePassword(null);
    }
  };

  const handleCryptoShareRequest = (cryptoKey: CryptoKeyData) => {
    setPendingShareCrypto(cryptoKey);
  };

  const handleCryptoShareConfirm = () => {
    if (pendingShareCrypto) {
      setSharingCrypto(pendingShareCrypto);
      setPendingShareCrypto(null);
    }
  };

  const filteredPasswords = passwords.filter(p => 
    p.site.toLowerCase().includes(search.toLowerCase()) ||
    p.login?.toLowerCase().includes(search.toLowerCase())
  );

  const filteredCryptoKeys = cryptoKeys.filter(k =>
    k.name.toLowerCase().includes(search.toLowerCase()) ||
    k.login?.toLowerCase().includes(search.toLowerCase()) ||
    k.walletAddress.toLowerCase().includes(search.toLowerCase())
  );

  const totalItems = passwords.length + cryptoKeys.length;

  return (
    <div className="min-h-screen bg-background safe-area-inset">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-3">
          {/* Header Row */}
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <motion.div 
                className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-muted flex items-center justify-center flex-shrink-0"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <KeyRound className="w-5 h-5 sm:w-[22px] sm:h-[22px] text-foreground" />
              </motion.div>
              <div className="min-w-0">
                <h1 className="font-semibold text-foreground text-base sm:text-lg tracking-tight truncate">SecureVault</h1>
                <p className="text-xs sm:text-sm text-muted-foreground tracking-tight">
                  {totalItems} {totalItems === 1 ? 'item' : 'itens'} salvos
                </p>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex items-center gap-1 sm:gap-1.5 flex-shrink-0">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setSettingsOpen(true)} 
                className="h-10 w-10"
                data-size="icon"
              >
                <Settings className="w-5 h-5" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={lock} 
                className="h-10 w-10"
                data-size="icon"
              >
                <Lock className="w-5 h-5" />
              </Button>
              {activeTab === 'passwords' && (
                <Button 
                  onClick={() => setGeneratorOpen(true)} 
                  size="sm" 
                  variant="outline"
                  className="gap-1.5 h-10 px-3 hidden xs:flex"
                >
                  <Sparkles className="w-4 h-4" />
                  <span className="hidden sm:inline">Gerar</span>
                </Button>
              )}
              <Button 
                onClick={() => activeTab === 'passwords' ? setFormOpen(true) : setCryptoFormOpen(true)} 
                size="sm" 
                className="gap-1.5 h-10 px-3 sm:px-4"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden xs:inline">{activeTab === 'passwords' ? 'Nova' : 'Carteira'}</span>
              </Button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 p-1 bg-muted/50 rounded-lg mb-3">
            <button
              onClick={() => setActiveTab('passwords')}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-md text-sm font-medium transition-all tracking-tight",
                activeTab === 'passwords'
                  ? "bg-background text-foreground border border-border"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <KeyRound className="w-4 h-4" />
              <span>Senhas</span>
              {passwords.length > 0 && (
                <span className="inline-flex items-center justify-center min-w-[22px] h-5 px-1.5 text-xs bg-muted rounded-full font-medium tabular-nums">
                  {passwords.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('crypto')}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-md text-sm font-medium transition-all tracking-tight",
                activeTab === 'crypto'
                  ? "bg-background text-foreground border border-border"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Bitcoin className="w-4 h-4" />
              <span>Crypto</span>
              {cryptoKeys.length > 0 && (
                <span className="inline-flex items-center justify-center min-w-[22px] h-5 px-1.5 text-xs bg-muted rounded-full font-medium tabular-nums">
                  {cryptoKeys.length}
                </span>
              )}
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/60 pointer-events-none" />
            <Input 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
              placeholder={activeTab === 'passwords' ? "Buscar senhas..." : "Buscar carteiras..."} 
              className="pl-11 h-11 sm:h-12 text-base bg-muted/40 border-transparent focus:border-border focus:bg-background" 
            />
          </div>
        </div>
      </header>

      <main className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-5 sm:py-6 pb-24">
        <AnimatePresence mode="wait" initial={false}>
          {loading ? (
            <motion.div 
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-start"
            >
              {activeTab === 'passwords' ? (
                Array.from({ length: 6 }).map((_, i) => <PasswordCardSkeleton key={i} />)
              ) : (
                Array.from({ length: 6 }).map((_, i) => <CryptoCardSkeleton key={i} />)
              )}
            </motion.div>
          ) : activeTab === 'passwords' ? (
            <motion.div
              key="passwords-tab"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            >
              {filteredPasswords.length === 0 ? (
                <div className="text-center py-16 sm:py-20 px-4">
                  <motion.div 
                    className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-5"
                    initial={{ scale: 0.9 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                  >
                    <Shield className="w-8 h-8 sm:w-10 sm:h-10 text-muted-foreground" />
                  </motion.div>
                  <h2 className="font-semibold text-foreground text-lg sm:text-xl mb-2">
                    {search ? 'Nenhum resultado encontrado' : 'Nenhuma senha salva'}
                  </h2>
                  <p className="text-base text-muted-foreground mb-6 max-w-xs mx-auto text-balance">
                    {search ? 'Tente buscar por outro termo' : 'Adicione sua primeira senha para começar'}
                  </p>
                  {!search && (
                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                      <Button onClick={() => setFormOpen(true)} variant="outline" className="gap-2 h-11">
                        <Plus className="w-4 h-4" />
                        Adicionar senha
                      </Button>
                    </motion.div>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
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
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            >
              {filteredCryptoKeys.length === 0 ? (
                <div className="text-center py-16 sm:py-20 px-4">
                  <motion.div 
                    className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-5"
                    initial={{ scale: 0.9 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                  >
                    <Bitcoin className="w-8 h-8 sm:w-10 sm:h-10 text-muted-foreground" />
                  </motion.div>
                  <h2 className="font-semibold text-foreground text-lg sm:text-xl mb-2">
                    {search ? 'Nenhum resultado encontrado' : 'Nenhuma carteira salva'}
                  </h2>
                  <p className="text-base text-muted-foreground mb-6 max-w-xs mx-auto text-balance">
                    {search ? 'Tente buscar por outro termo' : 'Adicione sua primeira carteira crypto'}
                  </p>
                  {!search && (
                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                      <Button onClick={() => setCryptoFormOpen(true)} variant="outline" className="gap-2 h-11">
                        <Plus className="w-4 h-4" />
                        Adicionar carteira
                      </Button>
                    </motion.div>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
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

      <footer className="fixed bottom-0 left-0 right-0 bg-background/80 backdrop-blur-lg border-t border-border safe-area-inset">
        <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground tracking-tight">
            <Shield className="w-4 h-4" />
            <span className="hidden xs:inline">Criptografia AES-256</span>
            <span className="xs:hidden">AES-256</span>
          </div>
          
          <motion.div 
            className={cn(
              "flex items-center gap-1.5 text-xs sm:text-sm px-3 py-1.5 rounded-full transition-colors tracking-tight",
              isExpiringSoon 
                ? "bg-destructive/10 text-destructive" 
                : "bg-muted text-muted-foreground"
            )}
            animate={isExpiringSoon ? { scale: [1, 1.02, 1] } : {}}
            transition={{ repeat: isExpiringSoon ? Infinity : 0, duration: 1 }}
          >
            <Timer className="w-4 h-4" />
            <span className="font-mono font-medium">{formattedTime}</span>
          </motion.div>
        </div>
      </footer>

      <PasswordForm 
        open={formOpen} 
        onClose={() => { setFormOpen(false); setEditingPassword(null); }} 
        onSave={handleSave} 
        initialData={editingPassword || undefined} 
      />
      <CryptoKeyForm
        open={cryptoFormOpen}
        onClose={() => { setCryptoFormOpen(false); setEditingCryptoKey(null); }}
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
        onCancel={() => { setPinVerifyOpen(false); setPendingAction(null); }} 
        title="Verificar identidade" 
        description="Digite seu PIN para continuar" 
      />
    </div>
  );
}