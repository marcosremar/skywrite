import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { EditorLayout } from "@/components/editor/EditorLayout";

interface EditorPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditorPage({ params }: EditorPageProps) {
  const { id } = await params;
  const session = await auth();

  const project = await db.project.findUnique({
    where: {
      id,
      userId: session?.user.id,
    },
    include: {
      files: {
        orderBy: { path: "asc" },
      },
    },
  });

  if (!project) {
    notFound();
  }

  return <EditorLayout project={project} files={project.files} />;
}
