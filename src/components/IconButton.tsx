import { forwardRef, ReactNode, useState } from 'react';
import { motion } from 'framer-motion';
import { Button, ButtonProps } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface IconButtonProps extends ButtonProps {
  children: ReactNode;
  successIcon?: ReactNode;
  showSuccess?: boolean;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ children, successIcon, showSuccess, className, onClick, ...props }, ref) => {
    const [isPressed, setIsPressed] = useState(false);

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      setIsPressed(true);
      setTimeout(() => setIsPressed(false), 150);
      onClick?.(e);
    };

    return (
      <Button
        ref={ref}
        className={cn("relative overflow-hidden", className)}
        onClick={handleClick}
        {...props}
      >
        <motion.div
          animate={{ 
            scale: isPressed ? 0.85 : 1,
          }}
          transition={{ type: 'spring', stiffness: 500, damping: 25 }}
        >
          {showSuccess && successIcon ? successIcon : children}
        </motion.div>
      </Button>
    );
  }
);

IconButton.displayName = 'IconButton';
