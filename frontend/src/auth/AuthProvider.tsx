import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { api, getToken, setToken, setUnauthorizedHandler } from "../lib/apiClient";
import { apiUrl } from "../lib/config";
import { cleanToken, InvalidTokenError, parseToken, tryParseToken } from "./token";
import { AuthContext } from "./useAuth";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setTokenState] = useState<string | null>(() => getToken());
  // Token salvo mas ilegível/expirado => sem sessão (volta para a tela de login).
  const user = useMemo(() => (token ? tryParseToken(token) : null), [token]);

  const loginWithToken = useCallback((t: string) => {
    setToken(t);
    setTokenState(t);
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setTokenState(null);
  }, []);

  const loginDev = useCallback(
    async (profile: "po" | "pm" | "dev") => {
      const tokens = await api.get<Record<string, string>>("/api/bff/dev/tokens");
      loginWithToken(tokens[profile]);
    },
    [loginWithToken],
  );

  const loginWithJwt = useCallback(
    async (rawToken: string) => {
      parseToken(rawToken); // valida formato, claims e expiração
      const clean = cleanToken(rawToken);

      // Confere com o BFF (que valida a assinatura) antes de guardar a sessão.
      let res: Response;
      try {
        res = await fetch(apiUrl("/api/bff/notifications/unread-count"), {
          headers: { Authorization: `Bearer ${clean}` },
        });
      } catch {
        throw new InvalidTokenError("Não foi possível falar com o BFF. Ele está no ar?");
      }
      if (res.status === 401) {
        throw new InvalidTokenError(
          "O BFF recusou o token (assinatura inválida ou expirada).",
        );
      }
      loginWithToken(clean);
    },
    [loginWithToken],
  );

  useEffect(() => {
    setUnauthorizedHandler(() => setTokenState(null));
  }, []);

  const value = useMemo(
    () => ({ user, token, loginWithToken, loginWithJwt, loginDev, logout }),
    [user, token, loginWithToken, loginWithJwt, loginDev, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
