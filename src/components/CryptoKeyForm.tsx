import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, Wallet, User, Key, FileText, Check, Plus, X } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { sanitizeText } from '@/lib/security';
import { cn } from '@/lib/utils';

interface CryptoKeyFormProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: CryptoKeyData) => Promise<void>;
  initialData?: CryptoKeyData;
}

export interface CryptoKeyData {
  id?: string;
  name: string;
  login?: string;
  walletAddress: string;
  privateKey?: string;
  seedPhrase?: string;
  recoveryWords?: string[];
  notes?: string;
}

type RecoveryType = 'none' | 'phrase' | 'words';

export function CryptoKeyForm({ open, onClose, onSave, initialData }: CryptoKeyFormProps) {
  const [name, setName] = useState('');
  const [login, setLogin] = useState('');
  const [walletAddress, setWalletAddress] = useState('');
  const [privateKey, setPrivateKey] = useState('');
  const [seedPhrase, setSeedPhrase] = useState('');
  const [recoveryWords, setRecoveryWords] = useState<string[]>([]);
  const [recoveryType, setRecoveryType] = useState<RecoveryType>('none');
  const [notes, setNotes] = useState('');
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [showSeedPhrase, setShowSeedPhrase] = useState(false);
  const [showRecoveryWords, setShowRecoveryWords] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setLogin(initialData.login || '');
      setWalletAddress(initialData.walletAddress);
      setPrivateKey(initialData.privateKey || '');
      setSeedPhrase(initialData.seedPhrase || '');
      setRecoveryWords(initialData.recoveryWords || []);
      setNotes(initialData.notes || '');
      
      // Determine recovery type from data
      if (initialData.recoveryWords && initialData.recoveryWords.length > 0) {
        setRecoveryType('words');
      } else if (initialData.seedPhrase) {
        setRecoveryType('phrase');
      } else {
        setRecoveryType('none');
      }
    } else {
      setName('');
      setLogin('');
      setWalletAddress('');
      setPrivateKey('');
      setSeedPhrase('');
      setRecoveryWords([]);
      setRecoveryType('none');
      setNotes('');
    }
    setShowPrivateKey(false);
    setShowSeedPhrase(false);
    setShowRecoveryWords(false);
    setSaved(false);
  }, [initialData, open]);

  const handleAddRecoveryWord = () => {
    setRecoveryWords([...recoveryWords, '']);
  };

  const handleRemoveRecoveryWord = (index: number) => {
    const newWords = recoveryWords.filter((_, i) => i !== index);
    setRecoveryWords(newWords);
    if (newWords.length === 0) {
      setRecoveryType('none');
    }
  };

  const handleRecoveryWordChange = (index: number, value: string) => {
    const newWords = [...recoveryWords];
    newWords[index] = value;
    setRecoveryWords(newWords);
  };

  const handleRecoveryTypeChange = (type: RecoveryType) => {
    setRecoveryType(type);
    if (type === 'phrase') {
      setRecoveryWords([]);
    } else if (type === 'words') {
      setSeedPhrase('');
      if (recoveryWords.length === 0) {
        setRecoveryWords(['']);
      }
    } else {
      setSeedPhrase('');
      setRecoveryWords([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const safeName = sanitizeText(name.trim());
    const safeAddress = sanitizeText(walletAddress.trim());
    
    if (!safeName || !safeAddress) return;

    setSaved(true);
    setLoading(true);

    try {
      const validRecoveryWords = recoveryWords.filter(w => w.trim() !== '');
      
      await onSave({
        id: initialData?.id,
        name: safeName,
        login: login.trim() || undefined,
        walletAddress: safeAddress,
        privateKey: privateKey.trim() || undefined,
        seedPhrase: recoveryType === 'phrase' ? seedPhrase.trim() || undefined : undefined,
        recoveryWords: recoveryType === 'words' && validRecoveryWords.length > 0 ? validRecoveryWords : undefined,
        notes: notes.trim() || undefined,
      });
      
      setTimeout(() => {
        onClose();
      }, 600);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal 
      open={open} 
      onClose={onClose} 
      title={initialData ? 'Editar carteira' : 'Nova carteira'}
      scrollable
    >
      <AnimatePresence mode="wait">
        {saved ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="py-8 text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 400, damping: 15 }}
              className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4"
            >
              <Check className="w-8 h-8 text-success" />
            </motion.div>
            <p className="text-base font-medium text-foreground">
              {initialData ? 'Carteira atualizada!' : 'Carteira adicionada!'}
            </p>
          </motion.div>
        ) : (
          <motion.form 
            key="form"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onSubmit={handleSubmit} 
            className="space-y-4"
          >
            {/* Nome da carteira */}
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-xs font-medium">
                Nome da carteira
              </Label>
              <div className="relative">
                <Wallet className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Carteira principal"
                  className="pl-10 h-11"
                  required
                />
              </div>
            </div>

            {/* Login */}
            <div className="space-y-1.5">
              <Label htmlFor="login" className="text-xs font-medium text-muted-foreground">
                Login (opcional)
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="login"
                  value={login}
                  onChange={(e) => setLogin(e.target.value)}
                  placeholder="email ou usuário"
                  className="pl-10 h-11"
                />
              </div>
            </div>

            {/* Endereço da carteira */}
            <div className="space-y-1.5">
              <Label htmlFor="walletAddress" className="text-xs font-medium">
                Endereço da carteira
              </Label>
              <Input
                id="walletAddress"
                value={walletAddress}
                onChange={(e) => setWalletAddress(e.target.value)}
                placeholder="bc1q... ou 0x..."
                className="h-11 font-mono text-sm"
                required
              />
            </div>

            {/* Chave privada */}
            <div className="space-y-1.5">
              <Label htmlFor="privateKey" className="text-xs font-medium text-muted-foreground">
                Chave privada (opcional)
              </Label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="privateKey"
                  type={showPrivateKey ? 'text' : 'password'}
                  value={privateKey}
                  onChange={(e) => setPrivateKey(e.target.value)}
                  placeholder="••••••••••••••••"
                  className="pl-10 pr-11 h-11 font-mono text-sm"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowPrivateKey(!showPrivateKey)}
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-9 w-9"
                >
                  {showPrivateKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            {/* Tipo de Recuperação */}
            <div className="space-y-3">
              <Label className="text-xs font-medium text-muted-foreground">
                Recuperação (opcional)
              </Label>
              
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleRecoveryTypeChange('none')}
                  className={cn(
                    "flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all border",
                    recoveryType === 'none'
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted/50 text-muted-foreground border-border hover:bg-muted"
                  )}
                >
                  Nenhum
                </button>
                <button
                  type="button"
                  onClick={() => handleRecoveryTypeChange('phrase')}
                  className={cn(
                    "flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all border",
                    recoveryType === 'phrase'
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted/50 text-muted-foreground border-border hover:bg-muted"
                  )}
                >
                  Frase
                </button>
                <button
                  type="button"
                  onClick={() => handleRecoveryTypeChange('words')}
                  className={cn(
                    "flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all border",
                    recoveryType === 'words'
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted/50 text-muted-foreground border-border hover:bg-muted"
                  )}
                >
                  Palavras
                </button>
              </div>

              {/* Frase de recuperação */}
              <AnimatePresence mode="wait">
                {recoveryType === 'phrase' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="relative pt-1">
                      <Textarea
                        value={seedPhrase}
                        onChange={(e) => setSeedPhrase(e.target.value)}
                        placeholder="palavra1 palavra2 palavra3..."
                        className={cn(
                          "min-h-[80px] pr-11 font-mono text-sm resize-none",
                          !showSeedPhrase && "text-security-disc"
                        )}
                        style={!showSeedPhrase ? { WebkitTextSecurity: 'disc' } as React.CSSProperties : undefined}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => setShowSeedPhrase(!showSeedPhrase)}
                        className="absolute right-1 top-2 h-9 w-9"
                      >
                        {showSeedPhrase ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                    </div>
                  </motion.div>
                )}

                {/* Palavras de recuperação */}
                {recoveryType === 'words' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="space-y-2 pt-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-muted-foreground">
                          {recoveryWords.length} palavra{recoveryWords.length !== 1 ? 's' : ''}
                        </span>
                        <div className="flex gap-1">
                          {recoveryWords.length > 0 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setShowRecoveryWords(!showRecoveryWords)}
                              className="h-7 px-2 gap-1 text-xs"
                            >
                              {showRecoveryWords ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                              {showRecoveryWords ? 'Ocultar' : 'Mostrar'}
                            </Button>
                          )}
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleAddRecoveryWord}
                            className="h-7 px-2 gap-1 text-xs"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                      
                      <div className="space-y-1.5">
                        {recoveryWords.map((word, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground w-5 text-right font-mono tabular-nums">
                              {index + 1}.
                            </span>
                            <Input
                              type={showRecoveryWords ? 'text' : 'password'}
                              value={word}
                              onChange={(e) => handleRecoveryWordChange(index, e.target.value)}
                              placeholder="palavra"
                              className="flex-1 h-9 font-mono text-sm"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveRecoveryWord(index)}
                              className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            >
                              <X className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Notas */}
            <div className="space-y-1.5">
              <Label htmlFor="notes" className="text-xs font-medium text-muted-foreground">
                Notas (opcional)
              </Label>
              <div className="relative">
                <FileText className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Anotações adicionais..."
                  className="min-h-[60px] pl-10 text-sm resize-none"
                />
              </div>
            </div>

            {/* Botões */}
            <div className="flex gap-3 pt-3">
              <Button type="button" variant="outline" onClick={onClose} className="flex-1 h-11" disabled={loading}>
                Cancelar
              </Button>
              <Button type="submit" className="flex-1 h-11" disabled={!name.trim() || !walletAddress.trim() || loading}>
                {initialData ? 'Salvar' : 'Adicionar'}
              </Button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
    </Modal>
  );
}
