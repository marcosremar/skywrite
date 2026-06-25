import { describe, expect, test } from "vitest";
import {
  detectSectionType,
  extractSections,
  countCitations,
  extractCitationYears,
  countWords,
  analyzeThesis,
  analyzeSection,
  getAllRules,
  analyzeRules,
} from "./thesis-analysis";

describe("detectSectionType", () => {
  test("introduction", () => expect(detectSectionType("# Introdução")).toBe("introduction"));
  test("methodology", () => expect(detectSectionType("## Metodologia")).toBe("methodology"));
  test("conclusion", () => expect(detectSectionType("# Conclusão")).toBe("conclusion"));
  test("null for plain text", () => expect(detectSectionType("um parágrafo")).toBeNull());
});

describe("extractSections", () => {
  test("merges repeated section type", () => {
    const map = extractSections("# Introdução\nprimeira\n# Metodologia\nm\n# Introdução\nsegunda");
    const intro = map.get("introduction") || "";
    expect(intro).toContain("primeira");
    expect(intro).toContain("segunda");
  });
  test("splits distinct sections", () => {
    const map = extractSections("# Introdução\nA\n# Metodologia\nB");
    expect(map.get("introduction")).toContain("A");
    expect(map.get("methodology")).toContain("B");
  });
  test("empty for headerless content", () => expect(extractSections("sem cabeçalhos").size).toBe(0));
});

describe("countCitations", () => {
  test("markdown citations", () => expect(countCitations("[@a2020] e [@b2019]")).toBe(2));
  test("none", () => expect(countCitations("sem citações")).toBe(0));
});

describe("extractCitationYears", () => {
  test("dedupes descending", () => expect(extractCitationYears("2015 e 2020 e 2020")).toEqual([2020, 2015]));
  test("empty when none", () => expect(extractCitationYears("sem datas")).toEqual([]));
});

describe("countWords", () => {
  test("strips markdown marks", () => expect(countWords("# Título com três")).toBe(3));
  test("zero for empty", () => expect(countWords("")).toBe(0));
});

describe("analyzeThesis", () => {
  test("returns sections and overall score", () => {
    const out = analyzeThesis("# Introdução\nEste trabalho investiga X.\n# Metodologia\nUsamos questionários.");
    expect(Array.isArray(out.sections)).toBe(true);
    expect(typeof out.overallScore).toBe("number");
  });
  test("handles empty content", () => {
    const out = analyzeThesis("");
    expect(Array.isArray(out.sections)).toBe(true);
  });
});

describe("analyzeSection and rules", () => {
  test("analyzeSection returns feedback for the section", () => {
    const out = analyzeSection("# Introdução\ntexto", "introduction");
    expect(out.feedback.section).toBe("introduction");
  });
  test("getAllRules returns the system rule set", () => {
    expect(getAllRules().length).toBeGreaterThan(0);
  });
  test("analyzeRules counts are consistent", () => {
    const out = analyzeRules("texto qualquer", "introduction");
    expect(out.totalCount).toBe(out.results.length);
  });
});
