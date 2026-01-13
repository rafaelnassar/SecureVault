import { ReactNode, forwardRef } from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CardButtonProps extends Omit<HTMLMotionProps<'button'>, 'ref'> {
  icon: ReactNode;
  title: string;
  description?: string;
  onClick: () => void;
  variant?: 'default' | 'danger';
  showArrow?: boolean;
  className?: string;
  disabled?: boolean;
}

export const CardButton = forwardRef<HTMLButtonElement, CardButtonProps>(
  function CardButton({ 
    icon, 
    title, 
    description, 
    onClick, 
    variant = 'default',
    showArrow = true,
    className,
    disabled = false,
    ...props
  }, ref) {
  return (
    <motion.button
      ref={ref}
      whileTap={disabled ? {} : { scale: 0.99 }}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={cn(
        "w-full flex items-center gap-4 p-4 rounded-xl transition-all duration-200",
        "bg-muted/40 border border-border hover:border-muted-foreground/30",
        "hover:bg-muted/60 group text-left",
        variant === 'danger' && "hover:border-destructive/30 hover:bg-destructive/5",
        disabled && "opacity-50 cursor-not-allowed hover:border-border hover:bg-muted/40",
        className
      )}
      {...props}
    >
      <div className={cn(
        "flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center transition-colors duration-200",
        variant === 'default' && "bg-background border border-border",
        variant === 'danger' && "bg-destructive/10"
      )}>
        <div className={cn(
          "transition-colors duration-200",
          variant === 'default' && "text-muted-foreground group-hover:text-foreground",
          variant === 'danger' && "text-destructive"
        )}>
          {icon}
        </div>
      </div>
      
      <div className="flex-1 min-w-0">
        <span className={cn(
          "text-base font-medium block transition-colors duration-200",
          variant === 'default' && "text-foreground",
          variant === 'danger' && "text-destructive"
        )}>
          {title}
        </span>
        {description && (
          <p className="text-sm text-muted-foreground mt-0.5 truncate">
            {description}
          </p>
        )}
      </div>
      
      {showArrow && (
        <ChevronRight className={cn(
          "w-5 h-5 transition-all duration-200",
          "text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5",
          variant === 'danger' && "group-hover:text-destructive"
        )} />
      )}
    </motion.button>
  );
});
