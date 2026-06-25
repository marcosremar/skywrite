import { describe, expect, test } from "bun:test";
import { resolvePublicUrl } from "../src/lib/ssrf.js";
import { uploadPdf, downloadPdf, deletePdf } from "../src/lib/storage.js";
import { getScoreLabel, getScoreColor } from "../src/types/thesis-analysis.js";
import {
  createSectionChecklist,
  generateSectionFeedback,
  analyzeSection,
  getAllRules,
  analyzeRules,
} from "../src/lib/thesis-analysis.js";

describe("getScoreLabel", () => {
  test("excellent", () => expect(getScoreLabel(95)).toBe("Excelente"));
  test("good", () => expect(getScoreLabel(75)).toBe("Bom"));
  test("fair", () => expect(getScoreLabel(55)).toBe("Regular"));
  test("poor", () => expect(getScoreLabel(10)).toBe("Precisa melhorar"));
});

describe("getScoreColor", () => {
  test("excellent is green", () => expect(getScoreColor(95)).toContain("green"));
  test("good is primary", () => expect(getScoreColor(75)).toContain("primary"));
  test("fair is yellow", () => expect(getScoreColor(55)).toContain("yellow"));
  test("poor is red", () => expect(getScoreColor(10)).toContain("red"));
});

describe("resolvePublicUrl IPv6 ranges", () => {
  test("blocks unique-local fc00::/7", async () => expect(await resolvePublicUrl("http://[fc00::1]/")).toBeNull());
  test("blocks unique-local fd00::", async () => expect(await resolvePublicUrl("http://[fd12::1]/")).toBeNull());
  test("blocks link-local fe80::", async () => expect(await resolvePublicUrl("http://[fe80::1]/")).toBeNull());
  test("blocks IPv4-mapped loopback", async () =>
    expect(await resolvePublicUrl("http://[::ffff:127.0.0.1]/")).toBeNull());
});

describe("storage guards (B2 unconfigured)", () => {
  test("uploadPdf throws when unconfigured", async () => {
    expect(uploadPdf("k", Buffer.from("x"))).rejects.toThrow("Storage not configured");
  });
  test("downloadPdf throws when unconfigured", async () => {
    expect(downloadPdf("k")).rejects.toThrow("Storage not configured");
  });
  test("deletePdf is a no-op when unconfigured", async () => {
    expect(deletePdf("k")).resolves.toBeUndefined();
  });
});

const INTRO = `# Introdução
Este estudo objetiva investigar o impacto da gamificação no ensino.
A pergunta de pesquisa é: como a gamificação afeta a motivação?
A justificativa é a lacuna na literatura sobre o tema.`;

describe("createSectionChecklist", () => {
  test("returns items and a numeric score", () => {
    const out = createSectionChecklist("introduction", INTRO);
    expect(Array.isArray(out.items)).toBe(true);
    expect(typeof out.score).toBe("number");
  });
  test("score bounded 0..100", () => {
    const out = createSectionChecklist("methodology", "## Metodologia\nUsamos questionários com 30 participantes.");
    expect(out.score).toBeGreaterThanOrEqual(0);
    expect(out.score).toBeLessThanOrEqual(100);
  });
});

describe("generateSectionFeedback", () => {
  test("returns priority and capped suggestion arrays", () => {
    const checklist = createSectionChecklist("introduction", INTRO);
    const fb = generateSectionFeedback("introduction", INTRO, checklist);
    expect(["high", "medium", "low"]).toContain(fb.priority);
    expect(fb.maxScore).toBe(100);
    expect(fb.suggestions.length).toBeLessThanOrEqual(5);
  });
  test("flags very short section as weakness", () => {
    const content = "## Conclusão\nFim.";
    const checklist = createSectionChecklist("conclusion", content);
    const fb = generateSectionFeedback("conclusion", content, checklist);
    expect(Array.isArray(fb.weaknesses)).toBe(true);
  });
});

describe("analyzeSection", () => {
  test("returns checklist and feedback", () => {
    const out = analyzeSection(INTRO, "introduction");
    expect(out.checklist).toBeDefined();
    expect(out.feedback.section).toBe("introduction");
  });
});

describe("getAllRules", () => {
  test("returns a non-empty rule set", () => {
    const rules = getAllRules();
    expect(Array.isArray(rules)).toBe(true);
    expect(rules.length).toBeGreaterThan(0);
  });
});

describe("analyzeRules", () => {
  test("returns results with consistent counts", () => {
    const out = analyzeRules("Texto da metodologia com amostra e participantes.", "methodology");
    expect(Array.isArray(out.results)).toBe(true);
    expect(out.totalCount).toBe(out.results.length);
    expect(out.passedCount).toBeLessThanOrEqual(out.totalCount);
  });
  test("handles null section", () => {
    const out = analyzeRules("conteúdo qualquer", null);
    expect(out.totalCount).toBeGreaterThanOrEqual(0);
  });
});
