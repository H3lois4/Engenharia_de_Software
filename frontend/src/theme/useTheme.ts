import { createContext, useContext } from "react";

export type Theme = "light" | "dark";

export interface ThemeState {
  theme: Theme;
  toggle: () => void;
}

export const ThemeContext = createContext<ThemeState | null>(null);

export function useTheme(): ThemeState {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme deve ser usado dentro de ThemeProvider");
  return ctx;
}
