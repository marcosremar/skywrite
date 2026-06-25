import { afterAll, afterEach, describe, expect, test } from "bun:test";
import { searchWeb, chat, pingGateway } from "../src/lib/ai-gateway.js";
import { checkCitation, titlesMatch, normalizeDoi, authorSurname } from "../src/lib/crossref.js";
import { ingestPaper } from "../src/lib/paper-ingest.js";
import { db } from "../src/db.js";

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});

function route(handler: (url: string) => Response | null) {
  globalThis.fetch = (async (input: unknown) => {
    const url = typeof input === "string" ? input : (input as Request).url;
    return handler(url) ?? new Response("nf", { status: 404 });
  }) as typeof fetch;
}

const json = (obj: unknown, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json" } });

describe("ai-gateway searchWeb", () => {
  test("maps results and truncates snippet to 300", async () => {
    route(() => json({ results: [{ title: "T", url: "U", snippet: "s".repeat(400) }] }));
    const out = await searchWeb("q");
    expect(out).toHaveLength(1);
    expect(out[0].title).toBe("T");
    expect(out[0].snippet.length).toBe(300);
  });
  test("defaults missing fields to empty strings", async () => {
    route(() => json({ results: [{}] }));
    const out = await searchWeb("q");
    expect(out[0]).toEqual({ title: "", url: "", snippet: "" });
  });
  test("throws on non-ok status", async () => {
    route(() => new Response("boom", { status: 502 }));
    expect(searchWeb("q")).rejects.toThrow();
  });
});

describe("ai-gateway chat", () => {
  test("returns message content", async () => {
    route(() => json({ choices: [{ message: { content: "resposta" } }] }));
    expect(await chat([{ role: "user", content: "oi" }])).toBe("resposta");
  });
  test("returns empty string when no choices", async () => {
    route(() => json({}));
    expect(await chat([{ role: "user", content: "oi" }])).toBe("");
  });
  test("throws on non-ok status", async () => {
    route(() => new Response("err", { status: 500 }));
    expect(chat([{ role: "user", content: "oi" }])).rejects.toThrow();
  });
});

describe("ai-gateway pingGateway", () => {
  test("returns false when fetch fails", async () => {
    globalThis.fetch = (async () => {
      throw new Error("network");
    }) as typeof fetch;
    expect(await pingGateway()).toBe(false);
  });
});

describe("crossref helpers", () => {
  test("normalizeDoi strips doi: prefix", () => expect(normalizeDoi("doi:10.1/x")).toBe("10.1/x"));
  test("normalizeDoi strips doi.org url", () =>
    expect(normalizeDoi("https://doi.org/10.1/x")).toBe("10.1/x"));
  test("normalizeDoi strips dx.doi.org url", () =>
    expect(normalizeDoi("https://dx.doi.org/10.1/x")).toBe("10.1/x"));
  test("authorSurname from comma form", () => expect(authorSurname("Krashen, Stephen")).toBe("Krashen"));
  test("authorSurname from natural order", () => expect(authorSurname("Stephen Krashen")).toBe("Krashen"));
  test("authorSurname takes first of many", () => expect(authorSurname("Silva, A. and Souza, B.")).toBe("Silva"));
  test("authorSurname empty for undefined", () => expect(authorSurname(undefined)).toBe(""));
  test("titlesMatch identical", () => expect(titlesMatch("Hello World", "Hello World")).toBe(true));
  test("titlesMatch substring of longer", () =>
    expect(titlesMatch("the quick brown fox jumps", "the quick brown fox jumps over")).toBe(true));
  test("titlesMatch rejects unrelated", () =>
    expect(titlesMatch("Completely different text here", "Nothing alike at all")).toBe(false));
});

describe("checkCitation", () => {
  const crossrefDoi = (msg: unknown) => json({ message: msg });

  test("DOI with matching title and year is found", async () => {
    route((u) =>
      u.includes("crossref.org/works/")
        ? crossrefDoi({ title: ["The Input Hypothesis"], DOI: "10.1/x", issued: { "date-parts": [[1984]] } })
        : null
    );
    const res = await checkCitation({ key: "k", type: "article", title: "The Input Hypothesis", doi: "10.1/x", year: "1984" });
    expect(res.status).toBe("found");
    expect(res.matchedTitle).toBe("The Input Hypothesis");
  });

  test("DOI with different title is mismatch", async () => {
    route((u) =>
      u.includes("crossref.org/works/") ? crossrefDoi({ title: ["Totally Unrelated Paper Title"], DOI: "10.1/x" }) : null
    );
    const res = await checkCitation({ key: "k", type: "article", title: "The Input Hypothesis", doi: "10.1/x" });
    expect(res.status).toBe("mismatch");
  });

  test("DOI with wrong year is mismatch", async () => {
    route((u) =>
      u.includes("crossref.org/works/")
        ? crossrefDoi({ title: ["The Input Hypothesis"], DOI: "10.1/x", issued: { "date-parts": [[2001]] } })
        : null
    );
    const res = await checkCitation({ key: "k", type: "article", title: "The Input Hypothesis", doi: "10.1/x", year: "1984" });
    expect(res.status).toBe("mismatch");
  });

  test("DOI without local title is unchecked", async () => {
    route((u) => (u.includes("crossref.org/works/") ? crossrefDoi({ title: ["Some Title"], DOI: "10.1/x" }) : null));
    const res = await checkCitation({ key: "k", type: "article", title: "", doi: "10.1/x" });
    expect(res.status).toBe("unchecked");
  });

  test("no DOI, crossref query match is found", async () => {
    route((u) =>
      u.includes("query.bibliographic")
        ? json({ message: { items: [{ title: ["Gamification in Education"], DOI: "10.2/y" }] } })
        : null
    );
    const res = await checkCitation({ key: "k", type: "article", title: "Gamification in Education" });
    expect(res.status).toBe("found");
    expect(res.doi).toBe("10.2/y");
  });

  test("falls back to OpenAlex when crossref misses", async () => {
    route((u) => {
      if (u.includes("query.bibliographic")) return json({ message: { items: [] } });
      if (u.includes("openalex.org")) return json({ results: [{ title: "Gamification in Education", doi: "10.3/z" }] });
      return json({});
    });
    const res = await checkCitation({ key: "k", type: "article", title: "Gamification in Education" });
    expect(res.status).toBe("found");
    expect(res.matchedTitle).toBe("Gamification in Education");
  });

  test("no title and no DOI is unchecked", async () => {
    route(() => json({}));
    const res = await checkCitation({ key: "k", type: "article" });
    expect(res.status).toBe("unchecked");
  });

  test("no match anywhere is not-found", async () => {
    route(() => json({ message: { items: [] }, results: [], data: [], result: { hits: { hit: [] } } }));
    const res = await checkCitation({ key: "k", type: "article", title: "An Obscure Untraceable Paper Title" });
    expect(res.status).toBe("not-found");
  });
});

describe("ingestPaper (mocked fetch)", () => {
  const urls: string[] = [];
  afterAll(async () => {
    if (urls.length) await db.paper.deleteMany({ where: { url: { in: urls } } });
  });

  const htmlBody = `<html><body><p>${"conteúdo acadêmico relevante ".repeat(40)}</p></body></html>`;

  test("fetches, extracts and caches html content", async () => {
    const url = `http://93.184.216.34/doc-${Date.now()}.html`;
    urls.push(url);
    route(() => new Response(htmlBody, { status: 200, headers: { "content-type": "text/html" } }));
    const out = await ingestPaper(url, "Título");
    expect(out).not.toBeNull();
    expect(out!.content).toContain("conteúdo acadêmico");
    const cached = await db.paper.findUnique({ where: { url } });
    expect(cached).not.toBeNull();
  });

  test("returns cached without refetching", async () => {
    const url = `http://93.184.216.34/cached-${Date.now()}.html`;
    urls.push(url);
    await db.paper.create({ data: { url, title: "C", content: "x".repeat(300), charCount: 300, source: "html" } });
    let called = false;
    globalThis.fetch = (async () => {
      called = true;
      return new Response("", { status: 200 });
    }) as typeof fetch;
    const out = await ingestPaper(url);
    expect(out!.content.length).toBe(300);
    expect(called).toBe(false);
  });

  test("rejects too-short content", async () => {
    const url = `http://93.184.216.34/tiny-${Date.now()}.html`;
    route(() => new Response("<p>curto</p>", { status: 200, headers: { "content-type": "text/html" } }));
    expect(await ingestPaper(url)).toBeNull();
  });
});
