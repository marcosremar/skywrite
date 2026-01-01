import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { RuleCategory, RuleType, RuleSeverity } from "@prisma/client";

// GET /api/rules - Get all rules for user (system + user + project rules)
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");
    const category = searchParams.get("category") as RuleCategory | null;
    const type = searchParams.get("type") as RuleType | null;

    // Build where clause
    const where: any = {
      OR: [
        { isBuiltIn: true }, // System rules
        { userId: session.user.id }, // User's global rules
      ],
      isEnabled: true,
    };

    // Add project-specific rules if projectId provided
    if (projectId) {
      where.OR.push({ projectId });
    }

    // Filter by category if provided
    if (category) {
      where.category = category;
    }

    // Filter by type if provided
    if (type) {
      where.type = type;
    }

    const rules = await db.rule.findMany({
      where,
      include: {
        referenceFile: {
          select: {
            id: true,
            name: true,
            originalName: true,
          },
        },
      },
      orderBy: [
        { isBuiltIn: "desc" },
        { category: "asc" },
        { name: "asc" },
      ],
    });

    return NextResponse.json({ rules });
  } catch (error) {
    console.error("Error fetching rules:", error);
    return NextResponse.json(
      { error: "Failed to fetch rules" },
      { status: 500 }
    );
  }
}

// POST /api/rules - Create a new rule
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      description,
      category,
      pattern,
      section,
      severity,
      weight,
      projectId,
      referenceFileId,
    } = body;

    // Validate required fields
    if (!name || !pattern || !category) {
      return NextResponse.json(
        { error: "Name, pattern, and category are required" },
        { status: 400 }
      );
    }

    // Validate category
    if (!Object.values(RuleCategory).includes(category)) {
      return NextResponse.json(
        { error: "Invalid category" },
        { status: 400 }
      );
    }

    // Determine rule type
    let type: RuleType = RuleType.USER;
    if (referenceFileId) {
      type = RuleType.REFERENCE;
    }

    const rule = await db.rule.create({
      data: {
        name,
        description,
        category,
        type,
        pattern,
        section,
        severity: severity || RuleSeverity.WARNING,
        weight: weight || 1,
        userId: session.user.id,
        projectId,
        referenceFileId,
        isBuiltIn: false,
        isEnabled: true,
      },
      include: {
        referenceFile: {
          select: {
            id: true,
            name: true,
            originalName: true,
          },
        },
      },
    });

    return NextResponse.json({ rule }, { status: 201 });
  } catch (error) {
    console.error("Error creating rule:", error);
    return NextResponse.json(
      { error: "Failed to create rule" },
      { status: 500 }
    );
  }
}
