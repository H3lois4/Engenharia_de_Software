import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthContext, type AuthState } from "../../auth/useAuth";
import { api } from "../../lib/apiClient";
import type { Notification } from "../../lib/types";
import { NotificationsPage } from "./NotificationsPage";
import { NotificationsProvider } from "./NotificationsProvider";

vi.mock("../../lib/apiClient", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../lib/apiClient")>();
  return { ...actual, api: { get: vi.fn(), post: vi.fn(), patch: vi.fn() } };
});

// Não abrimos WebSocket de verdade; guardamos o callback para simular mensagens do servidor.
const ws = vi.hoisted(() => ({ onMessage: null as null | ((data: unknown) => void) }));
vi.mock("../../hooks/useWebSocket", () => ({
  useWebSocket: (_url: string | null, opts: { onMessage: (data: unknown) => void }) => {
    ws.onMessage = opts.onMessage;
    return "open";
  },
}));

function notif(n: number, overrides: Partial<Notification> = {}): Notification {
  return {
    id: `n${n}`,
    source: "github",
    type: "github.pr.comment",
    priority: "medium",
    relevance_score: 0.5,
    reason: "teste",
    classified_by: "rules",
    project_id: "proj-123",
    title: `Notificação ${n}`,
    body: "corpo",
    link: null,
    created_at: new Date().toISOString(),
    read_at: null,
    ...overrides,
  };
}

const page = (items: Notification[], next: string | null) => ({
  state: "ok" as const,
  stale: false,
  page: { items, next_cursor: next },
});

const unread = (total: number) => ({
  state: "ok" as const,
  stale: false,
  count: { total, critical: 0, high: 0, medium: total, low: 0 },
});

/** Simula o BFF: página 1 (n1, n2) com cursor "2" e página 2 (n3) sem cursor. */
function mockServer(opts: { page2?: Notification[]; page2Fails?: boolean } = {}) {
  vi.mocked(api.get).mockImplementation(async (path: string) => {
    if (path === "/api/bff/notifications") return page([notif(1), notif(2)], "2");
    if (path === "/api/bff/notifications?cursor=2") {
      if (opts.page2Fails) throw new Error("rede");
      return page(opts.page2 ?? [notif(3)], null);
    }
    if (path === "/api/bff/notifications/unread-count") return unread(3);
    throw new Error(`rota inesperada: ${path}`);
  });
  vi.mocked(api.patch).mockResolvedValue({ status: "ok" });
  vi.mocked(api.post).mockResolvedValue({ status: "ok" });
}

function renderPage() {
  const auth: AuthState = {
    user: { user_id: "u1", role: "DEV", project_ids: ["proj-123"] },
    token: "t",
    loginWithToken: vi.fn(),
    loginWithJwt: vi.fn(),
    loginDev: vi.fn(),
    logout: vi.fn(),
  };
  return render(
    <AuthContext.Provider value={auth}>
      <NotificationsProvider>
        <NotificationsPage />
      </NotificationsProvider>
    </AuthContext.Provider>,
  );
}

const cards = () => screen.queryAllByTestId("notification-card");
const loadMoreButton = () => screen.queryByRole("button", { name: "Carregar mais" });

describe("NotificationsPage — paginação", () => {
  beforeEach(() => {
    vi.mocked(api.get).mockReset();
    vi.mocked(api.patch).mockReset();
    vi.mocked(api.post).mockReset();
    ws.onMessage = null;
  });

  it("mostra a primeira página e o botão 'Carregar mais'", async () => {
    mockServer();
    renderPage();

    expect(await screen.findByText("Notificação 1")).toBeInTheDocument();
    expect(cards()).toHaveLength(2);
    expect(loadMoreButton()).toBeInTheDocument();
  });

  it("carrega a página seguinte com o cursor e esconde o botão no fim", async () => {
    mockServer();
    renderPage();
    await screen.findByText("Notificação 1");

    fireEvent.click(loadMoreButton()!);

    expect(await screen.findByText("Notificação 3")).toBeInTheDocument();
    expect(cards()).toHaveLength(3);
    expect(api.get).toHaveBeenCalledWith("/api/bff/notifications?cursor=2");
    expect(loadMoreButton()).not.toBeInTheDocument();
  });

  it("não duplica itens que já estavam na lista", async () => {
    mockServer({ page2: [notif(2), notif(3)] }); // n2 repetido na página 2
    renderPage();
    await screen.findByText("Notificação 1");

    fireEvent.click(loadMoreButton()!);
    await screen.findByText("Notificação 3");

    expect(cards()).toHaveLength(3);
  });

  it("esconde o botão quando só existe uma página", async () => {
    vi.mocked(api.get).mockImplementation(async (path: string) => {
      if (path === "/api/bff/notifications") return page([notif(1)], null);
      if (path === "/api/bff/notifications/unread-count") return unread(1);
      throw new Error(`rota inesperada: ${path}`);
    });
    renderPage();

    await screen.findByText("Notificação 1");
    expect(loadMoreButton()).not.toBeInTheDocument();
  });

  it("mantém a lista e o botão quando o 'Carregar mais' falha", async () => {
    mockServer({ page2Fails: true });
    renderPage();
    await screen.findByText("Notificação 1");

    fireEvent.click(loadMoreButton()!);

    await waitFor(() => expect(api.get).toHaveBeenCalledWith("/api/bff/notifications?cursor=2"));
    await waitFor(() => expect(loadMoreButton()).toBeEnabled()); // voltou do "Carregando…"
    expect(cards()).toHaveLength(2);
  });

  it("marcar como lida NÃO descarta as páginas já carregadas", async () => {
    mockServer();
    renderPage();
    await screen.findByText("Notificação 1");
    fireEvent.click(loadMoreButton()!);
    await screen.findByText("Notificação 3");
    expect(screen.getAllByText("Marcar como lida")).toHaveLength(3);

    fireEvent.click(screen.getAllByText("Marcar como lida")[0]);

    await waitFor(() => expect(screen.getAllByText("Marcar como lida")).toHaveLength(2));
    expect(api.patch).toHaveBeenCalledWith("/api/bff/notifications/n1");
    expect(cards()).toHaveLength(3); // as 3 notificações continuam na tela
    expect(screen.getByText("Notificação 3")).toBeInTheDocument();
  });

  it("marcar todas como lidas também preserva as páginas carregadas", async () => {
    mockServer();
    renderPage();
    await screen.findByText("Notificação 1");
    fireEvent.click(loadMoreButton()!);
    await screen.findByText("Notificação 3");

    fireEvent.click(screen.getByRole("button", { name: "Marcar todas como lidas" }));

    await waitFor(() => expect(screen.queryAllByText("Marcar como lida")).toHaveLength(0));
    expect(api.post).toHaveBeenCalledWith("/api/bff/notifications/read-all");
    expect(cards()).toHaveLength(3);
  });

  it("notificação nova em tempo real entra no topo sem perder as páginas", async () => {
    mockServer();
    renderPage();
    await screen.findByText("Notificação 1");
    fireEvent.click(loadMoreButton()!);
    await screen.findByText("Notificação 3");

    act(() => ws.onMessage?.({ event: "notification.new", data: notif(9) }));

    expect(cards()).toHaveLength(4);
    expect(cards()[0]).toHaveTextContent("Notificação 9");
  });
});
