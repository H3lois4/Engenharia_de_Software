import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LoginScreen } from "./LoginScreen";
import { InvalidTokenError } from "./token";
import { AuthContext, type AuthState } from "./useAuth";

function renderLogin(overrides: Partial<AuthState> = {}) {
  const auth: AuthState = {
    user: null,
    token: null,
    loginWithToken: vi.fn(),
    loginWithJwt: vi.fn().mockResolvedValue(undefined),
    loginDev: vi.fn().mockResolvedValue(undefined),
    logout: vi.fn(),
    ...overrides,
  };
  render(
    <AuthContext.Provider value={auth}>
      <LoginScreen />
    </AuthContext.Provider>,
  );
  return auth;
}

const submit = () => screen.getByRole("button", { name: "Entrar com token" });
const field = () => screen.getByLabelText("Entrar com token (Módulo 1)");

describe("LoginScreen", () => {
  it("mantém o botão de token desabilitado enquanto o campo está vazio", () => {
    renderLogin();
    expect(submit()).toBeDisabled();

    fireEvent.change(field(), { target: { value: "   " } });
    expect(submit()).toBeDisabled();

    fireEvent.change(field(), { target: { value: "a.b.c" } });
    expect(submit()).toBeEnabled();
  });

  it("envia o token colado para validação", async () => {
    const auth = renderLogin();
    fireEvent.change(field(), { target: { value: "Bearer a.b.c" } });
    fireEvent.click(submit());

    await waitFor(() => expect(auth.loginWithJwt).toHaveBeenCalledWith("Bearer a.b.c"));
  });

  it("mostra a mensagem clara quando o token é recusado", async () => {
    renderLogin({
      loginWithJwt: vi.fn().mockRejectedValue(new InvalidTokenError("O token está expirado.")),
    });
    fireEvent.change(field(), { target: { value: "a.b.c" } });
    fireEvent.click(submit());

    expect(await screen.findByRole("alert")).toHaveTextContent("O token está expirado.");
  });

  it("usa mensagem genérica para erros inesperados", async () => {
    renderLogin({ loginWithJwt: vi.fn().mockRejectedValue(new Error("boom")) });
    fireEvent.change(field(), { target: { value: "a.b.c" } });
    fireEvent.click(submit());

    expect(await screen.findByRole("alert")).toHaveTextContent("Não foi possível validar o token.");
  });

  it("mantém os perfis de demonstração", async () => {
    const auth = renderLogin();
    fireEvent.click(screen.getByRole("button", { name: "Entrar como Product Owner" }));

    await waitFor(() => expect(auth.loginDev).toHaveBeenCalledWith("po"));
  });

  it("orienta quando o login de demonstração não está disponível", async () => {
    renderLogin({ loginDev: vi.fn().mockRejectedValue(new Error("404")) });
    fireEvent.click(screen.getByRole("button", { name: "Entrar como Desenvolvedor(a)" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("login de demonstração");
  });
});
