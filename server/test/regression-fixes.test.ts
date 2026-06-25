import { describe, expect, test } from "bun:test";
import { mapLimit } from "../src/lib/crossref.js";
import { buildReportMarkdown } from "../src/routes/report.js";
import { sourceToBibTeX } from "../src/lib/source-citation.js";
import { parseBibTeX } from "../src/lib/bibtex.js";
import { rewriteFileReferences } from "../src/lib/file-references.js";
import type { ThesisAnalysis } from "../src/types/thesis-analysis.js";

describe("mapLimit", () => {
  test("processes every item even with non-positive concurrency", async () => {
    const out = await mapLimit([1, 2, 3], 0, async (n) => n * 2);
    expect(out).toEqual([2, 4, 6]);
  });
  test("handles empty input", async () => {
    expect(await mapLimit([], 5, async (n) => n)).toEqual([]);
  });
});

describe("buildReportMarkdown", () => {
  const analysis: ThesisAnalysis = {
    overallScore: 50,
    sections: [],
    checklists: [],
    rules: { results: [], passedCount: 0, totalCount: 0 },
    citations: { totalAssertions: 0, citedAssertions: 0, uncitedAssertions: [], score: 100 },
    summary: { strongPoints: [], improvementAreas: [] },
    analyzedAt: new Date(),
  };
  test("escapes double quotes in the title to keep YAML valid", () => {
    const md = buildReportMarkdown(`Minha "Grande" Tese`, analysis);
    expect(md).toContain('title: "Relatório de Feedback — Minha \\"Grande\\" Tese"');
    expect(md).not.toContain('Minha "Grande"');
  });
});

describe("sourceToBibTeX", () => {
  test("produces brace-balanced BibTeX when title/url contain braces", async () => {
    const realFetch = globalThis.fetch;
    globalThis.fetch = (() => Promise.reject(new Error("offline"))) as typeof fetch;
    try {
      const { bibtex, resolved } = await sourceToBibTeX("Study of {nested} systems}", "http://x/{y}");
      expect(resolved).toBe(false);
      expect((bibtex.match(/{/g) || []).length).toBe((bibtex.match(/}/g) || []).length);
      const [entry] = parseBibTeX(bibtex);
      expect(entry.title).toBe("Study of nested systems");
    } finally {
      globalThis.fetch = realFetch;
    }
  });
});

describe("rewriteFileReferences", () => {
  test("rewrites the renamed link without touching siblings that share the suffix", () => {
    const md = "[a](notes.md) and [b](old-notes.md)";
    expect(rewriteFileReferences(md, "notes.md", "summary.md")).toBe(
      "[a](summary.md) and [b](old-notes.md)"
    );
  });
  test("rewrites both full-path and bare-name references", () => {
    const md = "[a](chapters/intro.md) [b](intro.md)";
    expect(rewriteFileReferences(md, "chapters/intro.md", "chapters/preface.md")).toBe(
      "[a](chapters/preface.md) [b](preface.md)"
    );
  });
});
