import { useCallback, useMemo, useState, type ReactNode } from "react";
import { useAuth } from "../../auth/useAuth";
import { ProjectContext } from "./projectContext";

const PROJECT_KEY = "ms-dashboard.project";

/**
 * Mantém o projeto ativo do portal. A escolha é persistida no navegador, mas
 * sempre validada contra os projetos do token: se o usuário perder acesso a um
 * projeto, voltamos ao primeiro disponível.
 */
export function ProjectProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const projects = useMemo(() => user?.project_ids ?? [], [user]);
  const [selected, setSelected] = useState<string | null>(() =>
    localStorage.getItem(PROJECT_KEY),
  );

  const projectId =
    selected && projects.includes(selected) ? selected : (projects[0] ?? "");

  const setProjectId = useCallback(
    (id: string) => {
      if (!projects.includes(id)) return;
      localStorage.setItem(PROJECT_KEY, id);
      setSelected(id);
    },
    [projects],
  );

  const value = useMemo(
    () => ({ projectId, projects, setProjectId }),
    [projectId, projects, setProjectId],
  );

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
}
