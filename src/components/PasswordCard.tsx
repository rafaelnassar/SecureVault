import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, Copy, Pencil, Trash2, Check, Share2, ExternalLink, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { isAdultSite } from '@/lib/adultSites';
import { AdultContentWarning } from './AdultContentWarning';

interface PasswordCardProps {
  id: string;
  site: string;
  login?: string;
  password: string;
  isSensitive?: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onShare: () => void;
  onCopy: () => void;
  onCopyLogin?: () => void;
  onCopySite?: () => void;
}

// Sanitiza texto para exibição segura (proteção XSS)
const sanitizeText = (text: string): string => {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
};

// Extrai domínio de forma segura e normalizada (remove www.)
const getDomain = (url: string): string => {
  try {
    const sanitized = url.replace(/[<>"'&]/g, '');
    let domain = sanitized.replace(/^https?:\/\//, '').split('/')[0];
    // Remove www. para normalizar
    domain = domain.replace(/^www\./, '');
    return domain.slice(0, 100);
  } catch {
    return 'site';
  }
};

// Gera URL completa para abrir o site
const getFullUrl = (url: string): string => {
  const sanitized = url.replace(/[<>"'&]/g, '');
  if (sanitized.startsWith('http://') || sanitized.startsWith('https://')) {
    return sanitized;
  }
  return `https://${sanitized}`;
};

// Gera URL de favicon de forma segura
const getFaviconUrl = (url: string): string => {
  const domain = getDomain(url);
  const encodedDomain = encodeURIComponent(domain);
  return `https://www.google.com/s2/favicons?domain=${encodedDomain}&sz=64`;
};

export function PasswordCard({ 
  site, 
  login, 
  password,
  isSensitive,
  onEdit, 
  onDelete, 
  onShare,
  onCopy,
  onCopyLogin,
  onCopySite 
}: PasswordCardProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedLogin, setCopiedLogin] = useState(false);
  const [copiedSite, setCopiedSite] = useState(false);
  const [isRevealed, setIsRevealed] = useState(false);
  const [showAdultWarning, setShowAdultWarning] = useState(false);

  const isAdult = isAdultSite(site);
  const shouldBlur = isAdult || isSensitive;
  const isBlurred = shouldBlur && !isRevealed;

  const handleCardClick = useCallback(() => {
    if (isBlurred) {
      setShowAdultWarning(true);
    }
  }, [isBlurred]);

  const handleReveal = useCallback(() => {
    setIsRevealed(true);
    setShowAdultWarning(false);
  }, []);

  const handleCopy = useCallback(() => {
    onCopy();
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [onCopy]);

  const handleCopyLogin = useCallback(() => {
    if (onCopyLogin) {
      onCopyLogin();
      setCopiedLogin(true);
      setTimeout(() => setCopiedLogin(false), 1500);
    }
  }, [onCopyLogin]);

  const handleCopySite = useCallback(() => {
    if (onCopySite) {
      onCopySite();
      setCopiedSite(true);
      setTimeout(() => setCopiedSite(false), 1500);
    }
  }, [onCopySite]);

  const handleOpenSite = useCallback(() => {
    try {
      const fullUrl = getFullUrl(site);
      if (!fullUrl) return; // URL inválida ou perigosa
      
      // Validação adicional com URL constructor
      const url = new URL(fullUrl);
      
      // Permitir apenas protocolos seguros
      if (!['http:', 'https:'].includes(url.protocol)) {
        return;
      }
      
      window.open(url.href, '_blank', 'noopener,noreferrer');
    } catch {
      // URL inválida - não abrir
    }
  }, [site]);

  const safeSite = getDomain(site);
  const safeLogin = login ? sanitizeText(login.slice(0, 200)) : undefined;

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 8 }}
        transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
        className={cn(
          "group bg-card border border-border rounded-xl overflow-hidden hover:border-muted-foreground/30 transition-all duration-200 relative flex flex-col",
          isBlurred && "cursor-pointer"
        )}
        onClick={isBlurred ? handleCardClick : undefined}
      >
        {/* Blur overlay for adult content */}
        {isBlurred && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 z-10 backdrop-blur-md bg-background/60 flex flex-col items-center justify-center gap-2"
          >
            <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center">
              <ShieldAlert className="w-5 h-5 text-amber-500" />
            </div>
            <p className="text-sm font-medium text-foreground tracking-tight">Conteúdo sensível</p>
            <p className="text-xs text-muted-foreground">Clique para revelar</p>
          </motion.div>
        )}

        {/* Header */}
        <div className={cn("flex items-start gap-2.5 px-3 pt-3 pb-1", isBlurred && "pointer-events-none")}>
          <motion.div 
            className="flex-shrink-0 w-9 h-9 rounded-lg bg-muted flex items-center justify-center overflow-hidden"
            whileHover={{ scale: 1.05 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
          >
            <img 
              src={getFaviconUrl(site)} 
              alt=""
              className="w-5 h-5"
              loading="lazy"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          </motion.div>
        
          <div className="flex-1 min-w-0 flex items-center gap-2">
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button 
                    onClick={handleOpenSite}
                    className="font-semibold text-foreground truncate text-sm leading-tight hover:text-primary transition-colors text-left flex items-center gap-1.5 group/link tracking-tight"
                  >
                    <span className="truncate">{safeSite}</span>
                    <ExternalLink className="w-3 h-3 opacity-0 group-hover/link:opacity-100 transition-opacity flex-shrink-0" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p className="text-sm">Abrir site</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Sensitive indicator badge */}
            {shouldBlur && isRevealed && (
              <TooltipProvider delayDuration={300}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20">
                      <ShieldAlert className="w-3 h-3 text-amber-500" />
                      <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400">Sensível</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p className="text-sm">Conteúdo marcado como sensível</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </div>

        {/* Fields */}
        <div className={cn("px-3 pb-3 space-y-1.5", isBlurred && "pointer-events-none")}>
          {/* Login Field */}
          {safeLogin && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground w-12 flex-shrink-0">Login:</span>
              <div className="flex-1 font-mono text-sm bg-muted rounded-md px-3 py-1.5 text-foreground truncate tracking-tight leading-snug">
                {safeLogin}
              </div>
              <TooltipProvider delayDuration={300}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleCopyLogin}
                      className="h-8 w-8 text-muted-foreground hover:text-foreground flex-shrink-0"
                      data-size="icon"
                    >
                      {copiedLogin ? (
                        <Check className="w-3.5 h-3.5 text-success" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p className="text-sm">Copiar login</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          )}

          {/* Password Field */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground w-12 flex-shrink-0">Senha:</span>
            <div 
              className={cn(
                "flex-1 font-mono text-sm bg-muted rounded-md px-3 py-1.5",
                "transition-colors duration-200 truncate select-none tracking-tight leading-snug",
                showPassword ? "text-foreground" : "text-muted-foreground"
              )}
            >
              <AnimatePresence mode="wait">
                <motion.span
                  key={showPassword ? 'visible' : 'hidden'}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  {showPassword ? password : '••••••••'}
                </motion.span>
              </AnimatePresence>
            </div>
            
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowPassword(!showPassword)}
                    className="h-8 w-8 text-muted-foreground hover:text-foreground flex-shrink-0"
                    data-size="icon"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p className="text-sm">{showPassword ? 'Ocultar' : 'Mostrar'}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleCopy}
                    className="h-8 w-8 text-muted-foreground hover:text-foreground flex-shrink-0"
                    data-size="icon"
                  >
                    {copied ? (
                      <Check className="w-3.5 h-3.5 text-success" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p className="text-sm">Copiar senha</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
        
        {/* Actions */}
        <div className={cn("flex items-center justify-between px-3 py-1.5 bg-muted/30 border-t border-border", isBlurred && "pointer-events-none")}>
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={onShare}
                  className="h-9 w-9 text-muted-foreground hover:text-foreground"
                  data-size="icon"
                >
                  <Share2 className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p className="text-sm">Compartilhar</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <div className="flex gap-1">
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={onEdit}
                    className="h-9 w-9 text-muted-foreground hover:text-foreground"
                    data-size="icon"
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p className="text-sm">Editar</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={onDelete}
                    className="h-9 w-9 text-destructive/70 hover:text-destructive hover:bg-destructive/10"
                    data-size="icon"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p className="text-sm">Excluir</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </motion.div>

      <AdultContentWarning
        open={showAdultWarning}
        site={getDomain(site)}
        onConfirm={handleReveal}
        onCancel={() => setShowAdultWarning(false)}
      />
    </>
  );
}
