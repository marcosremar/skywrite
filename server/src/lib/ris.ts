import { escapeBibValue } from "./bibtex.js";

const TYPE_MAP: Record<string, string> = {
  JOUR: "article",
  BOOK: "book",
  CHAP: "incollection",
  CONF: "inproceedings",
  CPAPER: "inproceedings",
  THES: "phdthesis",
  RPRT: "techreport",
};

interface RisRecord {
  type: string;
  authors: string[];
  fields: Record<string, string>;
}

function parseRecords(ris: string): RisRecord[] {
  const records: RisRecord[] = [];
  let current: RisRecord | null = null;
  for (const line of ris.split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9]{2})\s+-\s?(.*)$/);
    if (!match) continue;
    const [, tag, value] = match;
    if (tag === "TY") {
      current = { type: value.trim(), authors: [], fields: {} };
      records.push(current);
    } else if (!current) {
      continue;
    } else if (tag === "ER") {
      current = null;
    } else if (tag === "AU" || tag === "A1") {
      current.authors.push(value.trim());
    } else {
      current.fields[tag] = value.trim();
    }
  }
  return records;
}

function recordToBibTeX(record: RisRecord, index: number): string | null {
  const f = record.fields;
  const title = f.TI || f.T1;
  if (!title) return null;
  const type = TYPE_MAP[record.type] || "misc";
  const year = (f.PY || f.Y1 || "").match(/(?:19|20)\d{2}/)?.[0];
  const surname = record.authors[0]?.split(",")[0].trim().toLowerCase().replace(/[^a-z0-9]/g, "");
  const key = `${surname || "ref"}${year || index}`;
  const pages = f.SP && f.EP ? `${f.SP}--${f.EP}` : f.SP || f.EP;
  const fields: Array<[string, string | undefined]> = [
    ["author", record.authors.length ? record.authors.join(" and ") : undefined],
    ["title", title],
    ["journal", f.JO || f.JF || f.T2],
    ["publisher", f.PB],
    ["volume", f.VL],
    ["pages", pages],
    ["year", year],
    ["doi", f.DO],
  ];
  const body = fields
    .filter(([, v]) => v)
    .map(([k, v]) => `  ${k} = {${escapeBibValue(String(v))}}`)
    .join(",\n");
  return `@${type}{${key},\n${body}\n}`;
}

export function risToBibTeX(ris: string): string {
  return parseRecords(ris)
    .map((r, i) => recordToBibTeX(r, i))
    .filter(Boolean)
    .join("\n\n");
}
