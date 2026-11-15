import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../../lib/apiClient";
import type { DashboardResponse } from "../../lib/types";
import { ProjectContext } from "../project/projectContext";
import { DashboardPage } from "./DashboardPage";

vi.mock("../../lib/apiClient", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../lib/apiClient")>();
  return { ...actual, api: { get: vi.fn(), post: vi.fn(), patch: vi.fn() } };
});

// O gráfico (Recharts) depende de medidas de layout que o jsdom não tem.
vi.mock("./WeeklyChart", () => ({ WeeklyChart: () => <div data-testid="weekly-chart" /> }));

function response(overrides: Partial<DashboardResponse> = {}): DashboardResponse {
  return {
    project_id: "proj-123",
    cards: [
      { key: "commits_week", state: "ok", stale: false, value: 47 },
      { key: "open_prs", state: "ok", stale: false, value: 9 },
      { key: "reviews_pending", state: "ok", stale: false, value: 3 },
      {
        key: "stories_by_status",
        state: "ok",
        stale: false,
        value: { todo: 21, in_progress: 22, in_review: 23, done: 24 },
      },
    ],
    weekly: {
      key: "weekly",
      state: "ok",
      stale: false,
      value: { points: [{ week: "2026-W41", commits: 47, prs: 7 }] },
    },
    ...overrides,
  };
}

function renderPage(projectId = "proj-123") {
  return render(
    <ProjectContext.Provider value={{ projectId, projects: [projectId], setProjectId: vi.fn() }}>
      <DashboardPage />
    </ProjectContext.Provider>,
  );
}

describe("DashboardPage", () => {
  beforeEach(() => {
    vi.mocked(api.get).mockReset();
  });

  it("consulta o BFF com o projeto ativo e mostra as métricas", async () => {
    vi.mocked(api.get).mockResolvedValue(response());
    renderPage("proj-456");

    expect(await screen.findByText("47")).toBeInTheDocument();
    expect(screen.getByText("9")).toBeInTheDocument();
    expect(screen.getByText("22")).toBeInTheDocument();
    expect(screen.getByTestId("weekly-chart")).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith("/api/bff/dashboard?project_id=proj-456");
  });

  it("um serviço fora do ar deixa só o card dele indisponível; os demais continuam", async () => {
    const cards = response().cards.map((c) =>
      c.key === "reviews_pending" ? { ...c, state: "unavailable" as const, value: null } : c,
    );
    vi.mocked(api.get).mockResolvedValue(response({ cards }));
    renderPage();

    await screen.findByText("47");
    const broken = screen.getByText("Reviews pendentes").closest("div")!;
    expect(within(broken).getByText("indisponível no momento")).toBeInTheDocument();

    // Os outros cards seguem com os valores normais.
    expect(screen.getByText("47")).toBeInTheDocument();
    expect(screen.getByText("9")).toBeInTheDocument();
  });

  it("avisa quando o valor veio do cache (stale)", async () => {
    const cards = response().cards.map((c) => (c.key === "open_prs" ? { ...c, stale: true } : c));
    vi.mocked(api.get).mockResolvedValue(response({ cards }));
    renderPage();

    expect(await screen.findByText("dados do último cache")).toBeInTheDocument();
  });

  it("mostra o gráfico como indisponível sem derrubar os cards", async () => {
    vi.mocked(api.get).mockResolvedValue(
      response({ weekly: { key: "weekly", state: "unavailable", stale: false, value: null } }),
    );
    renderPage();

    expect(await screen.findByText("Gráfico indisponível no momento.")).toBeInTheDocument();
    expect(screen.queryByTestId("weekly-chart")).not.toBeInTheDocument();
    expect(screen.getByText("47")).toBeInTheDocument();
  });

  it("mostra mensagem de erro quando o BFF não responde", async () => {
    vi.mocked(api.get).mockRejectedValue(new Error("rede"));
    renderPage();

    expect(await screen.findByText("Falha ao carregar o dashboard.")).toBeInTheDocument();
  });
});
