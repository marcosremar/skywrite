import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// GET /api/reference-files/[id] - Get a specific reference file
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const file = await db.referenceFile.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
      include: {
        rules: {
          select: {
            id: true,
            name: true,
            description: true,
            pattern: true,
            category: true,
            section: true,
            isEnabled: true,
          },
        },
      },
    });

    if (!file) {
      return NextResponse.json({ error: "Reference file not found" }, { status: 404 });
    }

    return NextResponse.json({ file });
  } catch (error) {
    console.error("Error fetching reference file:", error);
    return NextResponse.json(
      { error: "Failed to fetch reference file" },
      { status: 500 }
    );
  }
}

// DELETE /api/reference-files/[id] - Delete a reference file and its rules
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Check if file exists and user has permission
    const existingFile = await db.referenceFile.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!existingFile) {
      return NextResponse.json(
        { error: "Reference file not found" },
        { status: 404 }
      );
    }

    // Delete associated rules first
    await db.rule.deleteMany({
      where: { referenceFileId: id },
    });

    // Delete the reference file
    await db.referenceFile.delete({
      where: { id },
    });

    // In production: also delete from S3/R2
    // await deleteFromStorage(existingFile.storageKey);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting reference file:", error);
    return NextResponse.json(
      { error: "Failed to delete reference file" },
      { status: 500 }
    );
  }
}
