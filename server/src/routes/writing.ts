import { Router } from "express";
import { db } from "../db.js";
import { requireAuth } from "../auth.js";
import { heavyLimiter } from "../lib/rate-limit.js";
import { suggestTitles, generateAbstract, paraphrase } from "../lib/writing-assist.js";

export const writingRouter = Router({ mergeParams: true });

writingRouter.use(requireAuth);

async function projectMarkdown(id: string, userId?: string): Promise<string | null> {
  const project = await db.project.findFirst({
    where: { id, userId },
    include: { files: { where: { type: "MARKDOWN" } } },
  });
  if (!project) return null;
  return project.files.map((f) => f.content || "").join("\n\n");
}

const gatewayError = (res: import("express").Response, error: unknown) => {
  console.error("Writing assist error:", error);
  return res.status(502).json({ error: "Assistente indisponível (ai-gateway)" });
};

writingRouter.post("/titles", heavyLimiter, async (req, res) => {
  const { id } = req.params as { id: string };
  const content = await projectMarkdown(id, req.userId);
  if (content === null) return res.status(404).json({ error: "Project not found" });
  if (!content.trim()) return res.status(400).json({ error: "Sem conteúdo" });
  try {
    const titles = await suggestTitles(content);
    if (titles.length === 0) return gatewayError(res, new Error("empty"));
    return res.json({ titles });
  } catch (error) {
    return gatewayError(res, error);
  }
});

writingRouter.post("/abstract", heavyLimiter, async (req, res) => {
  const { id } = req.params as { id: string };
  const content = await projectMarkdown(id, req.userId);
  if (content === null) return res.status(404).json({ error: "Project not found" });
  if (!content.trim()) return res.status(400).json({ error: "Sem conteúdo" });
  try {
    const abstract = await generateAbstract(content);
    if (!abstract.trim()) return gatewayError(res, new Error("empty"));
    return res.json({ abstract });
  } catch (error) {
    return gatewayError(res, error);
  }
});

writingRouter.post("/paraphrase", heavyLimiter, async (req, res) => {
  const { id } = req.params as { id: string };
  const text = typeof req.body?.text === "string" ? req.body.text : "";
  if (text.length > 20_000) return res.status(400).json({ error: "Texto muito longo" });
  const project = await db.project.findFirst({ where: { id, userId: req.userId } });
  if (!project) return res.status(404).json({ error: "Project not found" });
  if (!text.trim()) return res.status(400).json({ error: "Texto obrigatório" });
  try {
    const result = await paraphrase(text);
    if (!result.trim()) return gatewayError(res, new Error("empty"));
    return res.json({ text: result });
  } catch (error) {
    return gatewayError(res, error);
  }
});
