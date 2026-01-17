import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, RefreshCw, Globe, User, Lock, Check, ShieldAlert, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Modal } from './Modal';
import { PasswordBreachIndicator } from './PasswordBreachIndicator';
import { usePasswordBreachCheck } from '@/hooks/usePasswordBreachCheck';
import { passwordEntrySchema } from '@/lib/security';

interface PasswordFormProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: { site: string; login?: string; password: string; isSensitive?: boolean }) => void;
  initialData?: {
    id: string;
    site: string;
    login?: string;
    password: string;
    isSensitive?: boolean;
  };
}

interface FormErrors {
  site?: string;
  login?: string;
  password?: string;
}

export function PasswordForm({ open, onClose, onSave, initialData }: PasswordFormProps) {
  const [site, setSite] = useState('');
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSensitive, setIsSensitive] = useState(false);
  const [saved, setSaved] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  
  const breachResult = usePasswordBreachCheck(password);

  useEffect(() => {
    if (initialData) {
      setSite(initialData.site);
      setLogin(initialData.login || '');
      setPassword(initialData.password);
      setIsSensitive(initialData.isSensitive || false);
    } else {
      setSite('');
      setLogin('');
      setPassword('');
      setIsSensitive(false);
    }
    setSaved(false);
    setErrors({});
  }, [initialData, open]);

  const generatePassword = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    const array = new Uint32Array(16);
    crypto.getRandomValues(array);
    let result = '';
    for (let i = 0; i < 16; i++) {
      result += chars.charAt(array[i] % chars.length);
    }
    setPassword(result);
    setShowPassword(true);
    setErrors(prev => ({ ...prev, password: undefined }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate with Zod schema
    const validation = passwordEntrySchema.safeParse({
      site: site.trim(),
      login: login.trim() || undefined,
      password: password.trim(),
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
    
    setTimeout(() => {
      onSave({
        site: site.trim(),
        login: login.trim() || undefined,
        password: password.trim(),
        isSensitive: isSensitive || undefined,
      });
      onClose();
    }, 600);
  };

  return (
    <Modal 
      open={open} 
      onClose={onClose} 
      title={initialData ? 'Editar senha' : 'Nova senha'}
      maxWidth="md"
    >
      <AnimatePresence mode="wait">
        {saved ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="py-12 text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 400, damping: 15 }}
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-5"
            >
              <Check className="w-10 h-10 sm:w-12 sm:h-12 text-success" />
            </motion.div>
            <p className="text-lg sm:text-xl font-medium text-foreground">
              {initialData ? 'Senha atualizada!' : 'Senha adicionada!'}
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
            {/* Site */}
            <div className="space-y-2">
              <Label htmlFor="site" className="text-sm font-medium">
                Site
              </Label>
              <div className="relative">
                <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/60" />
                <Input
                  id="site"
                  value={site}
                  onChange={(e) => {
                    setSite(e.target.value);
                    setErrors(prev => ({ ...prev, site: undefined }));
                  }}
                  placeholder="exemplo.com"
                  className={`pl-12 ${errors.site ? 'border-destructive' : ''}`}
                  required
                />
              </div>
              {errors.site && (
                <p className="text-destructive text-sm flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {errors.site}
                </p>
              )}
            </div>
            
            {/* Login */}
            <div className="space-y-2">
              <Label htmlFor="login" className="text-sm font-medium">
                Login <span className="text-muted-foreground font-normal">(opcional)</span>
              </Label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/60" />
                <Input
                  id="login"
                  value={login}
                  onChange={(e) => {
                    setLogin(e.target.value);
                    setErrors(prev => ({ ...prev, login: undefined }));
                  }}
                  placeholder="email@exemplo.com"
                  className={`pl-12 ${errors.login ? 'border-destructive' : ''}`}
                />
              </div>
              {errors.login && (
                <p className="text-destructive text-sm flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {errors.login}
                </p>
              )}
            </div>
            
            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">
                Senha
              </Label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/60" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setErrors(prev => ({ ...prev, password: undefined }));
                  }}
                  placeholder="••••••••"
                  className={`pl-12 pr-24 font-mono ${errors.password ? 'border-destructive' : ''}`}
                  required
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowPassword(!showPassword)}
                    className="h-9 w-9"
                    data-size="icon"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={generatePassword}
                    className="h-9 w-9"
                    title="Gerar senha"
                    data-size="icon"
                  >
                    <RefreshCw className="w-5 h-5" />
                  </Button>
                </div>
              </div>
              {errors.password && (
                <p className="text-destructive text-sm flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {errors.password}
                </p>
              )}
              
              <PasswordBreachIndicator 
                status={breachResult.status} 
                count={breachResult.count} 
              />
            </div>

            {/* Sensitive content toggle */}
            <div className="flex items-center justify-between p-4 bg-muted/40 rounded-xl border border-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                  <ShieldAlert className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <p className="text-base font-medium text-foreground tracking-tight">Conteúdo sensível</p>
                  <p className="text-sm text-muted-foreground">Oculta o card por padrão</p>
                </div>
              </div>
              <Switch
                checked={isSensitive}
                onCheckedChange={setIsSensitive}
              />
            </div>
            
            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" onClick={onClose} className="flex-1">
                Cancelar
              </Button>
              <Button type="submit" className="flex-1">
                {initialData ? 'Salvar' : 'Adicionar'}
              </Button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
    </Modal>
  );
}
