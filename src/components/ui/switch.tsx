import * as React from "react";
import * as SwitchPrimitives from "@radix-ui/react-switch";

import { cn } from "@/lib/utils";

// Switch com design padrão iOS/Material - proporções confortáveis e pixel perfect
const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitives.Root
    ref={ref}
    className={cn(
      // Track: 24x44px - proporção padrão de switch confortável
      // min-h-0 anula o min-height global de acessibilidade do projeto
      "peer group relative inline-flex min-h-0 h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent bg-muted transition-colors",
      "data-[state=checked]:bg-primary",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
      "disabled:cursor-not-allowed disabled:opacity-50",
      // Hit area 48px sem afetar layout visual
      "before:content-[''] before:absolute before:-inset-3",
      className
    )}
    {...props}
  >
    <SwitchPrimitives.Thumb
      className={cn(
        // Thumb: 20x20px - proporcional ao track, com sombra sutil
        "pointer-events-none block h-5 w-5 rounded-full bg-background shadow-sm ring-0 transition-transform",
        "data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0"
      )}
    />
  </SwitchPrimitives.Root>
));
Switch.displayName = SwitchPrimitives.Root.displayName;

export { Switch };
