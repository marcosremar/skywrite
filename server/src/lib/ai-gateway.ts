const GATEWAY_URL = process.env.AI_GATEWAY_URL || "http://127.0.0.1:9012";
const GATEWAY_KEY = process.env.AI_GATEWAY_KEY || "";
const CHAT_MODEL = process.env.AI_GATEWAY_MODEL || "llama-3.3-70b-versatile";

export interface SearchSource {
  title: string;
  url: string;
  snippet: string;
}

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

function authHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${GATEWAY_KEY}`,
  };
}

export async function pingGateway(): Promise<boolean> {
  if (!GATEWAY_KEY) return false;
  try {
    const res = await fetch(`${GATEWAY_URL}/health`, { signal: AbortSignal.timeout(1500) });
    return res.ok;
  } catch {
    return false;
  }
}

export async function searchWeb(query: string, maxResults = 6): Promise<SearchSource[]> {
  const res = await fetch(`${GATEWAY_URL}/v1/search`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ query, max_results: maxResults, categories: "science" }),
    signal: AbortSignal.timeout(25_000),
  });
  if (!res.ok) {
    throw new Error(`Gateway search ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
  const data = (await res.json()) as { results?: SearchSource[] };
  return (data.results || []).map((r) => ({
    title: r.title || "",
    url: r.url || "",
    snippet: (r.snippet || "").slice(0, 300),
  }));
}

export async function chat(messages: ChatMessage[]): Promise<string> {
  const res = await fetch(`${GATEWAY_URL}/v1/chat/completions`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ model: CHAT_MODEL, messages, temperature: 0.3 }),
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) {
    throw new Error(`Gateway chat ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  return data.choices?.[0]?.message?.content || "";
}
