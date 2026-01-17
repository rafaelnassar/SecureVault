import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { ShieldX } from 'lucide-react';

interface WipeCountdownProps {
  onComplete: () => void;
  initialCount?: number;
}

/**
 * Componente de contagem regressiva para wipe de dados.
 * Renderizado via portal para garantir que fique sobre todo o conteúdo.
 * Reutilizado em: LockScreen, RecoveryWordsInput, SettingsModal
 */
export function WipeCountdown({ onComplete, initialCount = 5 }: WipeCountdownProps) {
  const [countdown, setCountdown] = useState(initialCount);
  const countdownRef = useRef<number | null>(null);

  useEffect(() => {
    if (countdown > 0) {
      countdownRef.current = window.setTimeout(() => {
        setCountdown(c => c - 1);
      }, 1000);
      return () => {
        if (countdownRef.current) clearTimeout(countdownRef.current);
      };
    } else {
      onComplete();
    }
  }, [countdown, onComplete]);

  return createPortal(
    <div className="fixed inset-0 z-[9999] bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-sm text-center px-4"
      >
        <motion.div
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ repeat: Infinity, duration: 1 }}
          className="inline-flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-destructive/10 mb-6"
        >
          <ShieldX className="w-10 h-10 sm:w-12 sm:h-12 text-destructive" />
        </motion.div>
        
        <h1 className="text-2xl sm:text-3xl font-semibold text-destructive mb-3">
          Limite de tentativas excedido
        </h1>
        <p className="text-muted-foreground text-base mb-6 text-balance">
          Por segurança, todos os dados serão apagados.
        </p>
        
        <motion.div
          key={countdown}
          initial={{ scale: 1.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-5xl sm:text-6xl font-bold text-destructive mb-6"
        >
          {countdown}
        </motion.div>
        
        <p className="text-sm text-muted-foreground">
          Esta ação não pode ser interrompida.
        </p>
      </motion.div>
    </div>,
    document.body
  );
}
