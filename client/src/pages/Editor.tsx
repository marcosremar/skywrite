import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { EditorLayout } from "@/components/editor/EditorLayout";
import { apiFetch } from "@/lib/apiFetch";
import type { Project, ProjectFile } from "@/types/models";

export default function Editor() {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<(Project & { files: ProjectFile[] }) | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch(`/api/projects/${id}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setProject(data?.project ?? null))
      .catch(() => setProject(null))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        Carregando projeto...
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Projeto nao encontrado</p>
        <Link to="/projects" className="text-primary hover:underline">
          Voltar para projetos
        </Link>
      </div>
    );
  }

  return <EditorLayout project={project} files={project.files} />;
}
