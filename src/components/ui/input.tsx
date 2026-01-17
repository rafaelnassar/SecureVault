import * as React from "react";

import { cn } from "@/lib/utils";

// Input com altura confortável (48px) e cantos consistentes (rounded-lg = 8px)
const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          // Altura 48px, padding confortável, cantos arredondados consistentes
          "flex h-12 w-full rounded-lg border border-border bg-background px-4 py-3 text-base tracking-tight",
          "ring-offset-background transition-all duration-200",
          "file:border-0 file:bg-transparent file:text-base file:font-medium file:text-foreground",
          "placeholder:text-muted-foreground/60",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20 focus-visible:border-ring",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
