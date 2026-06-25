import { describe, expect, test } from "bun:test";
import {
  extractCitedKeys,
  crossCheckCitations,
  checkAbntCompleteness,
} from "../src/lib/citation-integrity.js";
import type { BibEntry } from "../src/lib/bibtex.js";

describe("extractCitedKeys", () => {
  test("extracts bracketed citations", () => {
    expect(extractCitedKeys("texto [@silva2020] e [@souza2019].").sort()).toEqual(["silva2020", "souza2019"]);
  });
  test("extracts inline citations", () => {
    expect(extractCitedKeys("conforme @krashen1984 argumenta")).toEqual(["krashen1984"]);
  });
  test("dedupes repeated keys", () => {
    expect(extractCitedKeys("[@a2020] e de novo [@a2020]")).toEqual(["a2020"]);
  });
  test("strips trailing punctuation", () => {
    expect(extractCitedKeys("ver [@a2020].")).toEqual(["a2020"]);
  });
  test("returns empty when none", () => expect(extractCitedKeys("sem citações")).toEqual([]));
  test("ignores pandoc-crossref refs", () => {
    expect(extractCitedKeys("ver [@fig:fluxo], [@tbl:dados], [@sec:intro] e [@silva2020]")).toEqual(["silva2020"]);
  });
  test("ignores @ inside email addresses", () => {
    expect(extractCitedKeys("contato user@host2024 e [@silva2020]")).toEqual(["silva2020"]);
  });
});

const entry = (e: Partial<BibEntry> & { key: string }): BibEntry => ({ type: "article", ...e });

describe("crossCheckCitations", () => {
  test("flags orphan citations not in bib", () => {
    const out = crossCheckCitations("[@ghost2020]", [entry({ key: "real2019" })]);
    expect(out.orphans).toEqual(["ghost2020"]);
  });
  test("flags unused bib entries", () => {
    const out = crossCheckCitations("[@used2020]", [entry({ key: "used2020" }), entry({ key: "unused2019" })]);
    expect(out.unused).toEqual(["unused2019"]);
  });
  test("clean when all cited and defined", () => {
    const out = crossCheckCitations("[@a2020] [@b2019]", [entry({ key: "a2020" }), entry({ key: "b2019" })]);
    expect(out.orphans).toEqual([]);
    expect(out.unused).toEqual([]);
  });
});

describe("checkAbntCompleteness", () => {
  test("article missing journal is incomplete", () => {
    const out = checkAbntCompleteness([entry({ key: "a", title: "T", author: "X", year: "2020" })]);
    expect(out[0].missing).toContain("journal");
  });
  test("book missing publisher is incomplete", () => {
    const out = checkAbntCompleteness([entry({ key: "b", type: "book", title: "T", author: "X", year: "2020" })]);
    expect(out[0].missing).toContain("publisher");
  });
  test("complete article passes", () => {
    const out = checkAbntCompleteness([
      entry({ key: "a", title: "T", author: "X", year: "2020", journal: "J" }),
    ]);
    expect(out).toEqual([]);
  });
  test("unknown type uses default required fields", () => {
    const out = checkAbntCompleteness([entry({ key: "m", type: "misc", title: "T" })]);
    expect(out[0].missing).toEqual(["author", "year"]);
  });
});
