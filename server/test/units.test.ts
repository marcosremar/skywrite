import { describe, expect, test } from "bun:test";
import { resolvePdfUrl, htmlToText, relevantExcerpts } from "../src/lib/paper-ingest.js";
import { analyzeThesis } from "../src/lib/thesis-analysis.js";

describe("resolvePdfUrl", () => {
  test("converts arxiv abs to pdf", () => {
    expect(resolvePdfUrl("https://arxiv.org/abs/2502.10291v2")).toBe(
      "https://arxiv.org/pdf/2502.10291v2"
    );
  });
  test("leaves non-arxiv url unchanged", () => {
    expect(resolvePdfUrl("https://example.com/paper.pdf")).toBe(
      "https://example.com/paper.pdf"
    );
  });
});

describe("htmlToText", () => {
  test("strips tags, scripts and entities", () => {
    const out = htmlToText("<p>Olá <script>x()</script>&amp; <b>mundo</b></p>");
    expect(out).toBe("Olá & mundo");
  });
});

describe("relevantExcerpts", () => {
  test("extracts window around keyword", () => {
    const content = "x".repeat(500) + " inteligencia artificial " + "y".repeat(500);
    const out = relevantExcerpts(content, "inteligencia", 2000);
    expect(out).toContain("inteligencia artificial");
  });
  test("falls back to head when no keyword hit", () => {
    const content = "conteudo sem termos relevantes aqui";
    const out = relevantExcerpts(content, "zzzz", 20);
    expect(out.length).toBeLessThanOrEqual(20);
  });
});

describe("analyzeThesis", () => {
  test("returns structured analysis with sections", () => {
    const md = `# Introdução\nEste trabalho investiga X.\n\n# Metodologia\nUsamos questionários.`;
    const result = analyzeThesis(md);
    expect(result).toBeDefined();
    expect(Array.isArray(result.sections)).toBe(true);
    expect(result.sections.length).toBeGreaterThan(0);
  });
});
