import { afterEach, describe, expect, test } from "bun:test";
import { bibtexFromTitle } from "../src/lib/doi-bibtex.js";
import { sourceToBibTeX, sourceKey } from "../src/lib/source-citation.js";

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});

const search = (items: unknown[]) => new Response(JSON.stringify({ message: { items } }), { status: 200 });

const work = {
  type: "journal-article",
  DOI: "10.1/x",
  title: ["Gamification in Higher Education Research"],
  "container-title": ["Computers & Education"],
  author: [{ family: "Silva", given: "Ana" }],
  issued: { "date-parts": [[2021]] },
};

describe("bibtexFromTitle", () => {
  test("returns full BibTeX for a confident title match", async () => {
    globalThis.fetch = (async () => search([work])) as typeof fetch;
    const bib = await bibtexFromTitle("Gamification in Higher Education Research");
    expect(bib).toContain("@article{silva2021,");
    expect(bib).toContain("author = {Silva, Ana}");
    expect(bib).toContain("journal = {Computers & Education}");
    expect(bib).toContain("year = {2021}");
    expect(bib).toContain("doi = {10.1/x}");
  });

  test("returns null when no item matches the title", async () => {
    globalThis.fetch = (async () => search([{ ...work, title: ["Totally Different Unrelated Paper"] }])) as typeof fetch;
    expect(await bibtexFromTitle("Gamification in Higher Education Research")).toBeNull();
  });

  test("returns null for empty results", async () => {
    globalThis.fetch = (async () => search([])) as typeof fetch;
    expect(await bibtexFromTitle("A Sufficiently Long Title Here")).toBeNull();
  });

  test("does not fetch for too-short titles", async () => {
    let called = false;
    globalThis.fetch = (async () => {
      called = true;
      return search([work]);
    }) as typeof fetch;
    expect(await bibtexFromTitle("curto")).toBeNull();
    expect(called).toBe(false);
  });

  test("returns null on non-ok response", async () => {
    globalThis.fetch = (async () => new Response("err", { status: 500 })) as typeof fetch;
    expect(await bibtexFromTitle("A Sufficiently Long Title Here")).toBeNull();
  });

  test("returns null when fetch throws", async () => {
    globalThis.fetch = (async () => {
      throw new Error("net");
    }) as typeof fetch;
    expect(await bibtexFromTitle("A Sufficiently Long Title Here")).toBeNull();
  });
});

describe("sourceKey", () => {
  test("slugifies and strips accents", () => expect(sourceKey("Educação à Distância")).toBe("educacaoadistancia"));
  test("falls back to fonte for empty", () => expect(sourceKey("")).toBe("fonte"));
  test("truncates to 24 chars", () => expect(sourceKey("a".repeat(40)).length).toBe(24));
});

describe("sourceToBibTeX", () => {
  test("resolves a DOI from the title when matched", async () => {
    globalThis.fetch = (async () => search([work])) as typeof fetch;
    const out = await sourceToBibTeX("Gamification in Higher Education Research", "http://x");
    expect(out.resolved).toBe(true);
    expect(out.bibtex).toContain("@article");
    expect(out.bibtex).toContain("doi = {10.1/x}");
  });

  test("falls back to @online when no DOI match", async () => {
    globalThis.fetch = (async () => search([])) as typeof fetch;
    const out = await sourceToBibTeX("Some Blog Post Without A Match", "http://blog/x");
    expect(out.resolved).toBe(false);
    expect(out.bibtex).toContain("@online{");
    expect(out.bibtex).toContain("url = {http://blog/x}");
  });

  test("uses Fonte fallback for empty title", async () => {
    const out = await sourceToBibTeX("", "http://x");
    expect(out.resolved).toBe(false);
    expect(out.bibtex).toContain("@online{fonte,");
  });
});
