import { chat } from "./ai-gateway.js";
import { relevantExcerpts, type IngestedPaper } from "./paper-ingest.js";

const CHUNK_SIZE = 1200;
const MAX_CHUNKS_TOTAL = 36;
const MAX_SELECTED = 8;
const PREVIEW_CHARS = 220;

const RANK_PROMPT = `Você seleciona trechos de papers acadêmicos relevantes para verificar uma afirmação ou responder uma pergunta.
Receberá uma pergunta e uma lista numerada de trechos (prévias). Considere sinônimos e termos equivalentes, não apenas palavras idênticas.
Responda APENAS com um array JSON dos índices dos trechos mais relevantes, do mais ao menos relevante, no máximo ${MAX_SELECTED}. Exemplo: [3, 0, 7]. Se nenhum for relevante, responda [].`;

interface PaperChunk {
  paperUrl: string;
  text: string;
}

function chunkPaper(content: string, maxChunks: number): string[] {
  const chunks: string[] = [];
  for (let i = 0; i < content.length && chunks.length < maxChunks; i += CHUNK_SIZE) {
    chunks.push(content.slice(i, i + CHUNK_SIZE));
  }
  return chunks;
}

export function parseChunkSelection(raw: string, chunkCount: number): number[] {
  const match = raw.match(/\[[\d,\s]*\]/);
  if (!match) return [];
  try {
    const arr = JSON.parse(match[0]);
    if (!Array.isArray(arr)) return [];
    return [...new Set(arr.filter((n) => Number.isInteger(n) && n >= 0 && n < chunkCount))].slice(0, MAX_SELECTED);
  } catch {
    return [];
  }
}

export async function rankedExcerpts(
  papers: IngestedPaper[],
  query: string,
  maxCharsPerPaper = 3000
): Promise<Map<string, string>> {
  const keywordFallback = () => new Map(papers.map((p) => [p.url, relevantExcerpts(p.content, query, maxCharsPerPaper)]));
  if (papers.length === 0) return new Map();

  const perPaper = Math.max(6, Math.floor(MAX_CHUNKS_TOTAL / papers.length));
  const chunks: PaperChunk[] = papers.flatMap((p) =>
    chunkPaper(p.content, perPaper).map((text) => ({ paperUrl: p.url, text }))
  );

  try {
    const listing = chunks
      .map((c, i) => `[${i}] ${c.text.slice(0, PREVIEW_CHARS).replace(/\s+/g, " ")}`)
      .join("\n");
    const raw = await chat([
      { role: "system", content: RANK_PROMPT },
      { role: "user", content: `Pergunta: ${query.slice(0, 500)}\n\nTrechos:\n${listing}` },
    ]);
    const selected = parseChunkSelection(raw, chunks.length);
    if (selected.length === 0) return keywordFallback();

    const byPaper = new Map<string, string[]>();
    for (const idx of selected) {
      const c = chunks[idx];
      byPaper.set(c.paperUrl, [...(byPaper.get(c.paperUrl) ?? []), c.text]);
    }
    const result = new Map<string, string>();
    for (const p of papers) {
      const picked = byPaper.get(p.url);
      result.set(
        p.url,
        picked ? picked.join("\n…\n").slice(0, maxCharsPerPaper) : relevantExcerpts(p.content, query, maxCharsPerPaper)
      );
    }
    return result;
  } catch {
    return keywordFallback();
  }
}
