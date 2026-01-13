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

  // Gerar senha automaticamente ao abrir o modal
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
      <div className="space-y-5">
        {/* Password Display */}
        <div className="relative">
          <div className={cn(
            "w-full px-4 py-3.5 bg-muted/50 rounded-xl font-mono text-sm break-all min-h-[52px] flex items-center border border-border",
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
                className="h-7 w-7"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleCopy}
                className="h-7 w-7"
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-success" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
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
            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
              <motion.div
                className={cn("h-full rounded-full", getStrengthColor())}
                initial={{ width: 0 }}
                animate={{ width: '100%' }}
                transition={{ duration: 0.3 }}
              />
            </div>
            <span className="text-xs font-medium text-muted-foreground whitespace-nowrap min-w-[72px] text-right tracking-tight">
              {getStrengthLabel()}
            </span>
          </motion.div>
        )}

        {/* Length Slider */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium tracking-tight">Tamanho da senha</Label>
            <span className="text-xs font-mono font-medium bg-muted px-2 py-1 rounded-md">
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
        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-center justify-between gap-2 px-3 py-2.5 bg-muted/40 rounded-lg border border-border/50">
            <Label htmlFor="lowercase" className="text-xs font-medium cursor-pointer tracking-tight">
              Minúsculas
            </Label>
            <Switch
              id="lowercase"
              checked={includeLowercase}
              onCheckedChange={(checked) => {
                setIncludeLowercase(checked);
                setCopied(false);
              }}
            />
          </div>
          <div className="flex items-center justify-between gap-2 px-3 py-2.5 bg-muted/40 rounded-lg border border-border/50">
            <Label htmlFor="uppercase" className="text-xs font-medium cursor-pointer tracking-tight">
              Maiúsculas
            </Label>
            <Switch
              id="uppercase"
              checked={includeUppercase}
              onCheckedChange={(checked) => {
                setIncludeUppercase(checked);
                setCopied(false);
              }}
            />
          </div>
          <div className="flex items-center justify-between gap-2 px-3 py-2.5 bg-muted/40 rounded-lg border border-border/50">
            <Label htmlFor="numbers" className="text-xs font-medium cursor-pointer tracking-tight">
              Números
            </Label>
            <Switch
              id="numbers"
              checked={includeNumbers}
              onCheckedChange={(checked) => {
                setIncludeNumbers(checked);
                setCopied(false);
              }}
            />
          </div>
          <div className="flex items-center justify-between gap-2 px-3 py-2.5 bg-muted/40 rounded-lg border border-border/50">
            <Label htmlFor="symbols" className="text-xs font-medium cursor-pointer tracking-tight">
              Símbolos
            </Label>
            <Switch
              id="symbols"
              checked={includeSymbols}
              onCheckedChange={(checked) => {
                setIncludeSymbols(checked);
                setCopied(false);
              }}
            />
          </div>
        </div>

        {/* Generate Button */}
        <Button onClick={generatePassword} className="w-full gap-2 h-11">
          <Sparkles className="w-4 h-4" />
          Gerar Nova Senha
        </Button>
      </div>
    </Modal>
  );
}