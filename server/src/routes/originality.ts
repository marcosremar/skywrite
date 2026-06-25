import { Router } from "express";
import { db } from "../db.js";
import { requireAuth } from "../auth.js";
import { heavyLimiter } from "../lib/rate-limit.js";
import { isOriginalityConfigured, checkOriginality } from "../lib/originality.js";

export const originalityRouter = Router({ mergeParams: true });

originalityRouter.use(requireAuth);

originalityRouter.post("/", heavyLimiter, async (req, res) => {
  try {
    const { id } = req.params as { id: string };
    const project = await db.project.findFirst({
      where: { id, userId: req.userId },
      include: { files: { where: { type: "MARKDOWN" } } },
    });
    if (!project) return res.status(404).json({ error: "Project not found" });
    if (!isOriginalityConfigured()) {
      return res.json({ configured: false });
    }
    const text = project.files.map((f) => f.content || "").join("\n\n");
    if (!text.trim()) return res.status(400).json({ error: "Sem conteúdo" });
    try {
      return res.json({ configured: true, ...(await checkOriginality(text)) });
    } catch (error) {
      console.error("Originality provider error:", error);
      return res.status(502).json({ error: "Provedor de originalidade indisponível" });
    }
  } catch (error) {
    console.error("Originality route error:", error);
    return res.status(500).json({ error: "Falha na verificação de originalidade" });
  }
});
