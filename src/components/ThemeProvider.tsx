import { ThemeProvider as NextThemesProvider, useTheme as useNextTheme } from "next-themes";
import { type ThemeProviderProps } from "next-themes/dist/types";
import { useEffect, useCallback } from "react";

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}

/**
 * Hook that provides theme switching with smooth transitions
 */
export function useThemeTransition() {
  const { theme, setTheme, resolvedTheme } = useNextTheme();

  const setThemeWithTransition = useCallback((newTheme: string) => {
    // Add transition class
    document.documentElement.classList.add('theme-transition');
    
    // Change theme
    setTheme(newTheme);
    
    // Remove transition class after animation completes
    const timeout = setTimeout(() => {
      document.documentElement.classList.remove('theme-transition');
    }, 400);

    return () => clearTimeout(timeout);
  }, [setTheme]);

  const toggleTheme = useCallback(() => {
    const newTheme = resolvedTheme === 'dark' ? 'light' : 'dark';
    setThemeWithTransition(newTheme);
  }, [resolvedTheme, setThemeWithTransition]);

  return {
    theme,
    resolvedTheme,
    setTheme: setThemeWithTransition,
    toggleTheme,
    isDark: resolvedTheme === 'dark',
  };
}
