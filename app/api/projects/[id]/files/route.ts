import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// POST /api/projects/[id]/files - Create new file
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
    const { path, content, type } = body;

    if (!path) {
      return NextResponse.json({ error: "Path is required" }, { status: 400 });
    }

    // Verify project ownership
    const project = await db.project.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Extract name from path
    const pathParts = path.split("/");
    const name = pathParts[pathParts.length - 1];

    // Create file
    const file = await db.projectFile.create({
      data: {
        projectId: id,
        path,
        name,
        content: content || "",
        type: type || "OTHER",
        sizeBytes: Buffer.byteLength(content || "", "utf8"),
      },
    });

    return NextResponse.json({ file });
  } catch (error) {
    console.error("Error creating file:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
