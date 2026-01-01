import { NextResponse } from "next/server";
import { getTemplates } from "@/lib/templates";

// GET /api/templates - List all available templates
export async function GET() {
  try {
    const templates = await getTemplates();
    return NextResponse.json({ templates });
  } catch (error) {
    console.error("Error fetching templates:", error);
    return NextResponse.json(
      { error: "Error fetching templates" },
      { status: 500 }
    );
  }
}
