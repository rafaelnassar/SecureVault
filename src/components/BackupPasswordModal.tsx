import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Eye, EyeOff, Shield, AlertTriangle } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

interface BackupPasswordModalProps {
  open: boolean;
  mode: 'export' | 'import';
  onConfirm: (password: string | null) => void;
  onCancel: () => void;
  loading?: boolean;
  error?: string | null;
}

export function BackupPasswordModal({ 
  open, 
  mode, 
  onConfirm, 
  onCancel, 
  loading = false,
  error = null 
}: BackupPasswordModalProps) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [useEncryption, setUseEncryption] = useState(false);

  const isExport = mode === 'export';
  const minLength = 4;
  const isPasswordValid = password.length >= minLength;
  const passwordsMatch = password === confirmPassword;
  const canConfirm = isExport 
    ? (!useEncryption || (isPasswordValid && passwordsMatch))
    : isPasswordValid;

  const handleConfirm = () => {
    if (isExport && !useEncryption) {
      onConfirm(null);
    } else {
      onConfirm(password);
    }
  };

  const handleClose = () => {
    setPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setUseEncryption(false);
    onCancel();
  };

  return (
    <Modal open={open} onClose={handleClose} maxWidth="sm">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        {/* Header */}
        <div className="flex flex-col items-center text-center">
          <motion.div
            className={cn(
              "w-14 h-14 rounded-2xl flex items-center justify-center mb-4",
              isExport ? "bg-primary/10" : "bg-amber-500/10"
            )}
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
          >
            {isExport ? (
              <Shield className="w-7 h-7 text-primary" />
            ) : (
              <Lock className="w-7 h-7 text-amber-500" />
            )}
          </motion.div>
          <h3 className="text-lg font-semibold text-foreground mb-1">
            {isExport ? 'Proteger Backup' : 'Backup Protegido'}
          </h3>
          <p className="text-sm text-muted-foreground">
            {isExport 
              ? 'Adicione uma senha extra para proteger o arquivo de backup'
              : 'Este backup está protegido com senha adicional'
            }
          </p>
        </div>

        {/* Export: Toggle encryption */}
        {isExport && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between p-4 rounded-xl bg-muted/50 border border-border"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <Lock className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Criptografar backup</p>
                <p className="text-xs text-muted-foreground">Proteção adicional com senha</p>
              </div>
            </div>
            <Switch
              checked={useEncryption}
              onCheckedChange={setUseEncryption}
              disabled={loading}
            />
          </motion.div>
        )}

        {/* Password fields */}
        <AnimatePresence mode="wait">
          {(isExport ? useEncryption : true) && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="backup-password" className="text-sm">
                  {isExport ? 'Senha do backup' : 'Digite a senha do backup'}
                </Label>
                <div className="relative">
                  <Input
                    id="backup-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 4 caracteres"
                    className="pr-10"
                    disabled={loading}
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {isExport && (
                <div className="space-y-2">
                  <Label htmlFor="confirm-password" className="text-sm">
                    Confirmar senha
                  </Label>
                  <Input
                    id="confirm-password"
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Digite novamente"
                    disabled={loading}
                  />
                  {confirmPassword.length > 0 && !passwordsMatch && (
                    <p className="text-xs text-destructive">As senhas não coincidem</p>
                  )}
                </div>
              )}

              {/* Warning for export */}
              {isExport && useEncryption && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-start gap-3 p-3 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400"
                >
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <p className="text-xs">
                    <strong>Importante:</strong> Se você esquecer esta senha, não será possível restaurar o backup.
                  </p>
                </motion.div>
              )}

              {/* Error message */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-2 text-destructive text-sm"
                  >
                    <AlertTriangle className="w-4 h-4" />
                    {error}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Actions */}
        <div className="flex gap-3">
          <Button variant="outline" onClick={handleClose} className="flex-1" disabled={loading}>
            Cancelar
          </Button>
          <Button 
            onClick={handleConfirm} 
            className="flex-1"
            disabled={!canConfirm || loading}
          >
            {loading ? 'Processando...' : isExport ? 'Exportar' : 'Importar'}
          </Button>
        </div>
      </motion.div>
    </Modal>
  );
}
