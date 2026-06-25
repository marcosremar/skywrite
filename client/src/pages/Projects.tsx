import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/apiFetch";

interface ProjectListItem {
  id: string;
  name: string;
  title: string | null;
  language: string;
  updatedAt: string;
  _count: { files: number; builds: number };
}

export default function Projects() {
  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    apiFetch("/api/projects")
      .then(async (res) => {
        if (!res.ok) throw new Error("fetch failed");
        return res.json();
      })
      .then((data) => {
        if (active) setProjects(data.projects ?? []);
      })
      .catch(() => {
        if (active) setError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const handleDelete = async (id: string) => {
    try {
      const res = await apiFetch(`/api/projects/${id}`, { method: "DELETE" });
      if (res.ok) setProjects((prev) => prev.filter((p) => p.id !== id));
      else toast.error("Não foi possível excluir o projeto");
    } catch {
      toast.error("Falha de conexão ao excluir");
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Meus Projetos</h1>
          <p className="text-muted-foreground">
            Gerencie suas teses e documentos acadêmicos
          </p>
        </div>
        <Link to="/projects/new">
          <Button>Novo Projeto</Button>
        </Link>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Carregando...</p>
      ) : error ? (
        <div className="border-t border-border py-20 text-center">
          <h2 className="font-[family-name:var(--font-display)] text-2xl text-foreground">
            Não foi possível carregar os projetos
          </h2>
          <p className="mx-auto mt-2 max-w-sm text-muted-foreground">
            Verifique sua conexão e tente novamente.
          </p>
          <Button className="mt-6" onClick={() => window.location.reload()}>
            Tentar novamente
          </Button>
        </div>
      ) : projects.length === 0 ? (
        <div className="border-t border-border py-20 text-center">
          <h2 className="font-[family-name:var(--font-display)] text-2xl text-foreground">
            Nenhum projeto ainda
          </h2>
          <p className="mx-auto mt-2 max-w-sm text-muted-foreground">
            Crie seu primeiro projeto para começar a escrever.
          </p>
          <Link to="/projects/new" className="mt-6 inline-block">
            <Button>Criar Projeto</Button>
          </Link>
        </div>
      ) : (
        <div className="grid gap-x-10 gap-y-3 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <div key={project.id} className="relative group">
              <Link
                to={`/projects/${project.id}/editor`}
                className="block border-t border-border pb-6 pt-5 pr-8 transition-colors hover:border-primary"
              >
                <h3 className="font-[family-name:var(--font-display)] text-xl font-normal text-foreground transition-colors group-hover:text-primary">
                  {project.name}
                </h3>
                <p className="mt-1.5 truncate text-sm text-muted-foreground">
                  {project.title || "Sem título definido"}
                </p>
                <div className="mt-5 flex items-center gap-4 font-[family-name:var(--font-code)] text-[11px] uppercase tracking-wider text-muted-foreground/60">
                  <span>{project.language}</span>
                  <span>{project._count.files} arquivos</span>
                  <span>{project._count.builds} builds</span>
                  <span className="ml-auto normal-case tracking-normal text-muted-foreground/45">
                    {new Date(project.updatedAt).toLocaleDateString("pt-BR")}
                  </span>
                </div>
              </Link>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button
                    title="Excluir projeto"
                    className="absolute top-2 right-2 z-10 rounded-md bg-background/80 p-1.5 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive transition"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Excluir projeto?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Isso remove &ldquo;{project.name}&rdquo; e todos os arquivos e builds. Não dá para desfazer.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={() => handleDelete(project.id)}>
                      Excluir
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
