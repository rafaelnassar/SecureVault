import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, Copy, Check, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Modal } from '@/components/Modal';
import { cn } from '@/lib/utils';
import { showToast } from '@/components/ui/sonner';

interface PasswordGeneratorProps {
  open: boolean;
  onClose: () => void;
}

const LOWERCASE = 'abcdefghijklmnopqrstuvwxyz';
const UPPERCASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const NUMBERS = '0123456789';
const SYMBOLS = '!@#$%^&*()_+-=[]{}|;:,.<>?';

export function PasswordGenerator({ open, onClose }: PasswordGeneratorProps) {
  const [password, setPassword] = useState('');
  const [copied, setCopied] = useState(false);
  const [length, setLength] = useState(16);
  const [includeUppercase, setIncludeUppercase] = useState(true);
  const [includeLowercase, setIncludeLowercase] = useState(true);
  const [includeNumbers, setIncludeNumbers] = useState(true);
  const [includeSymbols, setIncludeSymbols] = useState(true);

  const generatePassword = useCallback(() => {
    let chars = '';
    if (includeLowercase) chars += LOWERCASE;
    if (includeUppercase) chars += UPPERCASE;
    if (includeNumbers) chars += NUMBERS;
    if (includeSymbols) chars += SYMBOLS;

    if (!chars) {
      chars = LOWERCASE + NUMBERS;
    }

    let result = '';
    const array = new Uint32Array(length);
    crypto.getRandomValues(array);

    for (let i = 0; i < length; i++) {
      result += chars[array[i] % chars.length];
    }

    setPassword(result);
    setCopied(false);
  }, [length, includeUppercase, includeLowercase, includeNumbers, includeSymbols]);

  useEffect(() => {
    if (open && !password) {
      generatePassword();
    }
  }, [open, password, generatePassword]);

  const handleCopy = async () => {
    if (!password) return;
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
      showToast.copied('Senha gerada');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback silencioso
    }
  };

  const handleClose = () => {
    setPassword('');
    setCopied(false);
    onClose();
  };

  const getStrengthColor = () => {
    if (!password) return 'bg-muted';
    const hasVariety = [includeLowercase, includeUppercase, includeNumbers, includeSymbols].filter(Boolean).length;
    if (length >= 20 && hasVariety >= 3) return 'bg-success';
    if (length >= 14 && hasVariety >= 2) return 'bg-success/70';
    if (length >= 10) return 'bg-yellow-500';
    return 'bg-destructive';
  };

  const getStrengthLabel = () => {
    if (!password) return '';
    const hasVariety = [includeLowercase, includeUppercase, includeNumbers, includeSymbols].filter(Boolean).length;
    if (length >= 20 && hasVariety >= 3) return 'Muito forte';
    if (length >= 14 && hasVariety >= 2) return 'Forte';
    if (length >= 10) return 'Moderada';
    return 'Fraca';
  };

  return (
    <Modal open={open} onClose={handleClose} title="Gerador de Senhas" maxWidth="sm">
      <div className="space-y-4 sm:space-y-5">
        {/* Password Display */}
        <div className="relative">
          <div className={cn(
            "w-full px-3 sm:px-4 py-3 sm:py-3.5 bg-muted/50 rounded-xl font-mono text-sm sm:text-base break-all min-h-[52px] flex items-center border border-border pr-20",
            password ? "text-foreground" : "text-muted-foreground"
          )}>
            {password || "Gerando..."}
          </div>
          
          {password && (
            <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
              <Button
                variant="ghost"
                size="icon"
                onClick={generatePassword}
                className="h-8 w-8 sm:h-9 sm:w-9"
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleCopy}
                className="h-8 w-8 sm:h-9 sm:w-9"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-success" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>
          )}
        </div>

        {/* Strength Indicator */}
        {password && (
          <motion.div 
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3"
          >
            <div className="flex-1 h-1.5 sm:h-2 bg-muted rounded-full overflow-hidden">
              <motion.div
                className={cn("h-full rounded-full", getStrengthColor())}
                initial={{ width: 0 }}
                animate={{ width: '100%' }}
                transition={{ duration: 0.3 }}
              />
            </div>
            <span className="text-xs sm:text-sm font-medium text-muted-foreground whitespace-nowrap min-w-[72px] text-right">
              {getStrengthLabel()}
            </span>
          </motion.div>
        )}

        {/* Length Slider */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm sm:text-base font-medium">Tamanho da senha</Label>
            <span className="text-sm font-mono font-medium bg-muted px-2.5 py-1 rounded-lg min-w-[40px] text-center">
              {length}
            </span>
          </div>
          <Slider
            value={[length]}
            onValueChange={([value]) => {
              setLength(value);
              setCopied(false);
            }}
            min={8}
            max={32}
            step={1}
            className="w-full"
          />
        </div>

        {/* Options Grid */}
        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          <OptionToggle
            id="lowercase"
            label="Minúsculas"
            checked={includeLowercase}
            onChange={(checked) => {
              setIncludeLowercase(checked);
              setCopied(false);
            }}
          />
          <OptionToggle
            id="uppercase"
            label="Maiúsculas"
            checked={includeUppercase}
            onChange={(checked) => {
              setIncludeUppercase(checked);
              setCopied(false);
            }}
          />
          <OptionToggle
            id="numbers"
            label="Números"
            checked={includeNumbers}
            onChange={(checked) => {
              setIncludeNumbers(checked);
              setCopied(false);
            }}
          />
          <OptionToggle
            id="symbols"
            label="Símbolos"
            checked={includeSymbols}
            onChange={(checked) => {
              setIncludeSymbols(checked);
              setCopied(false);
            }}
          />
        </div>

        {/* Generate Button */}
        <Button onClick={generatePassword} className="w-full gap-2 h-11 sm:h-12 text-sm sm:text-base">
          <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
          Gerar Nova Senha
        </Button>
      </div>
    </Modal>
  );
}

interface OptionToggleProps {
  id: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

function OptionToggle({ id, label, checked, onChange }: OptionToggleProps) {
  return (
    <div className="flex items-center justify-between gap-2 px-3 py-2.5 sm:py-3 bg-muted/40 rounded-xl border border-border/50 min-h-[48px]">
      <Label htmlFor={id} className="text-sm sm:text-base font-medium cursor-pointer">
        {label}
      </Label>
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onChange}
      />
    </div>
  );
}