import type { BibEntry } from "./bibtex.js";

const CROSSREF_PREFIX = /^(fig|tbl|eq|sec|lst):/;

export function extractCitedKeys(markdown: string): string[] {
  const keys = new Set<string>();
  const re = /(?<![A-Za-z0-9])@([A-Za-z0-9_][A-Za-z0-9_:.+-]*)/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(markdown)) !== null) {
    const key = match[1].replace(/[.,;:+-]+$/, "");
    if (CROSSREF_PREFIX.test(key)) continue;
    keys.add(key);
  }
  return [...keys];
}

export interface CitationIntegrity {
  orphans: string[];
  unused: string[];
}

export function crossCheckCitations(markdown: string, entries: BibEntry[]): CitationIntegrity {
  const cited = new Set(extractCitedKeys(markdown));
  const defined = new Set(entries.map((e) => e.key));
  return {
    orphans: [...cited].filter((k) => !defined.has(k)),
    unused: entries.map((e) => e.key).filter((k) => !cited.has(k)),
  };
}

const ABNT_REQUIRED: Record<string, Array<keyof BibEntry>> = {
  article: ["author", "title", "journal", "year"],
  book: ["author", "title", "publisher", "year"],
  inbook: ["author", "title", "publisher", "year"],
  incollection: ["author", "title", "booktitle", "publisher", "year"],
  inproceedings: ["author", "title", "booktitle", "year"],
  conference: ["author", "title", "booktitle", "year"],
  phdthesis: ["author", "title", "year"],
  mastersthesis: ["author", "title", "year"],
};

const DEFAULT_REQUIRED: Array<keyof BibEntry> = ["author", "title", "year"];

export interface IncompleteEntry {
  key: string;
  type: string;
  missing: string[];
}

export function checkAbntCompleteness(entries: BibEntry[]): IncompleteEntry[] {
  return entries
    .map((entry) => {
      const required = ABNT_REQUIRED[entry.type] || DEFAULT_REQUIRED;
      const missing = required.filter((f) => !entry[f]).map(String);
      return { key: entry.key, type: entry.type, missing };
    })
    .filter((e) => e.missing.length > 0);
}
