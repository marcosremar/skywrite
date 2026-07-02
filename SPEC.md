# Skywrite — Especificação do Sistema

Plataforma web para escrita de teses e artigos acadêmicos em Markdown, com editor live-preview (estilo Obsidian), geração de PDF acadêmico e um Orientador Virtual com IA que busca e verifica afirmações contra o texto completo de fontes da internet.

## 1. Arquitetura

```
client/ (Vite + React SPA, :5175)
   │  proxy /api  →
server/ (Express + Prisma, :4000)  ──  PostgreSQL
   │  /v1/search, /v1/chat/completions  →
ai-gateway (:9012)  ──  SearXNG (fly.dev) + LLM (Groq/OpenRouter/…)
```

- **client** — SPA React (React Router). Em dev, o Vite proxia `/api` para o server (mesma origem, sem CORS).
- **server** — API REST Express. Prisma/PostgreSQL. Auth por JWT em cookie httpOnly.
- **ai-gateway** — serviço externo (projeto separado). Fornece busca (SearXNG) e LLM por uma única chave. Precisa estar rodando para o Orientador funcionar.

## 2. Stack

| Camada | Tecnologia |
| --- | --- |
| Front | React 19, React Router 7, Vite 6, Tailwind 4, Radix UI, CodeMirror 6 |
| Editor | CodeMirror 6 com ViewPlugin de live preview próprio |
| Back | Express 4, Prisma 5, PostgreSQL |
| Auth | JWT (`jsonwebtoken`) + bcrypt, cookie httpOnly |
| PDF | Pandoc → Tectonic (`--citeproc`) |
| IA/Busca | ai-gateway (SearXNG + LLM), `unpdf` para extração de PDF |
| Runtime/CLI | Bun (scripts, testes), tsx (dev do server) |

## 3. Modelo de dados (Prisma)

Modelos ativos:

- **User** `{ id, name, email (unique), passwordHash, image, … }`
- **Project** `{ id, userId, name, description, title, subtitle, author, language, storageKey, templateId, settings, createdAt, updatedAt }`
- **ProjectFile** `{ id, projectId, path, name, type (FileType), content, sizeBytes, … }` — único por `(projectId, path)`
- **Build** `{ id, projectId, type (BuildType), status (BuildStatus), pdfUrl, pdfSizeBytes, logs, errorMessage, queuedAt, completedAt, durationMs }`
- **Template** `{ id, name, description, category, language, … }` (catálogo lido do disco em `templates/`)
- **Paper** `{ id, url (unique), title, content, charCount, source, fetchedAt }` — cache de fontes ingeridas (guarda só o markdown/texto extraído, nunca o PDF)

Enums: `FileType` = MARKDOWN | YAML | BIBTEX | LATEX | IMAGE | PDF | OTHER. `BuildType` = FULL | PREVIEW | DRAFT. `BuildStatus` = QUEUED | PROCESSING | COMPLETED | FAILED | CANCELLED.

## 4. Autenticação

JWT assinado com `JWT_SECRET`, entregue em cookie httpOnly `token` (`SameSite=Lax`, 30 dias). Middleware:

- `requireAuth` — 401 se o cookie ausente/inválido; senão popula `req.userId`.
- `optionalAuth` — popula `req.userId` quando presente, sem bloquear.

OAuth (Google/GitHub) foi removido na migração; apenas e-mail/senha.

## 5. API REST

Base: `/api`. Respostas JSON. Rotas marcadas com 🔒 exigem cookie de auth.

### Auth
| Método | Rota | Descrição |
| --- | --- | --- |
| POST | `/api/auth/register` | Cria usuário (senha ≥ 8), seta cookie. |
| POST | `/api/auth/login` | Valida credenciais, seta cookie. 401 se inválido. |
| POST | `/api/auth/logout` | Limpa cookie. |
| GET | `/api/auth/me` 🔒 | Usuário atual. |
| GET | `/api/auth/me/export` 🔒 | Exporta todos os dados do usuário em JSON (portabilidade LGPD), sem `passwordHash`. |
| DELETE | `/api/auth/me` 🔒 | Exclui a conta e todos os dados (LGPD). |

`/api/auth/register` e `/api/auth/login` têm rate-limit; e-mail é normalizado e validado, `name` é obrigatório.

### Projects & Files
| Método | Rota | Descrição |
| --- | --- | --- |
| GET | `/api/projects` 🔒 | Lista projetos do usuário (com `_count` de files/builds). |
| POST | `/api/projects` 🔒 | Cria projeto (de template ou arquivos default). |
| GET | `/api/projects/:id` 🔒 | Projeto + arquivos (ordenados por path). |
| PATCH | `/api/projects/:id` 🔒 | Atualiza metadados (name/title/subtitle/author/university/language). |
| DELETE | `/api/projects/:id` 🔒 | Exclui projeto (cascade em files/builds). |
| POST | `/api/projects/:id/files` 🔒 | Cria arquivo. |
| GET | `/api/projects/:id/files/*` 🔒 | Lê arquivo pelo path (wildcard). |
| PUT | `/api/projects/:id/files/*` 🔒 | Atualiza conteúdo. |
| DELETE | `/api/projects/:id/files/*` 🔒 | Remove arquivo. |
| POST | `/api/projects/:id/files/rename` 🔒 | Renomeia (opcionalmente atualiza referências). |

### Templates
| Método | Rota | Descrição |
| --- | --- | --- |
| GET | `/api/templates` | Lista templates. |
| GET | `/api/templates/:id` | Template + default files + latex files. |

### Análise, Build, Orientador
| Método | Rota | Descrição |
| --- | --- | --- |
| POST | `/api/projects/:id/analyze` 🔒 | Análise local dos `.md` → `{ analysis, metrics, consistency }` (regras + legibilidade + siglas não definidas). |
| GET | `/api/projects/:id/build` 🔒 | Últimos builds (sem o PDF). |
| POST | `/api/projects/:id/build` 🔒 | Gera PDF (pandoc→tectonic); rate-limit + 409 se já há build em andamento; retorna `pdfPath`. |
| GET | `/api/projects/:id/build/:buildId/pdf` 🔒 | Serve o PDF (inline; `?download=1` para baixar). |
| POST | `/api/projects/:id/research` 🔒 | Orientador Virtual (RAG). Retorna `{ answer, verdicts[], sources }`; verdicts em 4 classes (supported/partial/unsupported/uncertain) + `confidence` (0–1) + trecho. Usa o histórico da conversa e o início dos demais capítulos como contexto; persiste cada turno. Ver §7. |
| GET | `/api/projects/:id/research/history` 🔒 | Histórico do chat do Orientador (últimas 100 mensagens, com verdicts/fontes). |
| POST | `/api/projects/:id/research/feedback` 🔒 | Registra concordância do usuário com um verdict (`{ claim, classification, agreed }`). |
| POST | `/api/projects/:id/research/sources` 🔒 | Sugere fontes acadêmicas para uma afirmação (`{ claim }`). |
| GET | `/api/projects/:id/sources` 🔒 | Lista fontes do projeto (biblioteca do usuário). |
| POST | `/api/projects/:id/sources` 🔒 | Adiciona fonte por URL (`{ url }`); tenta ingestão de texto completo; máx. 20 por projeto. |
| DELETE | `/api/projects/:id/sources/:sourceId` 🔒 | Remove fonte do projeto. |
| POST | `/api/projects/:id/citations/check` 🔒 | Verifica existência das referências do `.bib` no Crossref (found/mismatch/not-found). |
| POST | `/api/projects/:id/citations/integrity` 🔒 | Cross-check in-text↔`.bib` (`orphans`/`unused`) + completude ABNT (`incomplete`). |
| POST | `/api/projects/:id/citations/doi` 🔒 | DOI → entrada BibTeX completa via Crossref (`{ doi }` → `{ bibtex }`). |
| POST | `/api/projects/:id/citations/from-source` 🔒 | Fonte sugerida → BibTeX: resolve DOI pelo título (Crossref) ou cai pra `@online` (`{ title, url }` → `{ bibtex, resolved }`). |
| POST | `/api/projects/:id/citations/ris` 🔒 | Import RIS (Zotero/Mendeley) → BibTeX (`{ ris }` → `{ bibtex }`). |
| POST | `/api/projects/:id/citations/submission` 🔒 | Checklist de prontidão para submissão (`{ checks }`). |
| POST | `/api/projects/:id/originality` 🔒 | Plágio/detector de IA via provedor externo configurável (`{ configured, aiScore, plagiarismScore }`); `configured:false` sem provedor. |
| POST | `/api/projects/:id/grammar` 🔒 | Correção gramatical/ortográfica via LanguageTool (`{ text, language }` → `{ matches }`); 502 se indisponível. |
| POST | `/api/projects/:id/writing/titles` 🔒 | Sugere títulos (LLM); 200 ou 502. |
| POST | `/api/projects/:id/writing/abstract` 🔒 | Gera resumo/abstract (LLM); 200 ou 502. |
| POST | `/api/projects/:id/writing/paraphrase` 🔒 | Reescreve um trecho (`{ text }`) (LLM); 200 ou 502. |
| POST | `/api/projects/:id/report` 🔒 | Gera PDF do relatório de feedback (análise por seção) e retorna o binário. |

### Saúde
| Método | Rota | Descrição |
| --- | --- | --- |
| GET | `/api/health` | `{ status: "healthy", timestamp }`. |

## 6. Editor

CodeMirror 6 com **live preview** próprio (`MarkdownEditor.tsx`): um `ViewPlugin` lê a árvore de sintaxe (`syntaxTree`) e aplica decorações que escondem as marcas de markdown (`#`, `**`, …) e estilizam o conteúdo; na **linha do cursor** as marcas reaparecem (cru), como no Obsidian.

> Requisito de build: o `vite.config.ts` precisa de `resolve.dedupe` para os pacotes `@codemirror/*` e `@lezer/*`. Sem isso o Vite duplica `@codemirror/state`, os facets não batem, `syntaxTree` vem vazio e o live preview não renderiza.

Painel direito do editor com **abas**: **Visualizar** (preview do PDF) e **Orientador Virtual** (análise + Chat). Lado esquerdo: file tree + editor em largura total.

## 7. Orientador Virtual (RAG)

Endpoint `POST /api/projects/:id/research` com `{ question, content, fileName }`. Fluxo:

1. **Query focada** — um LLM curto transforma a pergunta + seção numa query de busca acadêmica só com termos-chave (no idioma do texto). Retornada em `searchQuery`.
2. **Busca** — `ai-gateway /v1/search` (SearXNG, `categories=science`) → fontes `{ title, url, snippet }`. As **fontes do projeto** (biblioteca do usuário, `ProjectSource`) entram na frente dos resultados da web.
3. **Ingestão automática** (fontes do projeto + top da web) — `paper-ingest.ts`:
   - resolve URL (arxiv `abs` → `pdf`), baixa com limites (≤ 20 MB, timeout 40 s);
   - PDF → texto via **`unpdf`**; HTML → texto via strip de tags;
   - guarda **só o markdown/texto** no cache `Paper` (dedup por URL).
4. **Seleção de trechos** — `semantic-excerpts.ts` divide os papers em chunks e pede a um LLM os mais relevantes para a pergunta (considera sinônimos); fallback para `relevantExcerpts` (janelas por palavra-chave) se o rerank falhar.
5. **Grounding/verificação** — o LLM (`/v1/chat/completions`) recebe os **trechos do texto completo**, o **histórico da conversa** (últimos 8 turnos, persistidos em `ChatMessage`) e o **início dos demais capítulos** do projeto; é instruído a confirmar se a afirmação está suportada, citar o trecho exato, informar `confidence` (0–1) por verdict e dizer "não encontrei suporte" quando não estiver. O usuário pode marcar verdicts como corretos/incorretos (`VerdictFeedback`).

Resposta: `{ answer, searchQuery, sources: [{ title, url, snippet, fullText }] }`. Fontes com `fullText: true` (texto completo analisado) ganham o badge "texto completo" na UI.

Resiliência: se o ai-gateway estiver fora, a rota responde **502** com mensagem clara em vez de quebrar.

## 8. Build de PDF

`POST /api/projects/:id/build` escreve os arquivos do projeto em um tempdir e roda:

```
pandoc <chapters.md ordenados> --citeproc --toc \
  --metadata reference-section-title=Referências \
  --metadata-file=metadata.yaml --bibliography=*.bib \
  --pdf-engine=tectonic -o output.pdf
```

Usa `--citeproc` (CSL) — não depende de biblatex/biber nem de fontes TeX Gyre. O PDF gerado é gravado no Backblaze B2 (API S3-compatível, `lib/storage.ts`) sob a key `builds/<projectId>/<buildId>.pdf`, guardada em `Build.pdfUrl`; a rota `GET .../pdf` baixa do B2 e serve pela rota autenticada (bucket privado). Sem as variáveis `B2_*` configuradas, faz fallback para data URL base64 no próprio `pdfUrl` (builds antigos com `data:` continuam sendo servidos). Requer `pandoc` e `tectonic` instalados (tectonic baixa pacotes LaTeX sob demanda na 1ª execução).

## 9. Integração com o ai-gateway

`server/src/lib/ai-gateway.ts` chama `AI_GATEWAY_URL` (default `http://127.0.0.1:9012`) com `Authorization: Bearer AI_GATEWAY_KEY`:

- `POST /v1/search` — `{ query, max_results, categories }` → `{ results: [...] }`
- `POST /v1/chat/completions` — formato OpenAI, modelo `AI_GATEWAY_MODEL` (default `llama-3.3-70b-versatile`)

Use `127.0.0.1` (não `localhost`) — o `fetch` do Node resolve `localhost` para IPv6 e o gateway escuta IPv4.

## 10. Variáveis de ambiente (`server/.env`)

| Var | Default | Uso |
| --- | --- | --- |
| `DATABASE_URL` | — | Postgres (Prisma). |
| `JWT_SECRET` | — | Assinatura do token; **obrigatório, mín. 16 chars** (server falha no boot sem ele, exceto em testes). |
| `PORT` | `4000` | Porta do server. |
| `CLIENT_ORIGIN` | `http://localhost:5175` | CORS. |
| `CLIENT_DIST` | `../client/dist` | Diretório do SPA estático servido pelo Express na mesma origem. |
| `AI_GATEWAY_URL` | `http://127.0.0.1:9012` | Endpoint do gateway. |
| `AI_GATEWAY_KEY` | — | Bearer do gateway. |
| `AI_GATEWAY_MODEL` | `llama-3.3-70b-versatile` | Modelo do chat. |
| `AI_GATEWAY_VERIFY_MODEL` | = `AI_GATEWAY_MODEL` | Modelo usado na verificação de afirmações do Orientador. |
| `CROSSREF_MAILTO` | `support@skywrite.app` | E-mail do polite pool do Crossref (DOI/títulos). |
| `B2_ENDPOINT` / `B2_REGION` | — | Endpoint S3-compatível e região do bucket Backblaze B2. |
| `B2_KEY_ID` / `B2_APP_KEY` | — | Credenciais (application key) do B2. |
| `B2_BUCKET` | — | Bucket onde os PDFs de build são gravados. |
| `LANGUAGETOOL_URL` | `https://api.languagetool.org` | Endpoint do LanguageTool (gramática); aponte para instância self-hosted em produção. |
| `ORIGINALITY_API_URL` / `ORIGINALITY_API_KEY` | — | Provedor externo de plágio/detecção de IA; sem eles, `/originality` responde `configured:false`. |

`server/.env` está no `.gitignore`. Portas: client **5175**, server **4000**, gateway **9012**.

## 11. Execução

```bash
bun install
bun run db:migrate && bun run db:seed
bun run dev            # client :5175 + server :4000
```

Login demo: `demo@thesis.writer` / `demo123`.

## 12. Testes

- **Server** (`cd server && bun test`): unit (`paper-ingest`, `thesis-analysis`) + integração de todas as rotas, subindo o app em processo (`createApp()` em `src/app.ts`). Rotas dependentes do gateway aceitam 200 (ligado) ou 502 (desligado).
- **Client** (`cd client && bun run test:e2e`): Playwright — landing, login, editor (abas + file tree), live preview. Requer `bun run dev` ativo.
