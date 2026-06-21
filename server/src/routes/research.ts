import { Router } from "express";
import { db } from "../db.js";
import { requireAuth } from "../auth.js";
import { chat, searchWeb, type SearchSource } from "../lib/ai-gateway.js";
import { ingestSources, relevantExcerpts, type IngestedPaper } from "../lib/paper-ingest.js";

export const researchRouter = Router({ mergeParams: true });

researchRouter.use(requireAuth);

const INGEST_LIMIT = 3;

const SYSTEM_PROMPT = `Você é um orientador acadêmico de teses. Responda em português, de forma objetiva e construtiva.
Você recebe TRECHOS DO TEXTO COMPLETO de papers (não apenas resumos). Use-os para VERIFICAR se as afirmações do aluno estão realmente suportadas pelas fontes.
Regras:
- Ao apoiar uma sugestão numa fonte, cite-a como [n] e transcreva o trecho exato que sustenta a afirmação.
- Se nenhuma fonte sustentar uma afirmação, diga explicitamente "não encontrei suporte nas fontes".
- Nunca invente fontes nem citações.`;

const QUERY_PROMPT = `Gere UMA query de busca acadêmica curta (3 a 8 palavras) com os termos-chave do tema da pergunta e da seção, no mesmo idioma do texto.
Use só substantivos e termos técnicos; remova verbos de pergunta e palavras vazias.
Responda apenas com a query, sem aspas, sem pontuação extra e sem explicação.`;

async function focusedQuery(question: string, content: string): Promise<string> {
  try {
    const raw = await chat([
      { role: "system", content: QUERY_PROMPT },
      { role: "user", content: `Pergunta: ${question}\n\nSeção:\n${content.slice(0, 600)}` },
    ]);
    const query = raw.trim().split("\n")[0].replace(/^["']|["']$/g, "").slice(0, 120);
    return query || question;
  } catch {
    return question;
  }
}

function buildUserMessage(
  question: string,
  fileName: string,
  content: string,
  sources: SearchSource[],
  papers: IngestedPaper[]
) {
  const byUrl = new Map(papers.map((p) => [p.url, p]));
  const sourcesText = sources.length
    ? sources
        .map((s, i) => {
          const paper = byUrl.get(s.url);
          const body = paper
            ? `TEXTO COMPLETO (trechos relevantes):\n${relevantExcerpts(paper.content, question + " " + content)}`
            : `Resumo: ${s.snippet}`;
          return `[${i + 1}] ${s.title}\n${s.url}\n${body}`;
        })
        .join("\n\n")
    : "(nenhuma fonte encontrada)";

  const section = content.trim()
    ? `Seção atual (${fileName || "documento"}):\n"""\n${content.slice(0, 4000)}\n"""`
    : "";

  return `Pergunta do aluno: ${question}

${section}

Fontes:
${sourcesText}`;
}

researchRouter.post("/", async (req, res) => {
  try {
    const { id } = req.params as { id: string };
    const { question, content, fileName } = req.body ?? {};

    if (!question || !question.trim()) {
      return res.status(400).json({ error: "Pergunta é obrigatória" });
    }

    const project = await db.project.findFirst({ where: { id, userId: req.userId } });
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    const searchQuery = await focusedQuery(question, content || "");

    let sources: SearchSource[] = [];
    try {
      sources = await searchWeb(searchQuery);
    } catch (err) {
      console.error("Search failed:", err);
    }

    let papers: IngestedPaper[] = [];
    try {
      papers = await ingestSources(sources, INGEST_LIMIT);
    } catch (err) {
      console.error("Ingest failed:", err);
    }
    const ingestedUrls = new Set(papers.map((p) => p.url));

    const answer = await chat([
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: buildUserMessage(question, fileName || "", content || "", sources, papers) },
    ]);

    return res.json({
      answer,
      searchQuery,
      sources: sources.map((s) => ({ ...s, fullText: ingestedUrls.has(s.url) })),
    });
  } catch (error) {
    console.error("Research error:", error);
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    return res.status(502).json({
      error: "Não foi possível consultar o orientador. Verifique se o ai-gateway está rodando.",
      details: message,
    });
  }
});
