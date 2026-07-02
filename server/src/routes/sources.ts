import { Router } from "express";
import { db } from "../db.js";
import { requireAuth } from "../auth.js";
import { ingestPaper } from "../lib/paper-ingest.js";
import { heavyLimiter } from "../lib/rate-limit.js";

export const sourcesRouter = Router({ mergeParams: true });

sourcesRouter.use(requireAuth);

const MAX_SOURCES = 20;

async function ownedProject(id: string, userId?: string) {
  return db.project.findFirst({ where: { id, userId } });
}

sourcesRouter.get("/", async (req, res) => {
  const { id } = req.params as { id: string };
  if (!(await ownedProject(id, req.userId))) {
    return res.status(404).json({ error: "Project not found" });
  }
  const sources = await db.projectSource.findMany({
    where: { projectId: id },
    orderBy: { createdAt: "asc" },
    select: { id: true, url: true, title: true, ingested: true },
  });
  return res.json({ sources });
});

sourcesRouter.post("/", heavyLimiter, async (req, res) => {
  const { id } = req.params as { id: string };
  const url = typeof req.body?.url === "string" ? req.body.url.trim() : "";
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return res.status(400).json({ error: "URL inválida" });
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return res.status(400).json({ error: "URL inválida" });
  }
  if (!(await ownedProject(id, req.userId))) {
    return res.status(404).json({ error: "Project not found" });
  }
  const count = await db.projectSource.count({ where: { projectId: id } });
  if (count >= MAX_SOURCES) {
    return res.status(400).json({ error: `Limite de ${MAX_SOURCES} fontes por projeto` });
  }

  let title: string | null = null;
  let ingested = false;
  try {
    const paper = await ingestPaper(url);
    if (paper) {
      title = paper.title;
      ingested = true;
    }
  } catch {
    ingested = false;
  }

  try {
    const source = await db.projectSource.create({
      data: { projectId: id, url, title, ingested },
      select: { id: true, url: true, title: true, ingested: true },
    });
    return res.status(201).json({ source });
  } catch {
    return res.status(409).json({ error: "Fonte já adicionada" });
  }
});

sourcesRouter.delete("/:sourceId", async (req, res) => {
  const { id, sourceId } = req.params as { id: string; sourceId: string };
  if (!(await ownedProject(id, req.userId))) {
    return res.status(404).json({ error: "Project not found" });
  }
  const { count } = await db.projectSource.deleteMany({ where: { id: sourceId, projectId: id } });
  if (count === 0) {
    return res.status(404).json({ error: "Fonte não encontrada" });
  }
  return res.status(204).end();
});
