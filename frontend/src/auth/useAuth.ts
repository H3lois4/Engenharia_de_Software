import { createContext, useContext } from "react";
import type { SessionUser } from "./token";

export interface AuthState {
  user: SessionUser | null;
  token: string | null;
  loginWithToken: (token: string) => void;
  /** Login com um JWT real (ex.: emitido pelo Módulo 1). Lança InvalidTokenError. */
  loginWithJwt: (rawToken: string) => Promise<void>;
  loginDev: (profile: "po" | "pm" | "dev") => Promise<void>;
  logout: () => void;
}

export const AuthContext = createContext<AuthState | null>(null);

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de AuthProvider");
  return ctx;
}
