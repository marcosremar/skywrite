import { Router } from "express";
import { db } from "../db.js";
import { requireAuth } from "../auth.js";
import { heavyLimiter } from "../lib/rate-limit.js";
import { checkGrammar } from "../lib/grammar.js";

export const grammarRouter = Router({ mergeParams: true });

grammarRouter.use(requireAuth);

grammarRouter.post("/", heavyLimiter, async (req, res) => {
  try {
    const { id } = req.params as { id: string };
    const text = typeof req.body?.text === "string" ? req.body.text : "";
    const language = typeof req.body?.language === "string" ? req.body.language : "pt-BR";

    const project = await db.project.findFirst({ where: { id, userId: req.userId } });
    if (!project) return res.status(404).json({ error: "Project not found" });
    if (!text.trim()) return res.json({ matches: [] });

    try {
      return res.json({ matches: await checkGrammar(text, language) });
    } catch (error) {
      console.error("Grammar check error:", error);
      return res.status(502).json({ error: "Corretor gramatical indisponível" });
    }
  } catch (error) {
    console.error("Grammar route error:", error);
    return res.status(500).json({ error: "Falha na verificação gramatical" });
  }
});
