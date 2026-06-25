import { afterEach, describe, expect, test } from "bun:test";
import { buildBibTeX, doiToBibTeX } from "../src/lib/doi-bibtex.js";

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});

describe("buildBibTeX", () => {
  const work = {
    type: "journal-article",
    DOI: "10.1/x",
    title: ["The Input Hypothesis"],
    "container-title": ["Language Learning"],
    author: [{ family: "Krashen", given: "Stephen" }],
    issued: { "date-parts": [[1984]] },
  };

  test("builds an article entry with fields", () => {
    const bib = buildBibTeX(work)!;
    expect(bib).toContain("@article{krashen1984,");
    expect(bib).toContain("author = {Krashen, Stephen}");
    expect(bib).toContain("title = {The Input Hypothesis}");
    expect(bib).toContain("journal = {Language Learning}");
    expect(bib).toContain("year = {1984}");
    expect(bib).toContain("doi = {10.1/x}");
  });

  test("maps book type", () => {
    const bib = buildBibTeX({ type: "book", title: ["A Book"], publisher: "MIT", issued: { "date-parts": [[2000]] } })!;
    expect(bib.startsWith("@book{")).toBe(true);
    expect(bib).toContain("publisher = {MIT}");
  });

  test("unknown type falls back to misc", () => {
    const bib = buildBibTeX({ type: "weird", title: ["X"] })!;
    expect(bib.startsWith("@misc{")).toBe(true);
  });

  test("returns null without a title", () => {
    expect(buildBibTeX({ type: "journal-article" })).toBeNull();
  });

  test("joins multiple authors with and", () => {
    const bib = buildBibTeX({
      title: ["T"],
      author: [
        { family: "Silva", given: "A" },
        { family: "Souza", given: "B" },
      ],
    })!;
    expect(bib).toContain("author = {Silva, A and Souza, B}");
  });
});

describe("doiToBibTeX", () => {
  test("fetches and converts a DOI", async () => {
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ message: { type: "journal-article", title: ["T"], DOI: "10.1/x" } }), {
        status: 200,
      })) as typeof fetch;
    const bib = await doiToBibTeX("https://doi.org/10.1/x");
    expect(bib).toContain("@article");
    expect(bib).toContain("doi = {10.1/x}");
  });

  test("returns null on 404", async () => {
    globalThis.fetch = (async () => new Response("nf", { status: 404 })) as typeof fetch;
    expect(await doiToBibTeX("10.1/missing")).toBeNull();
  });

  test("returns null for empty doi", async () => {
    expect(await doiToBibTeX("  ")).toBeNull();
  });
});
