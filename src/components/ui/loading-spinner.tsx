import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function LoadingSpinner({ size = 'md', className }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4 border',
    md: 'w-6 h-6 border-2',
    lg: 'w-8 h-8 border-2',
  };

  return (
    <motion.div
      className={cn(
        sizeClasses[size],
        "border-muted-foreground/30 border-t-foreground rounded-full",
        className
      )}
      animate={{ rotate: 360 }}
      transition={{ 
        duration: 0.8, 
        repeat: Infinity, 
        ease: 'linear' 
      }}
    />
  );
}
