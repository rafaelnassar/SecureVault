import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SuccessCheckProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function SuccessCheck({ size = 'md', className }: SuccessCheckProps) {
  const sizeConfig = {
    sm: { container: 'w-10 h-10', icon: 'w-5 h-5' },
    md: { container: 'w-14 h-14', icon: 'w-7 h-7' },
    lg: { container: 'w-20 h-20', icon: 'w-10 h-10' },
  };

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ 
        type: 'spring', 
        stiffness: 400, 
        damping: 15 
      }}
      className={cn(
        sizeConfig[size].container,
        "rounded-full bg-success/10 flex items-center justify-center mx-auto",
        className
      )}
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ 
          type: 'spring', 
          stiffness: 500, 
          damping: 20,
          delay: 0.1 
        }}
      >
        <Check className={cn(sizeConfig[size].icon, "text-success")} />
      </motion.div>
    </motion.div>
  );
}
