function config() {
  const url = process.env.ORIGINALITY_API_URL || "";
  const key = process.env.ORIGINALITY_API_KEY || "";
  return url && key ? { url, key } : null;
}

export function isOriginalityConfigured(): boolean {
  return config() !== null;
}

export interface OriginalityResult {
  aiScore: number | null;
  plagiarismScore: number | null;
}

export async function checkOriginality(text: string): Promise<OriginalityResult> {
  const c = config();
  if (!c) throw new Error("Originality provider not configured");
  const res = await fetch(c.url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${c.key}` },
    body: JSON.stringify({ text: text.slice(0, 50_000) }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`Originality ${res.status}`);
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  return {
    aiScore: pickScore(data, ["ai", "aiScore", "ai_score"]),
    plagiarismScore: pickScore(data, ["plagiarism", "plagiarismScore", "plagiarism_score"]),
  };
}

function pickScore(data: Record<string, unknown>, keys: string[]): number | null {
  const containers = [data, data.score, data.result, data.scores].filter(
    (c): c is Record<string, unknown> => typeof c === "object" && c !== null
  );
  for (const container of containers) {
    for (const key of keys) {
      const value = container[key];
      if (typeof value === "number") return value;
    }
  }
  return null;
}
