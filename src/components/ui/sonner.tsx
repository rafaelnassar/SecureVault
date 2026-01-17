import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";
import { Check, Copy, Trash2, Save, Download, Upload, Key, AlertCircle } from "lucide-react";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      position="bottom-center"
      duration={2500}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-card group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-md group-[.toaster]:rounded-xl group-[.toaster]:py-3 group-[.toaster]:px-4",
          description: "group-[.toast]:text-muted-foreground group-[.toast]:text-xs",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
          title: "group-[.toast]:text-sm group-[.toast]:font-medium",
        },
      }}
      {...props}
    />
  );
};

// Toast helper functions for consistent usage
const showToast = {
  copied: (item?: string) => {
    toast(item ? `${item} copiado` : "Copiado", {
      icon: <Copy className="w-4 h-4 text-muted-foreground" />,
    });
  },
  saved: (item?: string) => {
    toast(item ? `${item} salvo` : "Salvo com sucesso", {
      icon: <Check className="w-4 h-4 text-success" />,
    });
  },
  deleted: (item?: string) => {
    toast(item ? `${item} excluído` : "Excluído com sucesso", {
      icon: <Trash2 className="w-4 h-4 text-muted-foreground" />,
    });
  },
  exported: () => {
    toast("Backup exportado", {
      icon: <Download className="w-4 h-4 text-muted-foreground" />,
    });
  },
  imported: (count: number) => {
    toast(`${count} ${count === 1 ? 'item importado' : 'itens importados'}`, {
      icon: <Upload className="w-4 h-4 text-muted-foreground" />,
    });
  },
  pinChanged: () => {
    toast("PIN alterado com sucesso", {
      icon: <Key className="w-4 h-4 text-success" />,
    });
  },
  error: (message: string) => {
    toast.error(message, {
      icon: <AlertCircle className="w-4 h-4 text-destructive" />,
    });
  },
  success: (message: string) => {
    toast(message, {
      icon: <Check className="w-4 h-4 text-success" />,
    });
  },
};

export { Toaster, toast, showToast };
