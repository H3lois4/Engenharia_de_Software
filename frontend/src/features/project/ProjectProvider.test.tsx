import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProjectSelect } from "../../components/ProjectSelect";
import { AuthContext, type AuthState } from "../../auth/useAuth";
import { ProjectProvider } from "./ProjectProvider";
import { useProject } from "./projectContext";

function Probe() {
  const { projectId, setProjectId } = useProject();
  return (
    <>
      <span data-testid="ativo">{projectId}</span>
      <button onClick={() => setProjectId("p2")}>ir para p2</button>
      <button onClick={() => setProjectId("intruso")}>ir para intruso</button>
    </>
  );
}

function renderWith(projects: string[]) {
  const auth: AuthState = {
    user: { user_id: "u1", role: "DEV", project_ids: projects },
    token: "t",
    loginWithToken: vi.fn(),
    loginWithJwt: vi.fn(),
    loginDev: vi.fn(),
    logout: vi.fn(),
  };
  return render(
    <AuthContext.Provider value={auth}>
      <ProjectProvider>
        <Probe />
        <ProjectSelect />
      </ProjectProvider>
    </AuthContext.Provider>,
  );
}

describe("ProjectProvider", () => {
  beforeEach(() => localStorage.clear());

  it("começa no primeiro projeto do token", () => {
    renderWith(["p1", "p2"]);
    expect(screen.getByTestId("ativo")).toHaveTextContent("p1");
  });

  it("troca de projeto e persiste a escolha", () => {
    renderWith(["p1", "p2"]);
    fireEvent.click(screen.getByText("ir para p2"));

    expect(screen.getByTestId("ativo")).toHaveTextContent("p2");
    expect(localStorage.getItem("ms-dashboard.project")).toBe("p2");
  });

  it("restaura a escolha salva quando ela ainda é válida", () => {
    localStorage.setItem("ms-dashboard.project", "p2");
    renderWith(["p1", "p2"]);
    expect(screen.getByTestId("ativo")).toHaveTextContent("p2");
  });

  it("ignora uma escolha salva de projeto a que o usuário não tem acesso", () => {
    localStorage.setItem("ms-dashboard.project", "outro-projeto");
    renderWith(["p1", "p2"]);
    expect(screen.getByTestId("ativo")).toHaveTextContent("p1");
  });

  it("não aceita trocar para um projeto fora do token", () => {
    renderWith(["p1", "p2"]);
    fireEvent.click(screen.getByText("ir para intruso"));

    expect(screen.getByTestId("ativo")).toHaveTextContent("p1");
    expect(localStorage.getItem("ms-dashboard.project")).toBeNull();
  });

  it("fica vazio quando o usuário não participa de nenhum projeto", () => {
    renderWith([]);
    expect(screen.getByTestId("ativo")).toHaveTextContent("");
  });
});

describe("ProjectSelect", () => {
  beforeEach(() => localStorage.clear());

  it("não aparece quando há só um projeto", () => {
    renderWith(["p1"]);
    expect(screen.queryByLabelText("Projeto ativo")).not.toBeInTheDocument();
  });

  it("lista os projetos e muda o projeto ativo", () => {
    renderWith(["p1", "p2"]);
    const select = screen.getByLabelText("Projeto ativo") as HTMLSelectElement;
    expect(Array.from(select.options).map((o) => o.value)).toEqual(["p1", "p2"]);

    fireEvent.change(select, { target: { value: "p2" } });
    expect(screen.getByTestId("ativo")).toHaveTextContent("p2");
  });
});
