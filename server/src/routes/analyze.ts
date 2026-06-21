import { Router } from "express";
import { db } from "../db.js";
import { requireAuth } from "../auth.js";
import { analyzeThesis } from "../lib/thesis-analysis.js";

export const analyzeRouter = Router({ mergeParams: true });

analyzeRouter.use(requireAuth);

analyzeRouter.post("/", async (req, res) => {
  try {
    const { id } = req.params as { id: string };

    const project = await db.project.findFirst({
      where: { id, userId: req.userId },
      include: { files: { where: { type: "MARKDOWN" } } },
    });
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    const allContent = project.files.map((f) => f.content || "").join("\n\n");
    if (!allContent.trim()) {
      return res.status(400).json({ error: "No content to analyze" });
    }

    const analysis = analyzeThesis(allContent);

    return res.json({
      success: true,
      analysis,
      analyzedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Analysis error:", error);
    return res.status(500).json({ error: "Failed to analyze content" });
  }
});

analyzeRouter.get("/", async (req, res) => {
  const { id } = req.params as { id: string };
  return res.json({ message: "Use POST to run a new analysis", projectId: id });
});
