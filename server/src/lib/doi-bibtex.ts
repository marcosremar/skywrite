import { titlesMatch } from "./crossref.js";
import { escapeBibValue } from "./bibtex.js";

const CROSSREF_BASE = "https://api.crossref.org/works";
const MAILTO = process.env.CROSSREF_MAILTO || "support@skywrite.app";

interface CrossrefAuthor {
  family?: string;
  given?: string;
  name?: string;
}

export interface CrossrefWork {
  type?: string;
  DOI?: string;
  title?: string[];
  "container-title"?: string[];
  publisher?: string;
  volume?: string;
  page?: string;
  author?: CrossrefAuthor[];
  issued?: { "date-parts"?: number[][] };
}

const TYPE_MAP: Record<string, string> = {
  "journal-article": "article",
  "book": "book",
  "book-chapter": "incollection",
  "proceedings-article": "inproceedings",
  "dissertation": "phdthesis",
};

function authorsToBibTeX(authors?: CrossrefAuthor[]): string | undefined {
  if (!authors?.length) return undefined;
  return authors
    .map((a) => (a.family ? `${a.family}, ${a.given ?? ""}`.trim().replace(/,\s*$/, "") : a.name ?? ""))
    .filter(Boolean)
    .join(" and ");
}

function citationKey(authors: CrossrefAuthor[] | undefined, year?: string): string {
  const surname = authors?.[0]?.family || authors?.[0]?.name?.split(/\s+/).pop() || "ref";
  return `${surname.toLowerCase().replace(/[^a-z0-9]/g, "")}${year ?? ""}`;
}

export function buildBibTeX(work: CrossrefWork): string | null {
  if (!work.title?.[0]) return null;
  const type = TYPE_MAP[work.type ?? ""] || "misc";
  const year = work.issued?.["date-parts"]?.[0]?.[0]?.toString();
  const fields: Array<[string, string | undefined]> = [
    ["author", authorsToBibTeX(work.author)],
    ["title", work.title[0]],
    ["journal", work["container-title"]?.[0]],
    ["publisher", work.publisher],
    ["volume", work.volume],
    ["pages", work.page],
    ["year", year],
    ["doi", work.DOI],
  ];
  const body = fields
    .filter(([, v]) => v)
    .map(([k, v]) => `  ${k} = {${escapeBibValue(String(v))}}`)
    .join(",\n");
  return `@${type}{${citationKey(work.author, year)},\n${body}\n}`;
}

export async function bibtexFromTitle(title: string): Promise<string | null> {
  const clean = title.trim();
  if (clean.length < 8) return null;
  try {
    const res = await fetch(
      `${CROSSREF_BASE}?query.bibliographic=${encodeURIComponent(clean)}` +
        `&rows=5&select=title,DOI,author,container-title,issued,publisher,volume,page,type`,
      { headers: { "User-Agent": `Skywrite/1.0 (mailto:${MAILTO})` }, signal: AbortSignal.timeout(15_000) }
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { message?: { items?: CrossrefWork[] } };
    const match = (data.message?.items ?? []).find((it) => it.title?.[0] && titlesMatch(clean, it.title[0]));
    return match ? buildBibTeX(match) : null;
  } catch {
    return null;
  }
}

export async function doiToBibTeX(doi: string): Promise<string | null> {
  const clean = doi
    .trim()
    .replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, "")
    .replace(/^doi:/i, "")
    .trim();
  if (!clean) return null;
  try {
    const res = await fetch(`${CROSSREF_BASE}/${encodeURIComponent(clean)}`, {
      headers: { "User-Agent": `Skywrite/1.0 (mailto:${MAILTO})` },
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { message?: CrossrefWork };
    return data.message ? buildBibTeX(data.message) : null;
  } catch {
    return null;
  }
}
