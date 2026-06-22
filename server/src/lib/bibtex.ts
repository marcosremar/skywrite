export interface BibEntry {
  key: string;
  type: string;
  title?: string;
  doi?: string;
  author?: string;
  year?: string;
}

function field(body: string, name: string): string | undefined {
  const match = body.match(new RegExp(`${name}\\s*=\\s*[{"]([\\s\\S]*?)[}"]\\s*[,\\n]`, "i"));
  return match ? match[1].replace(/\s+/g, " ").trim() : undefined;
}

export function parseBibTeX(content: string): BibEntry[] {
  const entries: BibEntry[] = [];
  const blockRe = /@(\w+)\s*\{\s*([^,\s]+)\s*,([\s\S]*?)\n\}/g;
  let match: RegExpExecArray | null;
  while ((match = blockRe.exec(content)) !== null) {
    const [, type, key, body] = match;
    if (type.toLowerCase() === "comment" || type.toLowerCase() === "string") continue;
    entries.push({
      key,
      type: type.toLowerCase(),
      title: field(body, "title"),
      doi: field(body, "doi"),
      author: field(body, "author"),
      year: field(body, "year"),
    });
  }
  return entries;
}
