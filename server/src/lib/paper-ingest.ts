import { extractText, getDocumentProxy } from "unpdf";
import { db } from "../db.js";
import type { SearchSource } from "./ai-gateway.js";
import { resolvePublicUrl } from "./ssrf.js";

const MAX_BYTES = 20 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 40_000;
const MAX_REDIRECTS = 5;

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

async function safeFetch(start: string): Promise<Response | null> {
  let current = start;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const safe = await resolvePublicUrl(current);
    if (!safe) return null;
    const res = await fetch(safe.toString(), {
      redirect: "manual",
      headers: { "User-Agent": "Mozilla/5.0 SkywriteBot" },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location");
      if (!location) return null;
      current = new URL(location, safe).toString();
      continue;
    }
    return res;
  }
  return null;
}

export function parseRobotsDisallow(text: string): string[] {
  let active = false;
  const disallow: string[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/#.*/, "").trim();
    const ua = line.match(/^user-agent:\s*(.*)/i);
    if (ua) {
      active = ua[1].trim() === "*";
      continue;
    }
    const dis = line.match(/^disallow:\s*(.*)/i);
    if (dis && active && dis[1].trim()) disallow.push(dis[1].trim());
  }
  return disallow;
}

const robotsCache = new Map<string, string[]>();

async function robotsDisallows(target: URL): Promise<boolean> {
  const origin = target.origin;
  if (!robotsCache.has(origin)) {
    let rules: string[] = [];
    try {
      const res = await safeFetch(`${origin}/robots.txt`);
      if (res && res.ok) rules = parseRobotsDisallow(await res.text());
    } catch {
      rules = [];
    }
    if (robotsCache.size >= 500) robotsCache.clear();
    robotsCache.set(origin, rules);
  }
  return robotsCache.get(origin)!.some((prefix) => target.pathname.startsWith(prefix));
}

export function looksLikePdf(url: string, contentType: string, bytes: Uint8Array): boolean {
  if (contentType.includes("pdf")) return true;
  try {
    if (new URL(url).pathname.toLowerCase().endsWith(".pdf")) return true;
  } catch {
    // ignore
  }
  return bytes.length >= 5 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46;
}

export async function readCapped(res: Response, max: number): Promise<Uint8Array | null> {
  if (!res.body) {
    const buf = new Uint8Array(await res.arrayBuffer());
    return buf.byteLength > max ? null : buf;
  }
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    total += value.byteLength;
    if (total > max) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return out;
}

async function fetchPaper(url: string): Promise<{ content: string; source: string } | null> {
  const resolved = resolvePdfUrl(url);
  try {
    if (await robotsDisallows(new URL(resolved))) return null;
  } catch {
    return null;
  }
  const res = await safeFetch(resolved);
  if (!res || !res.ok) return null;

  const contentType = res.headers.get("content-type") || "";
  const declaredLength = Number(res.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BYTES) return null;

  const bytes = await readCapped(res, MAX_BYTES);
  if (!bytes) return null;

  if (looksLikePdf(resolved, contentType, bytes)) {
    const pdf = await getDocumentProxy(bytes);
    if (pdf.numPages > 300) return null;
    const { text } = await extractText(pdf, { mergePages: true });
    return { content: text.trim(), source: "pdf" };
  }

  if (contentType.includes("html") || contentType.includes("text")) {
    return { content: htmlToText(new TextDecoder().decode(bytes)), source: "html" };
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
    const paper = await db.paper.upsert({
      where: { url },
      create: {
        url,
        title: title || null,
        content,
        charCount: content.length,
        source: fetched.source,
      },
      update: {},
    });
    return { url: paper.url, title: paper.title, content: paper.content };
  } catch (err) {
    console.error(`Ingest failed for ${url}:`, err instanceof Error ? err.message : err);
    return null;
  }
}

const PAPER_CACHE_TTL_DAYS = 30;

export async function prunePaperCache(maxAgeDays = PAPER_CACHE_TTL_DAYS): Promise<number> {
  const cutoff = new Date(Date.now() - maxAgeDays * 24 * 60 * 60 * 1000);
  const { count } = await db.paper.deleteMany({ where: { fetchedAt: { lt: cutoff } } });
  return count;
}

let lastPruneAt = 0;

export async function ingestSources(
  sources: SearchSource[],
  limit: number
): Promise<IngestedPaper[]> {
  const now = Date.now();
  if (now - lastPruneAt > 60 * 60 * 1000) {
    lastPruneAt = now;
    prunePaperCache().catch(() => {});
  }
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
