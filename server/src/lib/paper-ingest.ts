import { extractText, getDocumentProxy } from "unpdf";
import { db } from "../db.js";
import type { SearchSource } from "./ai-gateway.js";

const MAX_BYTES = 20 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 40_000;

export interface IngestedPaper {
  url: string;
  title: string | null;
  content: string;
}

export function resolvePdfUrl(url: string): string {
  const arxivAbs = url.match(/arxiv\.org\/abs\/([^?#]+)/i);
  if (arxivAbs) return `https://arxiv.org/pdf/${arxivAbs[1]}`;
  return url;
}

export function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchPaper(url: string): Promise<{ content: string; source: string } | null> {
  const res = await fetch(resolvePdfUrl(url), {
    redirect: "follow",
    headers: { "User-Agent": "Mozilla/5.0 SkywriteBot" },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!res.ok) return null;

  const contentType = res.headers.get("content-type") || "";
  const buffer = await res.arrayBuffer();
  if (buffer.byteLength > MAX_BYTES) return null;

  const isPdf = contentType.includes("pdf") || resolvePdfUrl(url).toLowerCase().endsWith(".pdf");
  if (isPdf) {
    const pdf = await getDocumentProxy(new Uint8Array(buffer));
    const { text } = await extractText(pdf, { mergePages: true });
    return { content: text.trim(), source: "pdf" };
  }

  if (contentType.includes("html") || contentType.includes("text")) {
    return { content: htmlToText(new TextDecoder().decode(buffer)), source: "html" };
  }
  return null;
}

export async function ingestPaper(url: string, title?: string): Promise<IngestedPaper | null> {
  const cached = await db.paper.findUnique({ where: { url } });
  if (cached) return { url: cached.url, title: cached.title, content: cached.content };

  try {
    const fetched = await fetchPaper(url);
    if (!fetched || fetched.content.length < 200) return null;

    const content = fetched.content.slice(0, 400_000);
    const paper = await db.paper.create({
      data: {
        url,
        title: title || null,
        content,
        charCount: content.length,
        source: fetched.source,
      },
    });
    return { url: paper.url, title: paper.title, content: paper.content };
  } catch (err) {
    console.error(`Ingest failed for ${url}:`, err instanceof Error ? err.message : err);
    return null;
  }
}

export async function ingestSources(
  sources: SearchSource[],
  limit: number
): Promise<IngestedPaper[]> {
  const targets = sources.slice(0, limit);
  const results = await Promise.all(targets.map((s) => ingestPaper(s.url, s.title)));
  return results.filter((p): p is IngestedPaper => p !== null);
}

export function relevantExcerpts(content: string, query: string, maxChars = 3000): string {
  const keywords = [...new Set(query.toLowerCase().match(/[\p{L}]{4,}/gu) || [])];
  if (keywords.length === 0) return content.slice(0, maxChars);

  const lower = content.toLowerCase();
  const windows: Array<[number, number]> = [];
  for (const kw of keywords) {
    let idx = lower.indexOf(kw);
    let hits = 0;
    while (idx !== -1 && hits < 3) {
      windows.push([Math.max(0, idx - 300), Math.min(content.length, idx + 500)]);
      idx = lower.indexOf(kw, idx + 1);
      hits++;
    }
  }
  if (windows.length === 0) return content.slice(0, maxChars);

  windows.sort((a, b) => a[0] - b[0]);
  const merged: Array<[number, number]> = [];
  for (const w of windows) {
    const last = merged[merged.length - 1];
    if (last && w[0] <= last[1]) last[1] = Math.max(last[1], w[1]);
    else merged.push([...w]);
  }

  let out = "";
  for (const [from, to] of merged) {
    if (out.length >= maxChars) break;
    out += content.slice(from, to) + "\n…\n";
  }
  return out.slice(0, maxChars);
}
