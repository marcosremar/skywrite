import type { BibEntry } from "./bibtex.js";

const CROSSREF_BASE = "https://api.crossref.org/works";
const HEADERS = { "User-Agent": "Skywrite/1.0 (https://skywrite-mvp.fly.dev)" };

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
  if (na === nb || na.includes(nb) || nb.includes(na)) return true;
  const setA = new Set(na.split(" "));
  const setB = new Set(nb.split(" "));
  const inter = [...setA].filter((w) => setB.has(w)).length;
  const union = new Set([...setA, ...setB]).size;
  return union > 0 && inter / union >= 0.7;
}

async function fetchJson(url: string): Promise<any | null> {
  try {
    const res = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(15_000) });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
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
    `${CROSSREF_BASE}?query.bibliographic=${encodeURIComponent(title)}&rows=1&select=title,DOI`
  );
  const top = data?.message?.items?.[0];
  const crTitle = top?.title?.[0];
  if (!crTitle) {
    return { key: entry.key, title, status: "not-found" };
  }
  return {
    key: entry.key,
    title,
    matchedTitle: crTitle,
    doi: top.DOI,
    status: titlesMatch(title, crTitle) ? "found" : "not-found",
  };
}

export async function checkCitations(entries: BibEntry[], limit = 25): Promise<CitationCheck[]> {
  return Promise.all(entries.slice(0, limit).map((e) => checkCitation(e)));
}
