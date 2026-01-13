import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, RefreshCw, Globe, User, Lock, Check, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Modal } from './Modal';
import { PasswordBreachIndicator } from './PasswordBreachIndicator';
import { usePasswordBreachCheck } from '@/hooks/usePasswordBreachCheck';

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

export function PasswordForm({ open, onClose, onSave, initialData }: PasswordFormProps) {
  const [site, setSite] = useState('');
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSensitive, setIsSensitive] = useState(false);
  const [saved, setSaved] = useState(false);
  
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
  }, [initialData, open]);

  const generatePassword = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let result = '';
    for (let i = 0; i < 16; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(result);
    setShowPassword(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!site.trim() || !password.trim()) return;
    
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
            <div className="space-y-2">
              <Label htmlFor="site" className="text-sm font-medium tracking-tight">
                Site
              </Label>
              <div className="relative">
                <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/60" />
                <Input
                  id="site"
                  value={site}
                  onChange={(e) => setSite(e.target.value)}
                  placeholder="exemplo.com"
                  className="pl-11 h-12 text-base"
                  required
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="login" className="text-sm font-medium tracking-tight">
                Login <span className="text-muted-foreground font-normal">(opcional)</span>
              </Label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/60" />
                <Input
                  id="login"
                  value={login}
                  onChange={(e) => setLogin(e.target.value)}
                  placeholder="email@exemplo.com"
                  className="pl-11 h-12 text-base"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium tracking-tight">
                Senha
              </Label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/60" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pl-11 pr-24 h-12 font-mono text-base"
                  required
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowPassword(!showPassword)}
                    className="h-9 w-9"
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
                  >
                    <RefreshCw className="w-5 h-5" />
                  </Button>
                </div>
              </div>
              
              <PasswordBreachIndicator 
                status={breachResult.status} 
                count={breachResult.count} 
              />
            </div>

            {/* Sensitive content toggle */}
            <div className="flex items-center justify-between p-3 bg-muted/40 rounded-lg border border-border">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <ShieldAlert className="w-4 h-4 text-amber-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground tracking-tight">Conteúdo sensível</p>
                  <p className="text-[11px] text-muted-foreground">Oculta o card por padrão</p>
                </div>
              </div>
              <Switch
                checked={isSensitive}
                onCheckedChange={setIsSensitive}
              />
            </div>
            
            <div className="flex gap-3 pt-3">
              <Button type="button" variant="outline" onClick={onClose} className="flex-1 h-12">
                Cancelar
              </Button>
              <Button type="submit" className="flex-1 h-12">
                {initialData ? 'Salvar' : 'Adicionar'}
              </Button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
    </Modal>
  );
}
