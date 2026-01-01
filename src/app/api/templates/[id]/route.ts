import { NextResponse } from "next/server";
import { getTemplate, getTemplateDefaultFiles, getTemplateLatexFiles } from "@/lib/templates";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/templates/[id] - Get specific template details
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const template = await getTemplate(id);

    if (!template) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      );
    }

    // Get additional files info
    const defaultFiles = await getTemplateDefaultFiles(id);
    const latexFiles = await getTemplateLatexFiles(id);

    return NextResponse.json({
      template,
      defaultFiles,
      latexFiles,
    });
  } catch (error) {
    console.error("Error fetching template:", error);
    return NextResponse.json(
      { error: "Error fetching template" },
      { status: 500 }
    );
  }
}
