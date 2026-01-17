import { motion, AnimatePresence } from 'framer-motion';
import { VaultProvider, useVault } from '@/contexts/VaultContext';
import { LockScreen } from '@/components/LockScreen';
import { PasswordVault } from '@/components/PasswordVault';

const pageTransition = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -12 },
  transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] as const }
};

function VaultApp() {
  const { state } = useVault();

  // DevTools protection is now handled in main.tsx before app renders

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
