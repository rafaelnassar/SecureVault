import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, ShieldAlert, Loader2, AlertTriangle, Sparkles } from 'lucide-react';
import { BreachStatus } from '@/hooks/usePasswordBreachCheck';

interface PasswordBreachIndicatorProps {
  status: BreachStatus;
  count: number;
}

export function PasswordBreachIndicator({ status, count }: PasswordBreachIndicatorProps) {
  if (status === 'idle') return null;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={status}
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
        transition={{ duration: 0.2 }}
        className="mt-4 overflow-hidden"
      >
        {status === 'loading' && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>Verificando vazamentos...</span>
          </div>
        )}

        {status === 'safe' && (
          <motion.div 
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            className="flex items-center gap-3 text-sm bg-success/10 border border-success/20 px-4 py-3 rounded-xl"
          >
            <div className="w-8 h-8 rounded-full bg-success/20 flex items-center justify-center flex-shrink-0">
              <ShieldCheck className="w-4 h-4 text-success" />
            </div>
            <div>
              <p className="font-medium text-success">Senha segura!</p>
              <p className="text-xs text-success/80">Não encontrada em vazamentos conhecidos.</p>
            </div>
          </motion.div>
        )}

        {status === 'breached' && (
          <motion.div 
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            className="bg-destructive/10 border border-destructive/20 rounded-xl overflow-hidden"
          >
            <div className="flex items-start gap-3 px-4 py-3">
              <div className="w-8 h-8 rounded-full bg-destructive/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <ShieldAlert className="w-4 h-4 text-destructive" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-destructive">Senha comprometida!</p>
                <p className="text-xs text-destructive/80 mt-0.5">
                  Encontrada em <strong>{count.toLocaleString('pt-BR')}</strong> vazamentos de dados.
                </p>
              </div>
            </div>
            <div className="bg-destructive/5 px-4 py-2.5 border-t border-destructive/10">
              <div className="flex items-center gap-2 text-xs text-destructive/90">
                <Sparkles className="w-3.5 h-3.5 flex-shrink-0" />
                <span>Use o <strong>Gerador de Senhas</strong> para criar uma senha segura.</span>
              </div>
            </div>
          </motion.div>
        )}

        {status === 'error' && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Não foi possível verificar a senha.</span>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}