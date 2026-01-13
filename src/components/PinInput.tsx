import { useState, useRef, useEffect, forwardRef } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface PinInputProps {
  length?: number;
  onComplete: (pin: string) => void;
  error?: boolean;
  disabled?: boolean;
}

export const PinInput = forwardRef<HTMLDivElement, PinInputProps>(
  function PinInput({ length = 6, onComplete, error, disabled }, ref) {
    const [values, setValues] = useState<string[]>(Array(length).fill(''));
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

    useEffect(() => {
      if (error) {
        setValues(Array(length).fill(''));
        inputRefs.current[0]?.focus();
      }
    }, [error, length]);

    useEffect(() => {
      inputRefs.current[0]?.focus();
    }, []);

    const handleChange = (index: number, value: string) => {
      if (disabled) return;
      
      const digit = value.replace(/\D/g, '').slice(-1);
      const newValues = [...values];
      newValues[index] = digit;
      setValues(newValues);

      if (digit && index < length - 1) {
        inputRefs.current[index + 1]?.focus();
      }

      if (newValues.every(v => v) && newValues.join('').length === length) {
        onComplete(newValues.join(''));
      }
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
      if (disabled) return;
      
      if (e.key === 'Backspace' && !values[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    };

    const handlePaste = (e: React.ClipboardEvent) => {
      if (disabled) return;
      
      e.preventDefault();
      const paste = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
      const newValues = [...values];
      
      for (let i = 0; i < paste.length; i++) {
        newValues[i] = paste[i];
      }
      
      setValues(newValues);
      
      if (paste.length === length) {
        onComplete(paste);
      } else {
        inputRefs.current[paste.length]?.focus();
      }
    };

    return (
      <div ref={ref} className="flex gap-2.5 justify-center">
        {values.map((value, index) => (
          <motion.div
            key={index}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: index * 0.04, duration: 0.2 }}
          >
            <input
              ref={(el) => (inputRefs.current[index] = el)}
              type="password"
              inputMode="numeric"
              maxLength={1}
              value={value}
              onChange={(e) => handleChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              onPaste={handlePaste}
              disabled={disabled}
              className={cn(
                "w-12 h-14 text-center text-xl font-semibold rounded-xl",
                "bg-input border-2 border-border",
                "focus:outline-none focus:border-foreground focus:ring-2 focus:ring-foreground/10",
                "transition-all duration-200",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                value && "border-foreground/30 bg-muted",
                error && "border-destructive animate-shake"
              )}
              style={{ fontFamily: 'var(--font-mono)' }}
            />
          </motion.div>
        ))}
      </div>
    );
  }
);
