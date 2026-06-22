import { Router } from "express";
import { db } from "../db.js";
import { requireAuth } from "../auth.js";
import { heavyLimiter } from "../lib/rate-limit.js";
import { parseBibTeX } from "../lib/bibtex.js";
import { checkCitations } from "../lib/crossref.js";

export const citationsRouter = Router({ mergeParams: true });

citationsRouter.use(requireAuth);

citationsRouter.post("/check", heavyLimiter, async (req, res) => {
  try {
    const { id } = req.params as { id: string };
    const project = await db.project.findFirst({
      where: { id, userId: req.userId },
      include: { files: { where: { type: "BIBTEX" } } },
    });
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    const bib = project.files.map((f) => f.content || "").join("\n");
    const entries = parseBibTeX(bib);
    if (entries.length === 0) {
      return res.json({ results: [], message: "Nenhuma referência encontrada" });
    }

    const results = await checkCitations(entries);
    return res.json({ results });
  } catch (error) {
    console.error("Citation check error:", error);
    return res.status(500).json({ error: "Falha ao verificar referências" });
  }
});
