import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { VaultProvider, useVault } from '@/contexts/VaultContext';
import { LockScreen } from '@/components/LockScreen';
import { PasswordVault } from '@/components/PasswordVault';
import { enableDevtoolsProtection } from '@/lib/security';

const pageTransition = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.25, ease: [0.22, 1, 0.36, 1] as const }
};

function VaultApp() {
  const { state } = useVault();

  // Enable devtools protection on mount
  useEffect(() => {
    const cleanup = enableDevtoolsProtection();
    return cleanup;
  }, []);

  if (state === 'loading') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const isLocked = state === 'setup' || state === 'locked' || state === 'show-recovery';

  return (
    <AnimatePresence mode="wait">
      {isLocked ? (
        <motion.div key="lock" {...pageTransition}>
          <LockScreen />
        </motion.div>
      ) : (
        <motion.div key="vault" {...pageTransition}>
          <PasswordVault />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

const Index = () => {
  return (
    <VaultProvider>
      <VaultApp />
    </VaultProvider>
  );
};

export default Index;
