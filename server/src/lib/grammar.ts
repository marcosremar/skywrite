const LANGUAGETOOL_URL = process.env.LANGUAGETOOL_URL || "https://api.languagetool.org";
const MAX_CHARS = 20_000;

export interface GrammarMatch {
  message: string;
  offset: number;
  length: number;
  replacements: string[];
  rule: string;
  category: string;
}

interface LtMatch {
  message: string;
  offset: number;
  length: number;
  replacements?: { value: string }[];
  rule?: { id?: string; category?: { name?: string } };
}

export async function checkGrammar(text: string, language = "pt-BR"): Promise<GrammarMatch[]> {
  const body = new URLSearchParams({ text: text.slice(0, MAX_CHARS), language });
  const res = await fetch(`${LANGUAGETOOL_URL}/v2/check`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`LanguageTool ${res.status}`);
  const data = (await res.json()) as { matches?: LtMatch[] };
  return (data.matches || []).map((m) => ({
    message: m.message,
    offset: m.offset,
    length: m.length,
    replacements: (m.replacements || []).slice(0, 5).map((r) => r.value),
    rule: m.rule?.id || "",
    category: m.rule?.category?.name || "",
  }));
}
