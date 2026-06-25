import { afterEach, describe, expect, test } from "bun:test";
import { risToBibTeX } from "../src/lib/ris.js";
import { submissionReadiness } from "../src/lib/submission.js";
import { isOriginalityConfigured, checkOriginality } from "../src/lib/originality.js";
import type { BibEntry } from "../src/lib/bibtex.js";

describe("risToBibTeX", () => {
  const ris = `TY  - JOUR
AU  - Krashen, Stephen
TI  - The Input Hypothesis
JO  - Language Learning
PY  - 1984
DO  - 10.1/x
ER  -`;

  test("converts a journal record", () => {
    const out = risToBibTeX(ris);
    expect(out).toContain("@article{krashen1984,");
    expect(out).toContain("author = {Krashen, Stephen}");
    expect(out).toContain("journal = {Language Learning}");
    expect(out).toContain("doi = {10.1/x}");
  });

  test("maps book type and joins authors", () => {
    const out = risToBibTeX(`TY  - BOOK\nAU  - Silva, A\nAU  - Souza, B\nTI  - Livro\nPY  - 2000\nER  -`);
    expect(out).toContain("@book{");
    expect(out).toContain("author = {Silva, A and Souza, B}");
  });

  test("ignores records without title", () => {
    expect(risToBibTeX(`TY  - JOUR\nAU  - X\nER  -`)).toBe("");
  });

  test("handles multiple records", () => {
    const out = risToBibTeX(`TY  - JOUR\nTI  - A\nER  -\nTY  - JOUR\nTI  - B\nER  -`);
    expect(out.match(/@article/g)?.length).toBe(2);
  });
});

const entry = (e: Partial<BibEntry> & { key: string }): BibEntry => ({ type: "article", ...e });

describe("submissionReadiness", () => {
  test("passes a complete thesis", () => {
    const md = `# Resumo\nx\n# Introdução\nx\n# Metodologia\nx\n# Conclusão\n${"palavra ".repeat(1000)}[@a2020]`;
    const checks = submissionReadiness(md, [entry({ key: "a2020", title: "T", author: "X", year: "2020", journal: "J" })]);
    expect(checks.find((c) => c.id === "abstract")?.passed).toBe(true);
    expect(checks.find((c) => c.id === "no-orphans")?.passed).toBe(true);
    expect(checks.find((c) => c.id === "length")?.passed).toBe(true);
  });

  test("flags missing sections and orphan citations", () => {
    const checks = submissionReadiness("# Introdução\n[@ghost2020]", []);
    expect(checks.find((c) => c.id === "methodology")?.passed).toBe(false);
    expect(checks.find((c) => c.id === "no-orphans")?.passed).toBe(false);
    expect(checks.find((c) => c.id === "references")?.passed).toBe(false);
  });
});

describe("originality", () => {
  const realFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  test("not configured without env", () => {
    expect(isOriginalityConfigured()).toBe(false);
  });

  test("checkOriginality throws when unconfigured", () => {
    expect(checkOriginality("x")).rejects.toThrow("not configured");
  });

  test("normalizes provider response when configured", async () => {
    const saved = { url: process.env.ORIGINALITY_API_URL, key: process.env.ORIGINALITY_API_KEY };
    process.env.ORIGINALITY_API_URL = "https://provider.test/check";
    process.env.ORIGINALITY_API_KEY = "k";
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ ai: 0.8, plagiarism: 0.1 }), { status: 200 })) as typeof fetch;
    try {
      const out = await checkOriginality("texto");
      expect(out).toEqual({ aiScore: 0.8, plagiarismScore: 0.1 });
    } finally {
      if (saved.url === undefined) delete process.env.ORIGINALITY_API_URL;
      else process.env.ORIGINALITY_API_URL = saved.url;
      if (saved.key === undefined) delete process.env.ORIGINALITY_API_KEY;
      else process.env.ORIGINALITY_API_KEY = saved.key;
    }
  });
});
