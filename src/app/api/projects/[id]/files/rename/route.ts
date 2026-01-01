import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// POST /api/projects/[id]/files/rename - Rename file
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { oldPath, newPath, updateReferences } = body;

    if (!oldPath || !newPath) {
      return NextResponse.json(
        { error: "Old path and new path are required" },
        { status: 400 }
      );
    }

    // Verify project ownership
    const project = await db.project.findFirst({
      where: { id, userId: session.user.id },
      include: { files: true },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Extract new name from path
    const newPathParts = newPath.split("/");
    const newName = newPathParts[newPathParts.length - 1];

    // Check if file with new path already exists
    const existingFile = await db.projectFile.findFirst({
      where: { projectId: id, path: newPath },
    });

    if (existingFile) {
      return NextResponse.json(
        { error: "File with this name already exists" },
        { status: 400 }
      );
    }

    // Update file
    const file = await db.projectFile.update({
      where: {
        projectId_path: {
          projectId: id,
          path: oldPath,
        },
      },
      data: {
        path: newPath,
        name: newName,
        updatedAt: new Date(),
      },
    });

    // Update references in other files if requested
    if (updateReferences) {
      const oldFileName = oldPath.split("/").pop() || "";
      const newFileName = newPath.split("/").pop() || "";

      // Find all files that might reference this file
      const filesToUpdate = project.files.filter(
        (f) =>
          f.path !== oldPath &&
          f.content &&
          (f.content.includes(oldFileName) || f.content.includes(oldPath))
      );

      // Update each file
      for (const fileToUpdate of filesToUpdate) {
        let updatedContent = fileToUpdate.content || "";
        // Replace full path references
        updatedContent = updatedContent.split(oldPath).join(newPath);
        // Replace filename references
        updatedContent = updatedContent.split(oldFileName).join(newFileName);

        await db.projectFile.update({
          where: { id: fileToUpdate.id },
          data: {
            content: updatedContent,
            updatedAt: new Date(),
          },
        });
      }
    }

    return NextResponse.json({ file });
  } catch (error) {
    console.error("Error renaming file:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
