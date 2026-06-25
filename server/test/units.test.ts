import { describe, expect, test } from "bun:test";
import { resolvePdfUrl, htmlToText, relevantExcerpts } from "../src/lib/paper-ingest.js";
import { analyzeThesis } from "../src/lib/thesis-analysis.js";
import { parseBibTeX } from "../src/lib/bibtex.js";
import { parseResearchResponse } from "../src/routes/research.js";

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

describe("parseBibTeX", () => {
  test("extracts key, title, doi from entries", () => {
    const bib = `@article{krashen1984,
  title = {The Input Hypothesis},
  author = {Krashen, Stephen},
  doi = {10.2307/3586393},
  year = {1984}
}
@book{exemplo,
  title = {Outro Titulo},
  year = {2020}
}`;
    const entries = parseBibTeX(bib);
    expect(entries.length).toBe(2);
    expect(entries[0].key).toBe("krashen1984");
    expect(entries[0].title).toBe("The Input Hypothesis");
    expect(entries[0].doi).toBe("10.2307/3586393");
    expect(entries[1].type).toBe("book");
  });
  test("handles nested braces in field values", () => {
    const entries = parseBibTeX(`@article{x, title = {The {LaTeX} Companion}, year = {2020}}`);
    expect(entries.length).toBe(1);
    expect(entries[0].title).toBe("The {LaTeX} Companion");
    expect(entries[0].year).toBe("2020");
  });
  test("parses entry ending without trailing newline", () => {
    const entries = parseBibTeX(`@book{y, title = {Solo}}`);
    expect(entries.length).toBe(1);
    expect(entries[0].title).toBe("Solo");
  });
});

describe("parseResearchResponse", () => {
  test("parses valid JSON object", () => {
    const raw = JSON.stringify({
      answer: "resposta",
      verdicts: [{ claim: "X", classification: "supported", evidence: "trecho", source: 1 }],
    });
    const out = parseResearchResponse(raw);
    expect(out.answer).toBe("resposta");
    expect(out.verdicts).toHaveLength(1);
    expect(out.verdicts[0].classification).toBe("supported");
  });
  test("strips code fences", () => {
    const raw = '```json\n{"answer":"oi","verdicts":[]}\n```';
    expect(parseResearchResponse(raw).answer).toBe("oi");
  });
  test("coerces invalid classification to uncertain", () => {
    const raw = '{"answer":"a","verdicts":[{"claim":"c","classification":"bogus"}]}';
    expect(parseResearchResponse(raw).verdicts[0].classification).toBe("uncertain");
  });
  test("falls back to raw text when not JSON", () => {
    const out = parseResearchResponse("texto solto");
    expect(out.answer).toBe("texto solto");
    expect(out.verdicts).toEqual([]);
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
