import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, Wallet, User, Key, FileText, Check, Plus, X, AlertCircle } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cryptoKeySchema, sanitizeText } from '@/lib/security';
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

interface FormErrors {
  name?: string;
  walletAddress?: string;
  privateKey?: string;
  seedPhrase?: string;
  notes?: string;
}

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
  const [errors, setErrors] = useState<FormErrors>({});

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
    setErrors({});
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
    
    // Validate with Zod schema
    const validation = cryptoKeySchema.safeParse({
      name: safeName,
      network: 'crypto', // Default network
      walletAddress: safeAddress,
      privateKey: privateKey.trim() || undefined,
      seedPhrase: recoveryType === 'phrase' ? seedPhrase.trim() || undefined : undefined,
      notes: notes.trim() || undefined,
    });
    
    if (!validation.success) {
      const newErrors: FormErrors = {};
      validation.error.errors.forEach(err => {
        const field = err.path[0] as keyof FormErrors;
        newErrors[field] = err.message;
      });
      setErrors(newErrors);
      return;
    }

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
      maxWidth="md"
      scrollable
    >
      <AnimatePresence mode="wait">
        {saved ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="py-10 text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 400, damping: 15 }}
              className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-5"
            >
              <Check className="w-10 h-10 text-success" />
            </motion.div>
            <p className="text-lg font-medium text-foreground">
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
            className="space-y-5"
          >
            {/* Nome da carteira */}
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium">
                Nome da carteira
              </Label>
              <div className="relative">
                <Wallet className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setErrors(prev => ({ ...prev, name: undefined }));
                  }}
                  placeholder="Ex: Carteira principal"
                  className={`pl-12 ${errors.name ? 'border-destructive' : ''}`}
                  required
                />
              </div>
              {errors.name && (
                <p className="text-destructive text-sm flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {errors.name}
                </p>
              )}
            </div>

            {/* Login */}
            <div className="space-y-2">
              <Label htmlFor="login" className="text-sm font-medium text-muted-foreground">
                Login (opcional)
              </Label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="login"
                  value={login}
                  onChange={(e) => setLogin(e.target.value)}
                  placeholder="email ou usuário"
                  className="pl-12"
                />
              </div>
            </div>

            {/* Endereço da carteira */}
            <div className="space-y-2">
              <Label htmlFor="walletAddress" className="text-sm font-medium">
                Endereço da carteira
              </Label>
              <Input
                id="walletAddress"
                value={walletAddress}
                onChange={(e) => {
                  setWalletAddress(e.target.value);
                  setErrors(prev => ({ ...prev, walletAddress: undefined }));
                }}
                placeholder="bc1q... ou 0x..."
                className={`font-mono ${errors.walletAddress ? 'border-destructive' : ''}`}
                required
              />
              {errors.walletAddress && (
                <p className="text-destructive text-sm flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {errors.walletAddress}
                </p>
              )}
            </div>

            {/* Chave privada */}
            <div className="space-y-2">
              <Label htmlFor="privateKey" className="text-sm font-medium text-muted-foreground">
                Chave privada (opcional)
              </Label>
              <div className="relative">
                <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="privateKey"
                  type={showPrivateKey ? 'text' : 'password'}
                  value={privateKey}
                  onChange={(e) => setPrivateKey(e.target.value)}
                  placeholder="••••••••••••••••"
                  className="pl-12 pr-12 font-mono"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowPrivateKey(!showPrivateKey)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-9 w-9"
                  data-size="icon"
                >
                  {showPrivateKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </Button>
              </div>
            </div>

            {/* Tipo de Recuperação */}
            <div className="space-y-3">
              <Label className="text-sm font-medium text-muted-foreground">
                Recuperação (opcional)
              </Label>
              
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleRecoveryTypeChange('none')}
                  className={cn(
                    "flex-1 py-3 px-3 rounded-lg text-sm font-medium transition-all border",
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
                    "flex-1 py-3 px-3 rounded-lg text-sm font-medium transition-all border",
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
                    "flex-1 py-3 px-3 rounded-lg text-sm font-medium transition-all border",
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
                    <div className="relative pt-2">
                      <Textarea
                        value={seedPhrase}
                        onChange={(e) => setSeedPhrase(e.target.value)}
                        placeholder="palavra1 palavra2 palavra3..."
                        className={cn(
                          "min-h-[100px] pr-12 font-mono",
                          !showSeedPhrase && "text-security-disc"
                        )}
                        style={!showSeedPhrase ? { WebkitTextSecurity: 'disc' } as React.CSSProperties : undefined}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => setShowSeedPhrase(!showSeedPhrase)}
                        className="absolute right-2 top-4 h-9 w-9"
                        data-size="icon"
                      >
                        {showSeedPhrase ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
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
                    <div className="space-y-3 pt-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">
                          {recoveryWords.length} palavra{recoveryWords.length !== 1 ? 's' : ''}
                        </span>
                        <div className="flex gap-2">
                          {recoveryWords.length > 0 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setShowRecoveryWords(!showRecoveryWords)}
                              className="h-9 px-3 gap-2 text-sm"
                            >
                              {showRecoveryWords ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              {showRecoveryWords ? 'Ocultar' : 'Mostrar'}
                            </Button>
                          )}
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleAddRecoveryWord}
                            className="h-9 px-3 gap-2 text-sm"
                          >
                            <Plus className="w-4 h-4" />
                            Adicionar
                          </Button>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        {recoveryWords.map((word, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground w-6 text-right font-mono tabular-nums">
                              {index + 1}.
                            </span>
                            <Input
                              type={showRecoveryWords ? 'text' : 'password'}
                              value={word}
                              onChange={(e) => handleRecoveryWordChange(index, e.target.value)}
                              placeholder="palavra"
                              className="flex-1 font-mono h-11"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveRecoveryWord(index)}
                              className="h-9 w-9 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                              data-size="icon"
                            >
                              <X className="w-4 h-4" />
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
            <div className="space-y-2">
              <Label htmlFor="notes" className="text-sm font-medium text-muted-foreground">
                Notas (opcional)
              </Label>
              <div className="relative">
                <FileText className="absolute left-4 top-4 w-5 h-5 text-muted-foreground" />
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Anotações adicionais..."
                  className="min-h-[80px] pl-12"
                />
              </div>
            </div>

            {/* Botões */}
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" onClick={onClose} className="flex-1" disabled={loading}>
                Cancelar
              </Button>
              <Button type="submit" className="flex-1" disabled={!name.trim() || !walletAddress.trim() || loading}>
                {initialData ? 'Salvar' : 'Adicionar'}
              </Button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
    </Modal>
  );
}
