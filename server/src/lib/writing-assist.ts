import { chat } from "./ai-gateway.js";

export async function suggestTitles(content: string): Promise<string[]> {
  const raw = await chat([
    {
      role: "system",
      content:
        "Você gera títulos acadêmicos concisos em português. Responda apenas com 3 títulos, um por linha, sem numeração nem aspas.",
    },
    { role: "user", content: content.slice(0, 4000) },
  ]);
  return raw
    .split("\n")
    .map((l) => l.replace(/^\s*(?:[-*•]|\d+[.)])\s+/, "").replace(/^["'“”]+|["'“”]+$/g, "").trim())
    .filter(Boolean)
    .slice(0, 5);
}

export async function generateAbstract(content: string): Promise<string> {
  return chat([
    {
      role: "system",
      content:
        "Você escreve resumos acadêmicos (abstract) em português, de 150 a 250 palavras, cobrindo contexto, objetivo, método, resultados e conclusão. Responda apenas com o resumo.",
    },
    { role: "user", content: content.slice(0, 8000) },
  ]);
}

export async function paraphrase(text: string): Promise<string> {
  return chat([
    {
      role: "system",
      content:
        "Reescreva o texto a seguir em português acadêmico mais claro e conciso, preservando o sentido e as citações. Responda apenas com o texto reescrito.",
    },
    { role: "user", content: text.slice(0, 4000) },
  ]);
}
