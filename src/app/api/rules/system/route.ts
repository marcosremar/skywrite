import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// GET /api/rules/system - Get only system (built-in) rules
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rules = await db.rule.findMany({
      where: {
        isBuiltIn: true,
      },
      orderBy: [
        { category: "asc" },
        { name: "asc" },
      ],
    });

    return NextResponse.json({ rules });
  } catch (error) {
    console.error("Error fetching system rules:", error);
    return NextResponse.json(
      { error: "Failed to fetch system rules" },
      { status: 500 }
    );
  }
}
