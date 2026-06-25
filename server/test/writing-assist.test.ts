import { afterEach, describe, expect, test } from "bun:test";
import { suggestTitles, generateAbstract, paraphrase } from "../src/lib/writing-assist.js";

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});

function mockChat(content: string) {
  globalThis.fetch = (async () =>
    new Response(JSON.stringify({ choices: [{ message: { content } }] }), { status: 200 })) as typeof fetch;
}

describe("suggestTitles", () => {
  test("parses one title per line", async () => {
    mockChat("Título Um\nTítulo Dois\nTítulo Três");
    expect(await suggestTitles("conteúdo")).toEqual(["Título Um", "Título Dois", "Título Três"]);
  });
  test("strips numbering and bullets", async () => {
    mockChat("1. Um\n- Dois");
    expect(await suggestTitles("x")).toEqual(["Um", "Dois"]);
  });
});

describe("generateAbstract", () => {
  test("returns the generated abstract", async () => {
    mockChat("Este é o resumo do trabalho.");
    expect(await generateAbstract("conteúdo")).toBe("Este é o resumo do trabalho.");
  });
});

describe("paraphrase", () => {
  test("returns the rewritten text", async () => {
    mockChat("Texto reescrito de forma clara.");
    expect(await paraphrase("texto original")).toBe("Texto reescrito de forma clara.");
  });
});
