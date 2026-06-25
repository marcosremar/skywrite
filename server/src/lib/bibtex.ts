export interface BibEntry {
  key: string;
  type: string;
  title?: string;
  doi?: string;
  author?: string;
  year?: string;
  journal?: string;
  publisher?: string;
  booktitle?: string;
}

export function escapeBibValue(v: string): string {
  return v.replace(/[{}\\]/g, "");
}

function parseFields(body: string): Record<string, string> {
  const fields: Record<string, string> = {};
  let i = 0;
  const n = body.length;
  while (i < n) {
    while (i < n && /[\s,]/.test(body[i])) i++;
    const nameStart = i;
    while (i < n && /[A-Za-z0-9_+:-]/.test(body[i])) i++;
    const name = body.slice(nameStart, i).toLowerCase();
    while (i < n && /\s/.test(body[i])) i++;
    if (!name || body[i] !== "=") {
      while (i < n && body[i] !== ",") i++;
      continue;
    }
    i++;
    while (i < n && /\s/.test(body[i])) i++;
    let value = "";
    if (body[i] === "{") {
      let depth = 0;
      while (i < n) {
        const ch = body[i];
        if (ch === "{") {
          depth++;
          if (depth > 1) value += ch;
        } else if (ch === "}") {
          depth--;
          if (depth === 0) {
            i++;
            break;
          }
          value += ch;
        } else {
          value += ch;
        }
        i++;
      }
    } else if (body[i] === '"') {
      i++;
      while (i < n && body[i] !== '"') {
        value += body[i];
        i++;
      }
      i++;
    } else {
      while (i < n && body[i] !== "," && !/\s/.test(body[i])) {
        value += body[i];
        i++;
      }
    }
    if (!(name in fields)) fields[name] = value.replace(/\s+/g, " ").trim();
  }
  return fields;
}

export function parseBibTeX(content: string): BibEntry[] {
  const entries: BibEntry[] = [];
  let i = 0;
  const n = content.length;
  while (i < n) {
    if (content[i] !== "@") {
      i++;
      continue;
    }
    i++;
    const typeStart = i;
    while (i < n && /[A-Za-z]/.test(content[i])) i++;
    const type = content.slice(typeStart, i).toLowerCase();
    while (i < n && /\s/.test(content[i])) i++;
    if (content[i] !== "{") continue;
    i++;
    let depth = 1;
    const bodyStart = i;
    while (i < n && depth > 0) {
      if (content[i] === "{") depth++;
      else if (content[i] === "}") depth--;
      if (depth > 0) i++;
    }
    const entryBody = content.slice(bodyStart, i);
    i++;
    if (type === "comment" || type === "string" || type === "preamble") continue;
    const commaIdx = entryBody.indexOf(",");
    if (commaIdx === -1) continue;
    const key = entryBody.slice(0, commaIdx).trim();
    if (!key) continue;
    const fields = parseFields(entryBody.slice(commaIdx + 1));
    entries.push({
      key,
      type,
      title: fields.title,
      doi: fields.doi,
      author: fields.author,
      year: fields.year,
      journal: fields.journal,
      publisher: fields.publisher,
      booktitle: fields.booktitle,
    });
  }
  return entries;
}
