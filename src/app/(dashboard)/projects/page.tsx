import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function ProjectsPage() {
  const session = await auth();

  const projects = await db.project.findMany({
    where: { userId: session?.user.id },
    orderBy: { updatedAt: "desc" },
    include: {
      _count: {
        select: { files: true, builds: true },
      },
    },
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Meus Projetos</h1>
          <p className="text-zinc-500">
            Gerencie suas teses e documentos academicos
          </p>
        </div>
        <Link href="/projects/new">
          <Button>Novo Projeto</Button>
        </Link>
      </div>

      {projects.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <div className="text-6xl mb-4">📝</div>
            <h2 className="text-xl font-semibold mb-2">
              Nenhum projeto ainda
            </h2>
            <p className="text-zinc-500 mb-4">
              Crie seu primeiro projeto para comecar a escrever
            </p>
            <Link href="/projects/new">
              <Button>Criar Projeto</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Link key={project.id} href={`/projects/${project.id}/editor`}>
              <Card className="hover:border-primary transition-colors cursor-pointer h-full">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg">{project.name}</CardTitle>
                    <Badge variant="secondary">{project.language}</Badge>
                  </div>
                  <CardDescription>
                    {project.title || "Sem titulo definido"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-4 text-sm text-zinc-500">
                    <span>{project._count.files} arquivos</span>
                    <span>{project._count.builds} builds</span>
                  </div>
                  <p className="text-xs text-zinc-400 mt-2">
                    Atualizado em{" "}
                    {new Date(project.updatedAt).toLocaleDateString("pt-BR")}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
