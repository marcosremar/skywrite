import { describe, expect, test } from "bun:test";
import {
  readability,
  findUndefinedAcronyms,
  findSpellingVariants,
  findNumberFormatIssues,
} from "../src/lib/writing-metrics.js";

describe("readability", () => {
  test("counts sentences and average length", () => {
    const out = readability("Frase um aqui. Frase dois aqui também.");
    expect(out.sentences).toBe(2);
    expect(out.avgSentenceLength).toBeGreaterThan(0);
  });
  test("flags long sentences", () => {
    const long = `Esta ${"palavra ".repeat(45)}fim.`;
    expect(readability(long).longSentences).toBe(1);
  });
  test("detects passive voice", () => {
    expect(readability("O experimento foi realizado pelos autores.").passiveCount).toBeGreaterThanOrEqual(1);
  });
  test("counts hedging words", () => {
    expect(readability("Talvez isso aparentemente funcione.").hedgingCount).toBe(2);
  });
  test("empty text yields zeros", () => {
    const out = readability("");
    expect(out.sentences).toBe(0);
    expect(out.avgSentenceLength).toBe(0);
    expect(out.fleschReadingEase).toBe(0);
  });
  test("counts nominalizations", () => {
    expect(readability("A implementação trouxe complexidade ao desenvolvimento.").nominalizations).toBeGreaterThanOrEqual(3);
  });
  test("computes a Flesch reading ease number", () => {
    expect(typeof readability("Frase curta e clara aqui.").fleschReadingEase).toBe("number");
  });
});

describe("findSpellingVariants", () => {
  test("flags accent variants of the same word", () => {
    const out = findSpellingVariants("A análise foi feita. Outra analise apareceu.");
    expect(out.some((v) => v.forms.includes("análise") && v.forms.includes("analise"))).toBe(true);
  });
  test("flags hyphenation variants", () => {
    const out = findSpellingVariants("Use email aqui e e-mail ali.");
    expect(out.some((v) => v.forms.includes("email") && v.forms.includes("e-mail"))).toBe(true);
  });
  test("empty when consistent", () => {
    expect(findSpellingVariants("texto totalmente consistente sem variações")).toEqual([]);
  });
});

describe("findNumberFormatIssues", () => {
  test("flags mixed decimal separators", () => {
    expect(findNumberFormatIssues("valores 1,5 e 2.7")).toContain("Decimais com vírgula e ponto misturados");
  });
  test("flags inconsistent percent spacing", () => {
    expect(findNumberFormatIssues("subiu 5% e caiu 3 %")).toContain("Percentual com e sem espaço antes de %");
  });
  test("empty when consistent", () => {
    expect(findNumberFormatIssues("apenas 1,5 e 2,7 e 5%")).toEqual([]);
  });
});

describe("findUndefinedAcronyms", () => {
  test("flags acronym never defined in parentheses", () => {
    const out = findUndefinedAcronyms("Usamos PLN para a tarefa. O PLN é central.");
    expect(out.find((a) => a.acronym === "PLN")?.count).toBe(2);
  });
  test("ignores acronyms defined in parentheses", () => {
    const out = findUndefinedAcronyms("Processamento de Linguagem Natural (PLN) é útil. PLN avança.");
    expect(out.find((a) => a.acronym === "PLN")).toBeUndefined();
  });
  test("returns empty when no acronyms", () => {
    expect(findUndefinedAcronyms("texto sem siglas aqui")).toEqual([]);
  });
});
