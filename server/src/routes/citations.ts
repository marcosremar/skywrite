import { Router } from "express";
import { db } from "../db.js";
import { requireAuth } from "../auth.js";
import { heavyLimiter } from "../lib/rate-limit.js";
import { parseBibTeX } from "../lib/bibtex.js";
import { checkCitations } from "../lib/crossref.js";
import { crossCheckCitations, checkAbntCompleteness } from "../lib/citation-integrity.js";
import { doiToBibTeX } from "../lib/doi-bibtex.js";
import { sourceToBibTeX } from "../lib/source-citation.js";
import { risToBibTeX } from "../lib/ris.js";
import { submissionReadiness } from "../lib/submission.js";

export const citationsRouter = Router({ mergeParams: true });

citationsRouter.use(requireAuth);

citationsRouter.post("/from-source", heavyLimiter, async (req, res) => {
  try {
    const { id } = req.params as { id: string };
    const title = typeof req.body?.title === "string" ? req.body.title : "";
    const url = typeof req.body?.url === "string" ? req.body.url : "";
    const project = await db.project.findFirst({ where: { id, userId: req.userId } });
    if (!project) return res.status(404).json({ error: "Project not found" });
    if (!title.trim() && !url.trim()) return res.status(400).json({ error: "Fonte obrigatória" });
    return res.json(await sourceToBibTeX(title, url));
  } catch (error) {
    console.error("Source citation error:", error);
    return res.status(500).json({ error: "Falha ao gerar citação" });
  }
});

citationsRouter.post("/ris", async (req, res) => {
  try {
    const { id } = req.params as { id: string };
    const ris = typeof req.body?.ris === "string" ? req.body.ris : "";
    const project = await db.project.findFirst({ where: { id, userId: req.userId } });
    if (!project) return res.status(404).json({ error: "Project not found" });
    if (!ris.trim()) return res.status(400).json({ error: "RIS obrigatório" });
    const bibtex = risToBibTeX(ris);
    if (!bibtex) return res.status(400).json({ error: "Nenhum registro RIS válido" });
    return res.json({ bibtex });
  } catch (error) {
    console.error("RIS import error:", error);
    return res.status(500).json({ error: "Falha ao importar RIS" });
  }
});

citationsRouter.post("/submission", async (req, res) => {
  try {
    const { id } = req.params as { id: string };
    const project = await db.project.findFirst({
      where: { id, userId: req.userId },
      include: { files: { where: { type: { in: ["MARKDOWN", "BIBTEX"] } } } },
    });
    if (!project) return res.status(404).json({ error: "Project not found" });
    const markdown = project.files
      .filter((f) => f.type === "MARKDOWN")
      .map((f) => f.content || "")
      .join("\n\n");
    const bib = project.files
      .filter((f) => f.type === "BIBTEX")
      .map((f) => f.content || "")
      .join("\n");
    return res.json({ checks: submissionReadiness(markdown, parseBibTeX(bib)) });
  } catch (error) {
    console.error("Submission readiness error:", error);
    return res.status(500).json({ error: "Falha ao verificar prontidão" });
  }
});

citationsRouter.post("/doi", heavyLimiter, async (req, res) => {
  try {
    const doi = typeof req.body?.doi === "string" ? req.body.doi : "";
    if (!doi.trim()) {
      return res.status(400).json({ error: "DOI obrigatório" });
    }
    const bibtex = await doiToBibTeX(doi);
    if (!bibtex) {
      return res.status(404).json({ error: "DOI não encontrado no Crossref" });
    }
    return res.json({ bibtex });
  } catch (error) {
    console.error("DOI lookup error:", error);
    return res.status(500).json({ error: "Falha ao buscar o DOI" });
  }
});

citationsRouter.post("/integrity", async (req, res) => {
  try {
    const { id } = req.params as { id: string };
    const project = await db.project.findFirst({
      where: { id, userId: req.userId },
      include: { files: { where: { type: { in: ["MARKDOWN", "BIBTEX"] } } } },
    });
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    const markdown = project.files
      .filter((f) => f.type === "MARKDOWN")
      .map((f) => f.content || "")
      .join("\n\n");
    const bib = project.files
      .filter((f) => f.type === "BIBTEX")
      .map((f) => f.content || "")
      .join("\n");
    const entries = parseBibTeX(bib);

    const { orphans, unused } = crossCheckCitations(markdown, entries);
    return res.json({ orphans, unused, incomplete: checkAbntCompleteness(entries) });
  } catch (error) {
    console.error("Citation integrity error:", error);
    return res.status(500).json({ error: "Falha ao verificar integridade das citações" });
  }
});

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
