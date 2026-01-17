import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, Copy, Pencil, Trash2, Check, Share2, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface CryptoKeyCardProps {
  name: string;
  login?: string;
  walletAddress: string;
  privateKey?: string;
  seedPhrase?: string;
  recoveryWords?: string[];
  notes?: string;
  onEdit: () => void;
  onDelete: () => void;
  onShare: () => void;
  onCopyAddress: () => void;
  onCopyLogin?: () => void;
  onCopyPrivateKey?: () => void;
  onCopySeedPhrase?: () => void;
  onCopyRecoveryWords?: () => void;
  onCopyNotes?: () => void;
}

export function CryptoKeyCard({
  name,
  login,
  walletAddress,
  privateKey,
  seedPhrase,
  recoveryWords,
  notes,
  onEdit,
  onDelete,
  onShare,
  onCopyAddress,
  onCopyLogin,
  onCopyPrivateKey,
  onCopySeedPhrase,
  onCopyRecoveryWords,
  onCopyNotes,
}: CryptoKeyCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [visibleFields, setVisibleFields] = useState<Set<string>>(new Set());
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const hasSecrets = privateKey || seedPhrase || (recoveryWords && recoveryWords.length > 0);

  const toggleVisibility = (field: string) => {
    const newSet = new Set(visibleFields);
    if (newSet.has(field)) {
      newSet.delete(field);
    } else {
      newSet.add(field);
    }
    setVisibleFields(newSet);
  };

  const isVisible = (field: string) => visibleFields.has(field);

  const handleCopy = useCallback((field: string, copyFn?: () => void) => {
    if (copyFn) {
      copyFn();
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 1500);
    }
  }, []);

  const truncate = (text: string, len: number = 12) => {
    if (text.length <= len) return text;
    return `${text.slice(0, 6)}...${text.slice(-4)}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
      className="bg-card border border-border rounded-xl overflow-hidden hover:border-muted-foreground/30 transition-all duration-200 flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/10 flex items-center justify-center flex-shrink-0 border border-amber-500/20">
            <span className="text-lg font-bold text-amber-500">₿</span>
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-foreground truncate text-base leading-tight">{name}</h3>
            {login && (
              <p className="text-sm text-muted-foreground truncate leading-tight">{login}</p>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-1">
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={onShare} className="h-9 w-9 text-muted-foreground hover:text-foreground" data-size="icon">
                  <Share2 className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent><p className="text-sm">Compartilhar</p></TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={onEdit} className="h-9 w-9 text-muted-foreground hover:text-foreground" data-size="icon">
                  <Pencil className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent><p className="text-sm">Editar</p></TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={onDelete} className="h-9 w-9 text-destructive/60 hover:text-destructive hover:bg-destructive/10" data-size="icon">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent><p className="text-sm">Excluir</p></TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-border" />

      {/* Content */}
      <div className="px-3 py-2.5 space-y-2.5">
        {/* Login */}
        {login && (
          <FieldBox
            label="Login"
            value={login}
            copied={copiedField === 'login'}
            onCopy={() => handleCopy('login', onCopyLogin)}
          />
        )}

        {/* Address */}
        <FieldBox
          label="Endereço"
          value={isVisible('address') ? walletAddress : truncate(walletAddress, 16)}
          isSecret
          isVisible={isVisible('address')}
          onToggle={() => toggleVisibility('address')}
          copied={copiedField === 'address'}
          onCopy={() => handleCopy('address', onCopyAddress)}
          mono
        />

        {/* Expand trigger */}
        {hasSecrets && (
          <button
            onClick={() => setExpanded(!expanded)}
            className={cn(
              "w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all border",
              expanded 
                ? "text-foreground bg-muted/50 border-border" 
                : "text-muted-foreground border-transparent hover:text-foreground hover:bg-muted/30 hover:border-border"
            )}
          >
            {expanded ? 'Ocultar dados sensíveis' : 'Mostrar dados sensíveis'}
            <motion.div animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
              <ChevronDown className="w-4 h-4" />
            </motion.div>
          </button>
        )}

        {/* Expanded content */}
        <AnimatePresence>
          {expanded && hasSecrets && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="space-y-3 pt-1">
                {/* Private Key */}
                {privateKey && (
                  <FieldBox
                    label="Chave Privada"
                    value={isVisible('privateKey') ? privateKey : '••••••••••••••••••••'}
                    isSecret
                    isVisible={isVisible('privateKey')}
                    onToggle={() => toggleVisibility('privateKey')}
                    copied={copiedField === 'privateKey'}
                    onCopy={() => handleCopy('privateKey', onCopyPrivateKey)}
                    mono
                    multiline={isVisible('privateKey')}
                  />
                )}

                {/* Seed Phrase */}
                {seedPhrase && (
                  <FieldBox
                    label="Frase de Recuperação"
                    value={isVisible('seedPhrase') ? seedPhrase : '•••• •••• •••• •••• •••• ••••'}
                    isSecret
                    isVisible={isVisible('seedPhrase')}
                    onToggle={() => toggleVisibility('seedPhrase')}
                    copied={copiedField === 'seedPhrase'}
                    onCopy={() => handleCopy('seedPhrase', onCopySeedPhrase)}
                    mono
                    multiline
                  />
                )}

                {/* Recovery Words */}
                {recoveryWords && recoveryWords.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between px-1">
                      <span className="text-sm text-muted-foreground">
                        Palavras de Recuperação ({recoveryWords.length})
                      </span>
                      <div className="flex items-center gap-1">
                        <ActionButton
                          icon={isVisible('recoveryWords') ? EyeOff : Eye}
                          onClick={() => toggleVisibility('recoveryWords')}
                          tooltip={isVisible('recoveryWords') ? 'Ocultar' : 'Mostrar'}
                        />
                        <ActionButton
                          icon={copiedField === 'recoveryWords' ? Check : Copy}
                          onClick={() => handleCopy('recoveryWords', onCopyRecoveryWords)}
                          tooltip="Copiar"
                          success={copiedField === 'recoveryWords'}
                        />
                      </div>
                    </div>
                    <div className="bg-muted/40 border border-border rounded-lg p-3">
                      <div className="grid grid-cols-2 gap-2">
                        {recoveryWords.map((word, i) => (
                          <div key={i} className="flex items-center gap-2 bg-background/60 rounded-md px-3 py-1.5">
                            <span className="text-xs text-muted-foreground font-mono w-5 text-right tabular-nums">
                              {i + 1}.
                            </span>
                            <span className={cn(
                              "text-sm font-mono flex-1 leading-tight",
                              isVisible('recoveryWords') ? "text-foreground" : "text-muted-foreground"
                            )}>
                              {isVisible('recoveryWords') ? word : '••••'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Notes */}
                {notes && (
                  <FieldBox
                    label="Notas"
                    value={notes}
                    copied={copiedField === 'notes'}
                    onCopy={() => handleCopy('notes', onCopyNotes)}
                    multiline
                  />
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// Field Box Component - input-like appearance
function FieldBox({
  label,
  value,
  isSecret,
  isVisible,
  onToggle,
  copied,
  onCopy,
  mono,
  multiline,
}: {
  label: string;
  value: string;
  isSecret?: boolean;
  isVisible?: boolean;
  onToggle?: () => void;
  copied?: boolean;
  onCopy?: () => void;
  mono?: boolean;
  multiline?: boolean;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-1">
        <span className="text-sm text-muted-foreground">{label}</span>
        <div className="flex items-center gap-1">
          {isSecret && onToggle && (
            <ActionButton
              icon={isVisible ? EyeOff : Eye}
              onClick={onToggle}
              tooltip={isVisible ? 'Ocultar' : 'Mostrar'}
            />
          )}
          {onCopy && (
            <ActionButton
              icon={copied ? Check : Copy}
              onClick={onCopy}
              tooltip="Copiar"
              success={copied}
            />
          )}
        </div>
      </div>
      <div className={cn(
        "bg-muted/40 border border-border rounded-lg px-3 text-sm",
        multiline ? "py-2.5 leading-relaxed break-all" : "py-2.5",
        mono && "font-mono",
        isSecret && !isVisible ? "text-muted-foreground" : "text-foreground"
      )}>
        {value}
      </div>
    </div>
  );
}

// Action Button Component
function ActionButton({
  icon: Icon,
  onClick,
  tooltip,
  success,
}: {
  icon: React.ElementType;
  onClick: () => void;
  tooltip: string;
  success?: boolean;
}) {
  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => { e.stopPropagation(); onClick(); }}
            className={cn(
              "h-8 w-8",
              success ? "text-success" : "text-muted-foreground hover:text-foreground"
            )}
            data-size="icon"
          >
            <Icon className="w-4 h-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent><p className="text-sm">{tooltip}</p></TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
