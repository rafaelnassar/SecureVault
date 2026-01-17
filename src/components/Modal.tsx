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
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
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
    sm: 'max-w-[min(24rem,calc(100vw-2rem))]',
    md: 'max-w-[min(28rem,calc(100vw-2rem))]',
    lg: 'max-w-[min(32rem,calc(100vw-2rem))]',
    xl: 'max-w-[min(40rem,calc(100vw-2rem))]',
  }[maxWidth];

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 safe-area-inset">
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
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ 
              duration: 0.25,
              ease: [0.4, 0, 0.2, 1]
            }}
            className={cn(
              "relative w-full",
              widthClass,
              scrollable && "max-h-[min(90vh,calc(100dvh-2rem))] flex flex-col"
            )}
          >
            <div className={cn(
              "bg-card border border-border rounded-2xl overflow-hidden",
              scrollable && "flex flex-col max-h-[min(90vh,calc(100dvh-2rem))]"
            )}>
              {/* Header */}
              {(title || showCloseButton) && (
                <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-border flex-shrink-0">
                  {title ? (
                    <h2 className="text-lg sm:text-xl font-semibold text-foreground tracking-tight">{title}</h2>
                  ) : (
                    <div />
                  )}
                  {showCloseButton && (
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={onClose} 
                      className="h-10 w-10 -mr-1"
                      data-size="icon"
                    >
                      <X className="w-5 h-5" />
                    </Button>
                  )}
                </div>
              )}
              
              {/* Body */}
              <div className={cn(
                "p-5 sm:p-6",
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
