import { ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
  showCloseButton?: boolean;
  maxWidth?: 'sm' | 'md' | 'lg';
  scrollable?: boolean;
}

export function Modal({ 
  open, 
  onClose, 
  children, 
  title, 
  showCloseButton = true,
  maxWidth = 'sm',
  scrollable = false
}: ModalProps) {
  const widthClass = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
  }[maxWidth];

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            onClick={onClose}
          />
          
          {/* Modal Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ 
              type: 'spring', 
              stiffness: 500, 
              damping: 32,
              mass: 0.8
            }}
            className={cn(
              "relative w-full",
              widthClass,
              scrollable && "max-h-[90vh] flex flex-col"
            )}
          >
            <div className={cn(
              "bg-card border border-border rounded-2xl overflow-hidden",
              scrollable && "flex flex-col max-h-[90vh]"
            )}>
              {/* Header */}
              {(title || showCloseButton) && (
                <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
                  {title ? (
                    <h2 className="text-lg font-semibold text-foreground tracking-tight">{title}</h2>
                  ) : (
                    <div />
                  )}
                  {showCloseButton && (
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={onClose} 
                      className="h-9 w-9 -mr-1"
                    >
                      <X className="w-5 h-5" />
                    </Button>
                  )}
                </div>
              )}
              
              {/* Body */}
              <div className={cn(
                "p-6",
                scrollable && "overflow-y-auto flex-1"
              )}>
                {children}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
