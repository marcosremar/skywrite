import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { analyzeThesis } from "@/lib/thesis-analysis";

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

    // Get project and verify ownership
    const project = await db.project.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
      include: {
        files: {
          where: {
            type: "MARKDOWN",
          },
        },
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Combine all markdown content
    const allContent = project.files
      .map((f) => f.content || "")
      .join("\n\n");

    if (!allContent.trim()) {
      return NextResponse.json(
        { error: "No content to analyze" },
        { status: 400 }
      );
    }

    // Perform analysis
    const analysis = analyzeThesis(allContent);

    // In the future, this could call an AI API for more advanced analysis
    // const aiAnalysis = await callAIAnalysis(allContent);

    return NextResponse.json({
      success: true,
      analysis,
      analyzedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Analysis error:", error);
    return NextResponse.json(
      { error: "Failed to analyze content" },
      { status: 500 }
    );
  }
}

// GET endpoint to retrieve cached analysis (optional)
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

    // For now, just return a prompt to run analysis
    // In the future, this could retrieve cached analysis from the database
    return NextResponse.json({
      message: "Use POST to run a new analysis",
      projectId: id,
    });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { error: "Failed to get analysis" },
      { status: 500 }
    );
  }
}
