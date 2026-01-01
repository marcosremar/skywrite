import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { RuleCategory, RuleSeverity } from "@prisma/client";

// GET /api/rules/[id] - Get a specific rule
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

    const rule = await db.rule.findFirst({
      where: {
        id,
        OR: [
          { isBuiltIn: true },
          { userId: session.user.id },
        ],
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

    if (!rule) {
      return NextResponse.json({ error: "Rule not found" }, { status: 404 });
    }

    return NextResponse.json({ rule });
  } catch (error) {
    console.error("Error fetching rule:", error);
    return NextResponse.json(
      { error: "Failed to fetch rule" },
      { status: 500 }
    );
  }
}

// PUT /api/rules/[id] - Update a rule
export async function PUT(
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

    // Check if rule exists and user has permission
    const existingRule = await db.rule.findFirst({
      where: {
        id,
        OR: [
          { userId: session.user.id },
          { isBuiltIn: true }, // Can only toggle enabled for built-in
        ],
      },
    });

    if (!existingRule) {
      return NextResponse.json({ error: "Rule not found" }, { status: 404 });
    }

    // For built-in rules, only allow toggling enabled status
    if (existingRule.isBuiltIn) {
      const rule = await db.rule.update({
        where: { id },
        data: { isEnabled: body.isEnabled ?? existingRule.isEnabled },
      });
      return NextResponse.json({ rule });
    }

    // For user rules, allow full updates
    const {
      name,
      description,
      category,
      pattern,
      section,
      severity,
      weight,
      isEnabled,
    } = body;

    const rule = await db.rule.update({
      where: { id },
      data: {
        name: name ?? existingRule.name,
        description: description !== undefined ? description : existingRule.description,
        category: category ?? existingRule.category,
        pattern: pattern ?? existingRule.pattern,
        section: section !== undefined ? section : existingRule.section,
        severity: severity ?? existingRule.severity,
        weight: weight ?? existingRule.weight,
        isEnabled: isEnabled ?? existingRule.isEnabled,
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

    return NextResponse.json({ rule });
  } catch (error) {
    console.error("Error updating rule:", error);
    return NextResponse.json(
      { error: "Failed to update rule" },
      { status: 500 }
    );
  }
}

// DELETE /api/rules/[id] - Delete a rule
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

    // Check if rule exists and user has permission
    const existingRule = await db.rule.findFirst({
      where: {
        id,
        userId: session.user.id, // Only owner can delete
        isBuiltIn: false, // Cannot delete built-in rules
      },
    });

    if (!existingRule) {
      return NextResponse.json(
        { error: "Rule not found or cannot be deleted" },
        { status: 404 }
      );
    }

    await db.rule.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting rule:", error);
    return NextResponse.json(
      { error: "Failed to delete rule" },
      { status: 500 }
    );
  }
}
