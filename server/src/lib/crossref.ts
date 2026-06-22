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

function titlesMatch(a: string, b: string): boolean {
  const na = normalize(a);
  const nb = normalize(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  const wa = na.split(" ");
  const wb = nb.split(" ");
  const shorter = wa.length <= wb.length ? na : nb;
  const longer = wa.length <= wb.length ? nb : na;
  if (shorter.split(" ").length >= 4 && longer.includes(shorter)) return true;
  const setA = new Set(wa);
  const setB = new Set(wb);
  const inter = [...setA].filter((w) => setB.has(w)).length;
  const union = new Set([...wa, ...wb]).size;
  return union > 0 && inter / union >= 0.7;
}

async function openAlexByTitle(title: string): Promise<{ matchedTitle: string; doi?: string } | null> {
  const data = await fetchJson(
    `https://api.openalex.org/works?search=${encodeURIComponent(title)}&per-page=5&select=title,doi&mailto=${MAILTO}`
  );
  const items: Array<{ title?: string; doi?: string }> = data?.results ?? [];
  const match = items.find((it) => it.title && titlesMatch(title, it.title));
  return match?.title ? { matchedTitle: match.title, doi: match.doi || undefined } : null;
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

  if (entry.doi) {
    const data = await fetchJson(`${CROSSREF_BASE}/${encodeURIComponent(entry.doi)}`);
    const crTitle = data?.message?.title?.[0];
    if (crTitle) {
      return {
        key: entry.key,
        title,
        doi: data.message.DOI,
        matchedTitle: crTitle,
        status: !title || titlesMatch(title, crTitle) ? "found" : "mismatch",
      };
    }
  }

  if (!title) {
    return { key: entry.key, title, status: "unchecked" };
  }

  const data = await fetchJson(
    `${CROSSREF_BASE}?query.bibliographic=${encodeURIComponent(title)}&rows=5&select=title,DOI`
  );
  const items: Array<{ title?: string[]; DOI?: string }> = data?.message?.items ?? [];
  const match = items.find((it) => it.title?.[0] && titlesMatch(title, it.title[0]));
  if (match) {
    return { key: entry.key, title, matchedTitle: match.title![0], doi: match.DOI, status: "found" };
  }

  const openAlex = await openAlexByTitle(title);
  if (openAlex) {
    return { key: entry.key, title, matchedTitle: openAlex.matchedTitle, doi: openAlex.doi, status: "found" };
  }

  const top = items[0]?.title?.[0];
  return { key: entry.key, title, matchedTitle: top, status: "not-found" };
}

export async function checkCitations(entries: BibEntry[], limit = 25): Promise<CitationCheck[]> {
  return Promise.all(entries.slice(0, limit).map((e) => checkCitation(e)));
}
