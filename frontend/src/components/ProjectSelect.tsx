import { useProject } from "../features/project/projectContext";

// Só aparece quando o usuário participa de mais de um projeto.
export function ProjectSelect() {
  const { projectId, projects, setProjectId } = useProject();
  if (projects.length < 2) return null;

  return (
    <label className="flex items-center gap-2 text-sm text-white/80">
      <span className="sr-only sm:not-sr-only">Projeto</span>
      <select
        value={projectId}
        onChange={(e) => setProjectId(e.target.value)}
        aria-label="Projeto ativo"
        className="rounded-md border border-white/30 bg-primary-hover px-2 py-1 text-sm text-white"
      >
        {projects.map((p) => (
          <option key={p} value={p}>
            {p}
          </option>
        ))}
      </select>
    </label>
  );
}
