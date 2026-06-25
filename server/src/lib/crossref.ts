import type { BibEntry } from "./bibtex.js";

const CROSSREF_BASE = "https://api.crossref.org/works";
const MAILTO = process.env.CROSSREF_MAILTO || "support@skywrite.app";
const HEADERS = {
  "User-Agent": `Skywrite/1.0 (https://skywrite-mvp.fly.dev; mailto:${MAILTO})`,
};

export type CitationStatus = "found" | "mismatch" | "not-found" | "unchecked";

export interface CitationCheck {
  key: string;
  title: string;
  status: CitationStatus;
  matchedTitle?: string;
  doi?: string;
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function titlesMatch(a: string, b: string): boolean {
  const na = normalize(a);
  const nb = normalize(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  const wa = na.split(" ");
  const wb = nb.split(" ");
  const short = wa.length <= wb.length ? wa : wb;
  const longSet = new Set(wa.length <= wb.length ? wb : wa);
  if (short.length >= 4 && Math.abs(wa.length - wb.length) <= 2 && short.every((w) => longSet.has(w))) return true;
  const setA = new Set(wa);
  const setB = new Set(wb);
  const inter = [...setA].filter((w) => setB.has(w)).length;
  const union = new Set([...wa, ...wb]).size;
  return union > 0 && inter / union >= 0.7;
}

export function normalizeDoi(doi: string): string {
  return doi.trim().replace(/^doi:/i, "").replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, "").trim();
}

export function authorSurname(author?: string): string {
  if (!author) return "";
  const first = author.split(/\s+and\s+|;/i)[0].trim();
  return first.includes(",") ? first.split(",")[0].trim() : first.split(/\s+/).pop() || "";
}

function searchString(entry: BibEntry): string {
  return [entry.title, authorSurname(entry.author), entry.year].filter(Boolean).join(" ");
}

async function openAlexByTitle(title: string, query: string): Promise<{ matchedTitle: string; doi?: string } | null> {
  const data = await fetchJson(
    `https://api.openalex.org/works?search=${encodeURIComponent(query)}&per-page=8&select=title,doi&mailto=${MAILTO}`
  );
  const items: Array<{ title?: string; doi?: string }> = data?.results ?? [];
  const match = items.find((it) => it.title && titlesMatch(title, it.title));
  return match?.title ? { matchedTitle: match.title, doi: match.doi || undefined } : null;
}

async function semanticScholarByTitle(title: string): Promise<{ matchedTitle: string; doi?: string } | null> {
  const data = await fetchJson(
    `https://api.semanticscholar.org/graph/v1/paper/search/match?query=${encodeURIComponent(title)}&fields=title,externalIds`
  );
  const best: { title?: string; externalIds?: { DOI?: string } } | undefined = data?.data?.[0];
  return best?.title && titlesMatch(title, best.title)
    ? { matchedTitle: best.title, doi: best.externalIds?.DOI }
    : null;
}

async function dblpByTitle(title: string): Promise<{ matchedTitle: string; doi?: string } | null> {
  const data = await fetchJson(
    `https://dblp.org/search/publ/api?q=${encodeURIComponent(title)}&format=json&h=5`
  );
  const hits: Array<{ info?: { title?: string; doi?: string } }> = data?.result?.hits?.hit ?? [];
  const match = hits.find((h) => h.info?.title && titlesMatch(title, h.info.title.replace(/\.$/, "")));
  return match?.info?.title ? { matchedTitle: match.info.title.replace(/\.$/, ""), doi: match.info.doi } : null;
}

async function fetchJson(url: string, retries = 2): Promise<any | null> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(15_000) });
      if (res.status === 429 || res.status >= 500) {
        await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
        continue;
      }
      if (!res.ok) return null;
      return await res.json();
    } catch {
      await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
    }
  }
  return null;
}

export async function checkCitation(entry: BibEntry): Promise<CitationCheck> {
  const title = entry.title || "";
  let doiFailed = false;

  if (entry.doi) {
    const doi = normalizeDoi(entry.doi);
    const data = await fetchJson(`${CROSSREF_BASE}/${encodeURIComponent(doi)}`);
    const crTitle = data?.message?.title?.[0];
    if (crTitle) {
      if (!title) {
        return { key: entry.key, title, doi: data.message.DOI, matchedTitle: crTitle, status: "unchecked" };
      }
      const crYear = data.message.issued?.["date-parts"]?.[0]?.[0];
      const entryYear = entry.year?.match(/\d{4}/)?.[0];
      const yearOk = !entryYear || !crYear || String(crYear) === entryYear;
      return {
        key: entry.key,
        title,
        doi: data.message.DOI,
        matchedTitle: crTitle,
        status: titlesMatch(title, crTitle) && yearOk ? "found" : "mismatch",
      };
    }
    doiFailed = true;
  }

  if (!title) {
    return { key: entry.key, title, status: doiFailed ? "mismatch" : "unchecked" };
  }

  const query = searchString(entry);
  const data = await fetchJson(
    `${CROSSREF_BASE}?query.bibliographic=${encodeURIComponent(query)}&rows=8&select=title,DOI`
  );
  const items: Array<{ title?: string[]; DOI?: string }> = data?.message?.items ?? [];
  const match = items.find((it) => it.title?.[0] && titlesMatch(title, it.title[0]));
  if (match) {
    return { key: entry.key, title, matchedTitle: match.title![0], doi: match.DOI, status: doiFailed ? "mismatch" : "found" };
  }

  const fallback =
    (await openAlexByTitle(title, query)) ||
    (await semanticScholarByTitle(title)) ||
    (await dblpByTitle(title));
  if (fallback) {
    return { key: entry.key, title, matchedTitle: fallback.matchedTitle, doi: fallback.doi, status: doiFailed ? "mismatch" : "found" };
  }

  const top = items[0]?.title?.[0];
  return { key: entry.key, title, matchedTitle: top, status: "not-found" };
}

export async function mapLimit<T, R>(items: T[], concurrency: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]);
    }
  };
  const workers = Math.max(1, Math.min(concurrency, items.length));
  await Promise.all(Array.from({ length: workers }, worker));
  return results;
}

export async function checkCitations(entries: BibEntry[], limit = 25, concurrency = 5): Promise<CitationCheck[]> {
  return mapLimit(entries.slice(0, limit), concurrency, (e) => checkCitation(e));
}
