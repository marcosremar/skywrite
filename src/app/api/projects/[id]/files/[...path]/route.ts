import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// GET /api/projects/[id]/files/[...path] - Get file content
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; path: string[] }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, path } = await params;
    const filePath = path.join("/");

    const file = await db.projectFile.findFirst({
      where: {
        projectId: id,
        path: filePath,
        project: { userId: session.user.id },
      },
    });

    if (!file) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    return NextResponse.json(file);
  } catch (error) {
    console.error("Error fetching file:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT /api/projects/[id]/files/[...path] - Update file content
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; path: string[] }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, path } = await params;
    const filePath = path.join("/");
    const body = await request.json();
    const { content } = body;

    // Verify project ownership
    const project = await db.project.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const file = await db.projectFile.update({
      where: {
        projectId_path: {
          projectId: id,
          path: filePath,
        },
      },
      data: {
        content,
        sizeBytes: Buffer.byteLength(content || "", "utf8"),
        updatedAt: new Date(),
      },
    });

    return NextResponse.json(file);
  } catch (error) {
    console.error("Error updating file:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/projects/[id]/files/[...path] - Delete file
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; path: string[] }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, path } = await params;
    const filePath = path.join("/");

    // Verify project ownership
    const project = await db.project.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    await db.projectFile.delete({
      where: {
        projectId_path: {
          projectId: id,
          path: filePath,
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting file:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
