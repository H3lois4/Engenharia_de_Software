import { useState } from "react";
import { useAuth } from "./useAuth";
import { InvalidTokenError } from "./token";

type Profile = "po" | "pm" | "dev";

// Login com JWT real (Módulo 1) ou com um perfil de demonstração gerado pelo BFF.
export function LoginScreen() {
  const { loginDev, loginWithJwt } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [rawToken, setRawToken] = useState("");

  const entrarDev = async (perfil: Profile) => {
    setError(null);
    setLoading(perfil);
    try {
      await loginDev(perfil);
    } catch {
      setError(
        "Não foi possível obter o token de demonstração. O BFF está no ar e o login de demonstração está habilitado?",
      );
    } finally {
      setLoading(null);
    }
  };

  const entrarComToken = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading("jwt");
    try {
      await loginWithJwt(rawToken);
    } catch (err) {
      setError(
        err instanceof InvalidTokenError ? err.message : "Não foi possível validar o token.",
      );
    } finally {
      setLoading(null);
    }
  };

  return (
    <main className="flex min-h-full items-center justify-center bg-bg p-6">
      <div className="w-full max-w-md rounded-xl border border-border bg-surface p-8">
        <h1 className="text-xl font-semibold text-text">
          Módulo<span className="text-brand-accent">6</span> · Portal
        </h1>

        <form onSubmit={entrarComToken} className="mt-6 flex flex-col gap-2">
          <label htmlFor="jwt" className="text-sm font-medium text-text">
            Entrar com token (Módulo 1)
          </label>
          <textarea
            id="jwt"
            value={rawToken}
            onChange={(e) => setRawToken(e.target.value)}
            rows={3}
            spellCheck={false}
            placeholder="Cole aqui o JWT emitido pelo Módulo 1"
            className="rounded-md border border-border bg-bg px-3 py-2 font-mono text-xs text-text"
          />
          <button
            type="submit"
            disabled={loading !== null || rawToken.trim().length === 0}
            className="rounded-lg bg-primary px-4 py-3 text-md font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-60"
          >
            {loading === "jwt" ? "Validando…" : "Entrar com token"}
          </button>
        </form>

        <div className="my-6 flex items-center gap-3 text-xs text-text-muted">
          <span className="h-px flex-1 bg-border" />
          ou use um perfil de demonstração
          <span className="h-px flex-1 bg-border" />
        </div>

        <div className="flex flex-col gap-3">
          {(["po", "pm", "dev"] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => entrarDev(p)}
              disabled={loading !== null}
              className="rounded-lg border border-primary px-4 py-3 text-md font-medium text-primary transition-colors hover:bg-primary hover:text-white disabled:opacity-60"
            >
              {loading === p ? "Entrando…" : `Entrar como ${label(p)}`}
            </button>
          ))}
        </div>

        {error && (
          <p
            role="alert"
            className="mt-4 rounded-md border border-priority-critical/40 bg-priority-critical/10 p-3 text-sm text-text"
          >
            {error}
          </p>
        )}
      </div>
    </main>
  );
}

function label(p: Profile): string {
  return { po: "Product Owner", pm: "Scrum Master", dev: "Desenvolvedor(a)" }[p];
}
