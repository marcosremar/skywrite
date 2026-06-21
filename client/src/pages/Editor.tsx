import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { EditorLayout } from "@/components/editor/EditorLayout";
import type { Project, ProjectFile } from "@/types/models";

export default function Editor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<(Project & { files: ProjectFile[] }) | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/projects/${id}`)
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
        <button
          className="text-primary hover:underline"
          onClick={() => navigate("/projects")}
        >
          Voltar para projetos
        </button>
      </div>
    );
  }

  return <EditorLayout project={project} files={project.files} />;
}
