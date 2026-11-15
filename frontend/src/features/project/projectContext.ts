import { createContext, useContext } from "react";

export interface ProjectState {
  /** Projeto ativo ("" quando o usuário não participa de nenhum). */
  projectId: string;
  /** Todos os projetos presentes no token do usuário. */
  projects: string[];
  setProjectId: (id: string) => void;
}

export const ProjectContext = createContext<ProjectState | null>(null);

export function useProject(): ProjectState {
  const ctx = useContext(ProjectContext);
  if (!ctx) throw new Error("useProject deve ser usado dentro de ProjectProvider");
  return ctx;
}
