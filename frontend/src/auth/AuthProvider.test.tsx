import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { makeToken, validPayload } from "../test/jwt";
import { AuthProvider } from "./AuthProvider";
import { InvalidTokenError } from "./token";
import { useAuth, type AuthState } from "./useAuth";

const TOKEN_KEY = "ms-dashboard.token";

// Captura o estado de autenticação exposto pelo provider.
function mount() {
  const ref: { current: AuthState | null } = { current: null };
  function Capture() {
    ref.current = useAuth();
    return null;
  }
  render(
    <AuthProvider>
      <Capture />
    </AuthProvider>,
  );
  return ref as { current: AuthState };
}

describe("AuthProvider", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.unstubAllGlobals());

  it("restaura a sessão a partir do token salvo", () => {
    localStorage.setItem(TOKEN_KEY, makeToken(validPayload({ role: "PO" })));
    const auth = mount();
    expect(auth.current.user?.role).toBe("PO");
  });

  it("descarta token salvo que já expirou", () => {
    localStorage.setItem(
      TOKEN_KEY,
      makeToken(validPayload({ exp: Math.floor(Date.now() / 1000) - 60 })),
    );
    const auth = mount();
    expect(auth.current.user).toBeNull();
  });

  it("loginWithJwt guarda a sessão quando o BFF aceita o token", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const auth = mount();
    const token = makeToken(validPayload());

    await act(() => auth.current.loginWithJwt(`Bearer ${token}`));

    expect(auth.current.user?.user_id).toBe("user-1");
    expect(localStorage.getItem(TOKEN_KEY)).toBe(token); // sem o prefixo "Bearer "
    const [, init] = fetchMock.mock.calls[0];
    expect(init.headers.Authorization).toBe(`Bearer ${token}`);
  });

  it("loginWithJwt recusa quando o BFF responde 401 e não guarda nada", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", { status: 401 })));
    const auth = mount();

    await expect(
      act(() => auth.current.loginWithJwt(makeToken(validPayload()))),
    ).rejects.toThrow(/BFF recusou/);
    expect(auth.current.user).toBeNull();
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
  });

  it("loginWithJwt explica quando o BFF está inacessível", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    const auth = mount();

    await expect(
      act(() => auth.current.loginWithJwt(makeToken(validPayload()))),
    ).rejects.toThrow(/Ele está no ar/);
  });

  it("loginWithJwt rejeita token inválido sem nem chamar o BFF", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const auth = mount();

    await expect(act(() => auth.current.loginWithJwt("lixo"))).rejects.toBeInstanceOf(
      InvalidTokenError,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("logout limpa a sessão", async () => {
    localStorage.setItem(TOKEN_KEY, makeToken(validPayload()));
    const auth = mount();
    expect(auth.current.user).not.toBeNull();

    act(() => auth.current.logout());

    expect(auth.current.user).toBeNull();
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
  });
});
