import { Router } from "express";
import { db } from "../db.js";
import { requireAuth } from "../auth.js";
import { heavyLimiter } from "../lib/rate-limit.js";
import { analyzeThesis } from "../lib/thesis-analysis.js";
import type { ThesisAnalysis } from "../types/thesis-analysis.js";
import { markdownToPdf } from "../lib/pdf.js";

export const reportRouter = Router({ mergeParams: true });

reportRouter.use(requireAuth);

function list(items: string[]): string {
  return items.length ? items.map((i) => `- ${i}`).join("\n") : "- (nenhum)";
}

export function buildReportMarkdown(projectName: string, analysis: ThesisAnalysis): string {
  const sections = analysis.sections
    .map(
      (s) =>
        `### ${s.sectionLabel} — ${s.score}/${s.maxScore} (prioridade: ${s.priority})

**Pontos fortes**
${list(s.strengths)}

**A melhorar**
${list(s.weaknesses)}

**Sugestões**
${list(s.suggestions)}`
    )
    .join("\n\n");

  const uncited = analysis.citations.uncitedAssertions.map((u) => u.text).slice(0, 15);

  return `---
title: "Relatório de Feedback — ${projectName}"
---

# Pontuação geral: ${analysis.overallScore}/100

## Pontos fortes
${list(analysis.summary.strongPoints)}

## Áreas de melhoria
${list(analysis.summary.improvementAreas)}

## Avaliação por seção

${sections}

## Citações

Afirmações com citação: ${analysis.citations.citedAssertions}/${analysis.citations.totalAssertions} (score ${analysis.citations.score}/100).

**Afirmações sem suporte (amostra)**
${list(uncited)}
`;
}

reportRouter.post("/", heavyLimiter, async (req, res) => {
  try {
    const { id } = req.params as { id: string };
    const project = await db.project.findFirst({
      where: { id, userId: req.userId },
      include: { files: { where: { type: "MARKDOWN" } } },
    });
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    const content = project.files.map((f) => f.content || "").join("\n\n");
    if (!content.trim()) {
      return res.status(400).json({ error: "Sem conteúdo para analisar" });
    }

    const analysis = analyzeThesis(content);
    const markdown = buildReportMarkdown(project.title || project.name, analysis);
    const pdf = await markdownToPdf(markdown);

    const safeName = project.name.replace(/[^a-zA-Z0-9-_]+/g, "_") || "relatorio";
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${safeName}-relatorio.pdf"`);
    return res.send(pdf);
  } catch (error) {
    console.error("Report error:", error);
    return res.status(500).json({ error: "Falha ao gerar o relatório" });
  }
});
