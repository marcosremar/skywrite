# Skywrite — Roadmap de MVP

Plano derivado de uma auditoria multi-agente do código (6 dimensões + crítico de completude). Cada item cita evidência real (`arquivo:linha`). Para a especificação do sistema, ver [SPEC.md](SPEC.md).

> ⚠️ **Urgente, fora dos marcos:** `git ls-files client/ server/` retorna **0** — todo o stack atual está **untracked**, e a árvore commitada ainda é o app Next.js antigo. Versionar é o primeiro item de M0.

## Definição de MVP

SaaS web onde um usuário acadêmico cria conta, escreve uma tese em Markdown no editor live-preview, recebe feedback do Orientador Virtual (análise local + Chat RAG com fontes), **gera e baixa** um PDF acadêmico, e gerencia seus projetos (criar/renomear/editar metadados/excluir) — rodando de forma reproduzível em produção (origem única, HTTPS, com pandoc+tectonic e ai-gateway alcançáveis), sem perda silenciosa de trabalho e sem prometer na landing o que não entrega.

**"Pronto" = e somente =:**
1. Stack client+server versionado em git.
2. `bun run build` (client) e `tsc --noEmit` (server) passam limpos, com CI travando regressão.
3. Dockerfile/compose real sobe app+postgres com pandoc+tectonic; Express serve o client estático na mesma origem; `POST /build` gera e o usuário **baixa** um PDF de uma tese seedada, ponta a ponta.
4. Loop sem becos sem saída: imagens inseríveis que compilam, metadados editáveis, projetos excluíveis.
5. Save confiável: falha de save e 401 sinalizados (sem "Salvo" mentiroso) + aviso de saída em estado dirty.
6. Segurança mínima de SaaS: `JWT_SECRET` obrigatório sem fallback, rate-limit em auth/build/research, path traversal bloqueado, sem propaganda de planos inexistentes, e LGPD básica (Termos/Privacidade + exclusão de conta).

Tudo fora desta lista é pós-MVP.

## Visão geral dos marcos

| Marco | Objetivo | Esforço | Depende de |
|---|---|---|---|
| **M0** Baseline versionado e verde | Versionar, compilar limpo, travar com CI | ~1 dia | — |
| **M1** Deploy + PDF entregável | Subir em prod numa origem; usuário baixa o PDF | ~3 dias | M0 |
| **M2** Loop sem becos sem saída | Imagens, metadados, excluir projeto, toolbar | ~3 dias | M1 |
| **M3** Confiabilidade de dados/sessão | Nunca perder trabalho nem ficar em sessão zumbi | ~2 dias | M2 |
| **M4** Hardening mínimo + LGPD | Segurança e conformidade pra operar comercialmente | ~3-4 dias | M1 (paralelizável c/ M2/M3) |

---

## M0 — Baseline versionado e verde (~1 dia)

Tornar o stack versionável, compilável e protegido por CI. Sem isto, nada do resto é confiável nem deployável.

- **[S] Versionar `client/` + `server/` + testes e remover a árvore Next.js morta** — `client/`, `server/`, `app/`, `components/` (Next legado). O stack real é untracked; a árvore commitada é o Next antigo — trabalho e baseline podem se perder.
- **[S] Corrigir `tsc` do client e do server** — `client/src/components/editor/AIAdvisor.tsx:63` (`NodeJS.Timeout` → `ReturnType<typeof setTimeout>`); `server/src/routes/files.ts:108/126/154` (`req.params[0]` indexando `{}`). Hoje `bun run build` sai 1.
- **[M] Scripts de typecheck + CI mínimo** — `.github/workflows/ci.yml`: install → client `tsc -b` + `vite build` → server typecheck + `prisma generate` → `bun test` com Postgres efêmero seedado.

**Aceite:** `git ls-files client/ server/` > 0 e `app/` removido · `bun run build` do client gera `client/dist/index.html` · `tsc --noEmit` do server com 0 erros · CI falha o PR se qualquer passo quebrar.

## M1 — Deploy reproduzível e PDF entregável (~3 dias)

Subir em produção numa única origem com pandoc+tectonic e o usuário conseguir **baixar** o PDF — o objetivo final do loop.

- **[L] Dockerfile multi-stage real + docker-compose (app + postgres)** — novos `Dockerfile`/`docker-compose.yml`; remover os 6 `Dockerfile.*` da era Next (porta 3002, NEXTAUTH, chromium) que quebram em qualquer `docker build`.
- **[M] Instalar pandoc + tectonic na imagem e pré-aquecer o cache do tectonic** — `Dockerfile`. `build.ts:158` faz `spawn('pandoc' … --pdf-engine=tectonic)`; sem os binários todo `POST /build` falha; tectonic baixa LaTeX on-demand na 1ª vez.
- **[M] Express serve o client estático na mesma origem** — `server/src/app.ts:24-34` (`express.static(dist)` + catch-all SPA). Hoje só monta `/api/*`.
- **[S] `.env.example` + fail-fast de `JWT_SECRET`/`DATABASE_URL` + injeção de `AI_GATEWAY_URL/KEY`** — `server/src/auth.ts:4`, `server/src/lib/ai-gateway.ts`, `server/src/index.ts`. Hoje `JWT_SECRET` cai em `dev-secret` mudo e o gateway default `127.0.0.1` aponta pro próprio container.
- **[M] Servir PDF por rota GET dedicada + botão "Baixar PDF"; `clearTimeout` do build** — `server/src/routes/build.ts:47-64/166`, `client/src/components/editor/EditorLayout.tsx:547`. PDF vai como data URL base64 no JSON e fica preso no iframe; o `setTimeout` de 5min nunca é limpo.

**Aceite:** `docker compose up` sobe app+postgres, `/api/health` healthy · raiz serve o SPA e `/api/*` funciona atrás · `POST /build` num projeto seedado → `COMPLETED` com PDF válido · clicar "Baixar PDF" baixa `.pdf` nomeado · server falha no boot sem `JWT_SECRET`/`DATABASE_URL` · nenhum timer de build órfão.

## M2 — Loop de produto sem becos sem saída (~3 dias)

Fechar escrever→editar→gerar sem dead-ends.

- **[L] Upload de imagem + ação "Inserir imagem" com caminho real** — `server/src/routes/files.ts` (rota multipart/base64 p/ `ProjectFile` IMAGE), `EditorToolbar.tsx:25`. Hoje a toolbar insere `![](media/imagem.png)` mas só há gravação de texto utf8 → toda figura aponta pra arquivo inexistente e quebra o PDF.
- **[S] Inserções da toolbar no cursor (`insertAtCursor`)** — `EditorLayout.tsx:354` concatena no fim do documento; negrito/título/citação/imagem vão pro fim, ignorando o cursor.
- **[S] `DELETE /api/projects/:id` (cascade) + UI de excluir** — `server/src/routes/projects.ts`, `client/src/pages/Projects.tsx:66`. Não há como remover projeto.
- **[M] `PATCH /api/projects/:id` + aba Metadados editável** — `projects.ts`, `EditorLayout.tsx:457-483`. A aba Metadados é `<p>` estático; `name/title/author/language` alimentam o `metadata.yaml` do PDF.
- **[S] Tratar `P2025`→404 e `P2002`→409 nas rotas de arquivo** — `files.ts:27/136/163`. Hoje caem em 500 genérico.

**Aceite:** inserir imagem → ela aparece no PDF · botão da toolbar insere no cursor · excluir projeto remove projeto+arquivos+builds após confirmação · editar metadados reflete no próximo build · arquivo inexistente → 404, duplicado → 409.

## M3 — Confiabilidade de dados e sessão (~2 dias)

Num app de escrita, save mudo e sessão zumbi causam perda real de trabalho.

- **[M] Tratamento confiável de save (estado não-salvo, toast, retry)** — `EditorLayout.tsx:155-227`. Falha de PUT só faz `console.error` e "Salvo HH:MM" segue mostrando horário antigo (autosave a cada 2s).
- **[M] `apiFetch` global com redirect em 401** — `client/src/auth.tsx`, `App.tsx`, novo `client/src/lib/apiFetch.ts`. Sem interceptor: após expirar o cookie, tudo retorna 401 mudo.
- **[S] `beforeunload` em estado dirty + flush ao trocar de arquivo** — `EditorLayout.tsx:219-227`. Fechar a aba dentro dos 2s do debounce perde conteúdo.

**Aceite:** simular falha de save → toolbar mostra "não salvo"/"erro" + toast · 401 em qualquer chamada → redireciona pra `/login` · fechar com pendências → aviso nativo.

## M4 — Hardening mínimo e conformidade (~3-4 dias)

Fechar buracos de segurança e legais para operar um SaaS pago com dados pessoais no Brasil. (Depende só de M1; paralelizável com M2/M3.)

- **[M] Bloquear path traversal no build e na criação/rename de arquivo** — `files.ts` (validar `path`), `build.ts:111-113` (`path.join(dir, file.path)` + `writeFile` → `../../` escapa do tempdir e escreve no disco do server).
- **[M] Rate-limit em auth/build/research** — `app.ts`, `auth.ts`, `build.ts`, `research.ts` (`express-rate-limit`). Hoje zero limite: brute-force no login e exaustão de custo no build/research.
- **[M] Validar email + name no register; `clearCookie` consistente; mitigação de prompt-injection** — `auth.ts:8-30`, `research.ts:13-67`. Email não-normalizado, `name` null quebra a UI, e trechos de papers entram no prompt sem delimitação (PDF malicioso instrui o LLM).
- **[M] Tirar/"em breve" planos+preços da landing, corrigir links mortos, padronizar marca** — `Home.tsx:162-218`, `DashboardLayout.tsx:36/67-72`, `seed.ts`. Anuncia "10 builds/mês", "R$29 Pro", "Tradução com IA" sem checkout/enforcement (risco CDC); links Termos/Privacidade/Plano/Config mortos; marca diverge (Thesis Writer vs Skywrite).
- **[M] Termos + Política de Privacidade reais + `DELETE` de conta (LGPD)** — novas páginas `/terms` `/privacy`, `DELETE /api/auth/me` (cascade). SaaS BR coletando nome/email/conteúdo precisa de política e direito de exclusão.
- **[M] Concorrência de build por projeto (409/fila) + e2e de build no CI** — `build.ts:38-39`, `EditorLayout.tsx:173`, `server/test/api.test.ts`. Dois cliques disparam dois pandoc concorrentes; `runPandocBuild` sem cobertura.

**Aceite:** path `../../etc/x` rejeitado (400) e nada escrito fora do tempdir · >N tentativas/min em `/auth/login` → 429 · register normaliza email e exige name; logout remove o cookie de fato · landing sem preços/planos funcionais e sem link morto · `/terms` e `/privacy` existem e o usuário exclui a própria conta · 2º build concorrente → 409 e botão desabilitado enquanto building; e2e de build no CI.

---

## Riscos

| Risco | Mitigação |
|---|---|
| Tectonic baixa LaTeX on-demand na 1ª execução → 1º build em prod lento/depende de rede, pode estourar o timeout de 5min | Build dummy no stage final do Dockerfile pra popular o cache + volume persistente; fixar versões de pandoc/tectonic |
| PDF base64 no Postgres incha `Build` e pode estourar o `express.json` de 10mb ao reler | Servir PDF por rota GET e excluir `pdfUrl` do select de listagem; migrar pra R2/S3 logo após o lançamento (`storageKey` já existe) |
| ai-gateway é SPOF: se cair, o Orientador (diferencial) sai do ar | Health-check do gateway no `/api/health`, distinguir 502 "gateway fora" de 500, mensagem clara na UI; provider secundário = 1ª dívida pós-MVP |
| Cookie `SameSite=Lax` só funciona em origem única; CDN/origem separada quebra o login mudo | Fixar single-origin no MVP (Express serve o dist — M1); origens separadas exigiriam `SameSite=None`+`Secure`+CORS exato (fora de escopo) |
| Upload de imagem como base64 reusa a dívida de payload pesado/limite 10mb | Limitar tamanho por imagem no MVP; migrar pra object storage junto com os PDFs pós-MVP |

## Fora de escopo (pós-MVP, decisão explícita)

Billing real (Stripe) e enforcement de cota · reset/verificação de senha por e-mail · provider LLM secundário/circuit breaker · streaming (SSE) do Orientador · cache de respostas do LLM e verificação fuzzy de citações · object storage (S3/R2) · editor totalmente funcional em mobile (MVP só evita a tela quebrada) · acessibilidade completa (WCAG) · paginação/lazy-load · remoção das tabelas mortas do schema + envelope de erro com zod · allowlist open-access/robots.txt/SSRF na ingestão · TTL/cleanup do cache Paper · CSRF explícito/helmet/logger estruturado · exportação de dados (portabilidade LGPD) · limpeza dos arquivos legados windsurf/ssh/indyserve · vitest no client + mock do ai-gateway.

## Lógica de sequenciamento

Bloqueadores de existência → bloqueadores de deploy → completude do loop → confiabilidade → hardening/legal. **M0** primeiro porque o stack está literalmente untracked e não compila — sem versionar e travar com CI, regressões reentram na main (como os dois `tsc` quebrados já fizeram). **M1** é a barreira entre "roda na minha máquina" e "produto no ar"; quase todo o resto precisa de um ambiente deployável pra ser validado. **M2** fecha os becos que tornam o produto inutilizável para teses reais (figuras que não compilam, toolbar no lugar errado, projetos que não se apagam). **M3** evita perda real de trabalho. **M4** mitiga risco (segurança/legal) e pode rodar em paralelo com M2/M3.
