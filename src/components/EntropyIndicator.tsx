import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Shield, ShieldAlert, ShieldCheck } from 'lucide-react';
import { calculateEntropy, getStrengthLevel } from '@/lib/security';
import { cn } from '@/lib/utils';

interface EntropyIndicatorProps {
  value: string;
  type?: 'password' | 'seedPhrase';
  className?: string;
  showDetails?: boolean;
}

export function EntropyIndicator({ 
  value, 
  type = 'password',
  className,
  showDetails = false 
}: EntropyIndicatorProps) {
  const { entropy, strength, wordCount } = useMemo(() => {
    const ent = calculateEntropy(value);
    const str = getStrengthLevel(ent);
    const words = value.trim().split(/\s+/).filter(w => w.length > 0).length;
    return { entropy: ent, strength: str, wordCount: words };
  }, [value]);

  if (!value || value.trim().length === 0) {
    return null;
  }

  const isSeedPhrase = type === 'seedPhrase' || wordCount >= 3;
  const percentage = Math.min((entropy / 128) * 100, 100);

  const Icon = strength.level === 'weak' || strength.level === 'fair' 
    ? ShieldAlert 
    : strength.level === 'excellent' 
      ? ShieldCheck 
      : Shield;

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Icon 
            className="w-3.5 h-3.5" 
            style={{ color: strength.color }}
          />
          <span 
            className="text-xs font-medium"
            style={{ color: strength.color }}
          >
            {strength.label}
          </span>
        </div>
        
        {showDetails && (
          <span className="text-xs text-muted-foreground">
            {isSeedPhrase ? `${wordCount} palavras` : `${entropy} bits`}
          </span>
        )}
      </div>
      
      <div className="h-1 bg-muted rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: strength.color }}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        />
      </div>
      
      {showDetails && isSeedPhrase && wordCount >= 12 && (
        <p className="text-xs text-muted-foreground">
          {wordCount === 12 ? 'Seed phrase padrão (128 bits)' :
           wordCount === 24 ? 'Seed phrase estendida (256 bits)' :
           `${wordCount} palavras detectadas`}
        </p>
      )}
    </div>
  );
}
