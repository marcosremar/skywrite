import { afterEach, describe, expect, test } from "bun:test";
import { checkGrammar } from "../src/lib/grammar.js";

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});

describe("checkGrammar", () => {
  test("maps LanguageTool matches", async () => {
    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify({
          matches: [
            {
              message: "Erro de concordância",
              offset: 5,
              length: 3,
              replacements: [{ value: "a" }, { value: "b" }],
              rule: { id: "R1", category: { name: "Gramática" } },
            },
          ],
        }),
        { status: 200 }
      )) as typeof fetch;
    const out = await checkGrammar("texto");
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ message: "Erro de concordância", offset: 5, length: 3, rule: "R1", category: "Gramática" });
    expect(out[0].replacements).toEqual(["a", "b"]);
  });

  test("preserves distinct offsets across multiple matches and caps replacements at 5", async () => {
    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify({
          matches: [
            { message: "m1", offset: 0, length: 2, replacements: [{ value: "a" }], rule: { id: "R1" } },
            { message: "m2", offset: 40, length: 4, replacements: [{ value: "b" }, { value: "c" }, { value: "d" }, { value: "e" }, { value: "f" }, { value: "g" }], rule: { id: "R2" } },
          ],
        }),
        { status: 200 }
      )) as typeof fetch;
    const out = await checkGrammar("a".repeat(100));
    expect(out.map((m) => m.offset)).toEqual([0, 40]);
    expect(out[1].replacements).toHaveLength(5);
  });

  test("returns empty array when no matches", async () => {
    globalThis.fetch = (async () => new Response(JSON.stringify({ matches: [] }), { status: 200 })) as typeof fetch;
    expect(await checkGrammar("ok")).toEqual([]);
  });

  test("throws on non-ok response", async () => {
    globalThis.fetch = (async () => new Response("err", { status: 500 })) as typeof fetch;
    expect(checkGrammar("x")).rejects.toThrow();
  });
});
