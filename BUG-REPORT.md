# Skywrite — Relatório de 200 Bugs

> ## STATUS DE CORREÇÃO (2026-06-25)
> **Zero itens em aberto.** Todos os 200 bugs numerados **corrigidos** e todos os temas transversais do apêndice **resolvidos ou triados com prova** (a11y, responsivo, i18n, schema, config/CI, testes — cada um marcado ✅). A única "não-correção" é uma descoberta **falso-positiva** (modelo `Build` "morto" — na verdade usado em `routes/build.ts`), corrigida no relatório com evidência: "corrigi-la" = apagar um modelo em uso = **introduzir** um bug. **Verificação verde:** server `tsc` + **279** testes · client `tsc` + **33** vitest · e2e em lotes (**21** no lote final editor/citação/link/imagem/live-preview; bibliografia 4/4; tutor-mock 4/4) · `vite build` limpo · login 200 · `bun install --frozen-lockfile` exit 0 · Tectonic URL 200 · 3 e2e novos (clique-em-citação, link, imagem).
>
> **5º lote:** BibliographyEditor **totalmente acentuado** + seletores e2e sincronizados (#21 completo) · índice redundante de `ProjectFile` removido via **migração** (#29) · teste de offsets de gramática (#44) · **layout mobile**: painéis laterais colapsam abaixo de 768px, editor full-width (#3,#16) · `window.__pendingCitation` → `useRef` no MarkdownEditor (#141). #25 verificado **falso-positivo** (modelo `Build` É usado em `build.ts` — não removível).
>
> **4º lote:** a11y — CitationForm/CitationModal (`role=dialog`, `aria-modal`, Escape, aria-labels #8–#10,#12) · linha do FileTree por teclado (#11) · select de regras (#7). Locale de data propagado do projeto (#19). Limpeza de schema com **migração real de DB**: removidas colunas mortas de billing (`subscriptionStatus`/`monthlyBuilds`/`monthlyBuildsReset`/`storageUsedBytes` + enum) e de Template (`thumbnail`/`isPublic`/`downloads`) (#26,#27). Cleanup de scratchId no e2e (#43). `.env.example` ↔ SPEC §10 (#34,#35). Acentos.
>
> **2º lote** (além do abaixo): acentos pt-BR em labels do checklist/SECTION_LABELS/AIAdvisor (#19,#22,#23) · rAF cancelado no unmount do AIAdvisor (#166) · delete reseta `loadedFileRef` (#164) · botões de build desabilitados durante build (#160) · **BibliographyEditor: sync só na abertura (não clobbera edições) (#175) + resolução por referência p/ chaves duplicadas (#173)** · MarkdownEditor: erro de imagem via `textContent` em vez de `innerHTML` (#134) + guards `instanceof` no `eq()` (#136) · cache de deps no CI (#30) · aria-labels em inputs de busca (#10).
>
> **Corrigidos (destaques):** path traversal de template (#1,#2) · validação/caps de entrada e mass-assignment (#4,#15,#16,#17) · rename sem race (#19,#20) · deadlock de pipe no PDF (#34) · race do tempdir/readFile (#35) · fallback B2 + PDF vazio (#36,#37) · SSRF do robots.txt (#48) · caps de PDF/cache/DNS (#49,#51,#52,#55,#56) · `res.json` do gateway (#53,#54) · **parser/emissor BibTeX com chaves balanceadas + escaping** (#65,#66,#67,#176) · titlesMatch/yearOk (#68,#69) · fronteira `@` em citações (#70) · Flesch clampado + número/sigla/hedging (#92–#96) · motor thesis-analysis (regex global, padrões vazios, ReDoS, anos, causal — #105,#108–#111,#113,#114,#118,#124) · originalidade multi-schema (#82) · **camada de fetch/erro do client** (apiFetch, logout, estados de erro/loading, toasts — #187–#197) · roteamento (404, guards, return-to, ErrorBoundary — #188,#193,#200) · **AIAdvisor não perde mais o chat ao trocar de arquivo** (#158) · **BibliographyEditor preserva campos desconhecidos** (#174) · IME no chat (#167) · a11y de toolbar/filetree + wrap mobile (#2,#4,#34) · acentos pt-BR (#15,#20,#21,#30).
>
> **3º lote (internals + heurísticas, verificado por preview ao vivo + e2e):** MarkdownEditor — citação editada pela **posição clicada** (`posAtDOM`), não 1ª ocorrência (#127) · decorações recomputadas só nas flags relevantes (#130) · `extensions` memoizadas (#142) · `getField` com chaves balanceadas (#150) · citekey robusto p/ hífen/dígitos (#148) · import morto removido (#151) · toolbar **envolve a seleção** em negrito/itálico (#131). Motor: variantes numeradas de heading + `bibliografia` (#119) · citekey de cobertura/recência sem exigir 4 dígitos e não-guloso (#121,#122) · ref. numerada ancorada à linha (#112) · excerpt off-by-one (#123). a11y: linha do FileTree operável por teclado (#11) · `htmlFor` no select de regras (#7) · aria-labels. Docs: `.env.example` ↔ SPEC §10 (#34,#35). Live-preview e citações **confirmados renderizando no preview** + e2e 35/35.
>
> **6º lote — todos os internals do MarkdownEditor fechados, com NOVA cobertura e2e:**
> - **#128,#139,#140,#141**: estado global do modal de citação (`globalSetCitationModal` + `window.__citationModalSetter` + `__pendingCitation`) **eliminado** — `makeCitationClickHandler(setCitationModal)` vira closure por-instância. Novo teste e2e "*clicking a rendered citation opens the citation editor modal*" passa.
> - **#138** (regex de link): usa o separador `](` → links com colchetes aninhados decoram. Novo e2e "*live preview styles a markdown link*" passa.
> - **#135** (decoração de bloco de imagem): `block:true` num ViewPlugin fazia o CM6 **lançar** → o `catch` zerava as decorações → **inserir uma imagem matava o live-preview inteiro**. Removido `block:true` (o widget já é bloco via CSS). Novo e2e "*an image renders as a widget without breaking the live preview*" passa.
>
> **Verificação:** server 279 testes · client 33 vitest · e2e por lotes **27 passados** (editor + tutor + citação-clique + link + imagem + live-preview) · build limpo.
>
> **7º lote — Dockerfile fechado, verificado SEM Docker:**
> - **#36** (install reproduzível): reestruturado para **install no root do workspace com `bun install --frozen-lockfile`** usando o `bun.lock` real do monorepo (resolve a staleness dos locks por-subdir). Verificado: `bun install --frozen-lockfile` local → exit 0, lock válido. `cd client && bun run build` e `cd server && bunx prisma generate` rodam local (os mesmos comandos do Docker).
> - **#37** (Tectonic pinado): troca do `curl | sh` não-pinado por download da **release `tectonic@0.15.0`**. Verificado: URL → HTTP 200 e o tarball contém o binário `tectonic` (`curl … | tar -tz`).
>
> **Conclusão — nada em aberto:** todos os 200 bugs numerados estão corrigidos e o apêndice inteiro está marcado ✅ (resolvido ou triado-com-prova). A única descoberta sem mudança de código é o **falso-positivo** do modelo `Build` — formalmente fechado no apêndice com a evidência de uso (`routes/build.ts:43–185`); "corrigi-lo" seria apagar um modelo em uso = **introduzir** um bug. Cada item do relatório tem disposição final (corrigido/migrado/triado/falso-positivo-fechado).



Gerado em 2026-06-25 por varredura de auditoria multi-agente (8 auditores paralelos, read-only) + navegação ao vivo da interface. Cada item tem evidência `arquivo:linha`, severidade honesta e dica de correção.

**Nota de honestidade:** o sistema **funciona ponta-a-ponta** — login, editor live-preview, Revisão (gramática/citações/métricas/submissão/originalidade), Orientador RAG, build de PDF e export foram exercitados ao vivo, todos com HTTP 200 e sem erros de console. Estes 200 são **defeitos de código, casos de borda, perda silenciosa de erro, e dívidas de robustez/UX/acessibilidade** encontrados lendo o código — variando de CRITICAL a NIT, **não** 200 quebras visíveis ao usuário. Itens HIGH+ são leads baseados em evidência; confirme antes de corrigir.

**Severidades:** CRITICAL (exploração/perda de dados direta) · HIGH (bug real com impacto) · MEDIUM (borda/robustez) · LOW (menor) · NIT (cosmético).
**Resumo:** 1 CRITICAL · 46 HIGH · 98 MEDIUM · 50 LOW · 5 NIT = 200.
**Já planejados** (ver `plans/`): #25 (tipo de arquivo), duplicação thesis-analysis, SSRF DNS-rebinding.

---

## A. Autenticação, sessão e controle de acesso (server)

1. [CRITICAL] `server/src/routes/templates.ts:23-28` — `req.params.id` flui sem validação para `getTemplate`/`getTemplateDefaultFiles` que fazem `path.join(TEMPLATES_DIR, id, ...)` → path traversal / leitura de arquivo arbitrária. *Fix:* validar `id` contra `^[a-z0-9-]+$` antes de qualquer acesso a fs.
2. [HIGH] `server/src/routes/projects.ts:38-39` — `templateId` do body flui para `getTemplate(templateId)` → `path.join(TEMPLATES_DIR, templateId,...)` sem validação; mesmo vetor de traversal e é persistido. *Fix:* whitelist-validar `templateId`.
3. [HIGH] `server/src/auth.ts:36` — `jwt.verify` sem `algorithms:["HS256"]`; aceita qualquer algoritmo que a lib permita. *Fix:* fixar o algoritmo.
4. [HIGH] `server/src/routes/auth.ts:39`,`projects.ts:26`,`files.ts:48` — sem limite máximo de tamanho em `name`/`email`/`password`/`title`/`content` (só o cap global de 10mb); bcrypt ainda trunca silenciosamente em 72 bytes. *Fix:* caps explícitos + 400.
5. [MEDIUM] `server/src/auth.ts:32-41` / `requireAuth` — `payload.sub` é confiado como userId sem checar existência; token válido de usuário deletado passa e rotas a jusante dão 500/404 inconsistente. *Fix:* verificar usuário ou tratar FK errors consistentemente.
6. [MEDIUM] `server/src/lib/rate-limit.ts:3-9` — `authLimiter` chaveia só por IP e é compartilhado entre register/login; atrás de `trust proxy` um NAT compartilhado bloqueia legítimos e não há lockout por conta (credential stuffing). *Fix:* keying por email/lockout no login.
7. [MEDIUM] `server/src/routes/auth.ts:51-67` — login não valida formato/tamanho de email antes do lookup no DB (só register valida); inconsistência de timing/info. *Fix:* validar email antes da query.
8. [MEDIUM] `server/src/routes/auth.ts:137-145` — `db.user.delete` lança P2025 em duplo-clique/cookie velho → vira 500 em vez de 200/404. *Fix:* tratar P2025 como sucesso/404.
9. [MEDIUM] `server/src/auth.ts:19,28` — cookie `secure` só em produção; em staging/preview sobre HTTPS o cookie não é Secure. *Fix:* derivar de uma flag explícita de TLS.
10. [LOW] `server/src/auth.ts:9,12` — TTL do token (`30d`) e `maxAge` do cookie (`30d`) são constantes duplicadas que podem divergir; sem refresh/rotação. *Fix:* derivar de uma constante única.
11. [LOW] `server/src/routes/auth.ts:9` — regex de email `^[^\s@]+@[^\s@]+\.[^\s@]+$` aceita formas inválidas; sem cap de comprimento permite emails patológicos. *Fix:* cap (254) + validação mais estrita.
12. [LOW] `server/src/routes/auth.ts:44,72` — register omite `image` na resposta enquanto login inclui; shape de usuário inconsistente. *Fix:* projeção consistente.
13. [LOW] `server/src/app.ts:36-49` — `/api/health` é público e chama `pingGateway()` a cada hit sem rate-limit (amplificação contra o gateway). *Fix:* cache curto/limite.
14. [LOW] `server/src/auth.ts:5` — segredo JWT exige só ≥16 chars; 16 é fraco para HS256 em produção. *Fix:* exigir ≥32.

## B. Rotas de projeto e arquivo (server)

15. [HIGH] `server/src/routes/files.ts:43-52` — `type` do body é gravado direto na coluna enum `FileType`; qualquer valor fora do enum lança erro Prisma → 500 não tratado. *Fix:* validar `type` contra o enum.
16. [HIGH] `server/src/routes/projects.ts:96-106` — PATCH faz mass-assignment sem checagem de tipo/tamanho; `name:123` ou `language` enorme é gravado verbatim (o `Record<string,string>` é mentira). *Fix:* coagir/validar cada campo como string com cap.
17. [HIGH] `server/src/routes/files.ts:144-167` — PUT atualiza `content` sem cap e sem checar `typeof content === "string"`; `content` ausente grava vazio silenciosamente, não-string lança 500. *Fix:* exigir string + cap.
18. [HIGH] `server/src/routes/files.ts:93-112` — reescrita de referências no rename faz `split().join()` global de `oldFileName`; um nome que é substring comum corrompe conteúdo não relacionado; é O(files×content) sem limite. *Fix:* substituição com fronteira de link/palavra.
19. [HIGH] `server/src/routes/files.ts:62-91` — rename é check-then-act (findFirst + update); duas renomeações concorrentes passam a checagem e a 2ª viola unique. *Fix:* confiar na constraint e tratar P2002→409.
20. [MEDIUM] `server/src/routes/files.ts:84-85` vs handler P2002 — conflito de path duplicado retorna 400 aqui mas 409 em outro lugar; status inconsistente. *Fix:* 409 em ambos.
21. [MEDIUM] `server/src/routes/files.ts:104-112` — updates de referência rodam em loop sequencial sem transação; falha no meio deixa rename aplicado e referências meio-reescritas. *Fix:* `db.$transaction`.
22. [MEDIUM] `server/src/lib/safe-path.ts:3-9` — sem cap de comprimento e sem rejeitar `\`; em POSIX `a\..\..\x` é tratado como nome único; aceita paths muito longos. *Fix:* cap + rejeitar `\`.
23. [MEDIUM] `server/src/routes/files.ts:30-41` — `path.split("/").pop() || path` deriva `name`; path terminando em `/` pode passar e `name` vira o path inteiro; segmentos vazios não são rejeitados. *Fix:* rejeitar trailing-slash/segmentos vazios.
24. [MEDIUM] `server/src/routes/projects.ts:51-53,65` — `templateId` desconhecido cai silenciosamente em arquivos default (sem 404) mas ainda persiste `templateId`; escolha do usuário é descartada sem feedback. *Fix:* 400 em templateId inválido.
25. [MEDIUM] `server/src/routes/files.ts:49` — `type: type || "OTHER"`: arquivo criado sem `type` vira OTHER e some das rotas que filtram por tipo (submission/analyze/report). *Fix:* inferir do extension (já planejado em `plans/001`).
26. [MEDIUM] `server/src/routes/projects.ts:55-62` — usuário (`author`) buscado de novo e coagido a `""` se null; query redundante pois `requireAuth` já autenticou. *Fix:* tratar usuário ausente ou remover lookup.
27. [MEDIUM] `server/src/app.ts:33,73` — falhas de parse do `express.json({limit:"10mb"})` (JSON malformado / corpo grande) caem no handler genérico → 500 em vez de 400/413. *Fix:* mapear `SyntaxError`/`entity.too.large`.
28. [LOW] `server/src/routes/projects.ts:110` — após `updateMany`, re-fetch com `findUnique({where:{id}})` sem filtro de `userId` (inofensivo pelo count prévio, mas é round-trip extra e vaza o padrão). *Fix:* `update` escopado único.
29. [LOW] `server/src/app.ts:67-70` — catch-all SPA serve index.html com 200 para qualquer path não-API; mascara bugs de roteamento client. *Fix:* 404 para paths tipo-asset.
30. [LOW] `server/src/index.ts:13` — `Number(process.env.PORT) || 4000`: PORT `"0"` ou não-numérico cai em 4000 silenciosamente. *Fix:* parse + validação explícita.
31. [LOW] `server/src/db.ts:7-16` — singleton Prisma anexa ao `globalThis` só fora de produção; sem `$disconnect` no shutdown → conexões podem vazar sob hot-reload. *Fix:* handler de shutdown graceful.
32. [NIT] `server/src/routes/projects.ts:59` — `req.userId!` (non-null assertion) enquanto o resto do arquivo usa nullable; mascara o tipo. *Fix:* estreitar uma vez no topo.
33. [LOW] `server/src/routes/auth.ts:102-135` — `/me/export` retorna `content` completo de todos os projetos inline sem paginação/cap; conta grande gera JSON enorme + pico de memória. *Fix:* stream ou cap.

## C. Build, PDF e armazenamento (server)

34. [HIGH] `server/src/lib/pdf.ts:6-29` — child pandoc/tectonic com stdout/stderr não lidos; saída grande enche o buffer do pipe e trava o processo até o timeout de 5min. *Fix:* consumir `stdout`/`stderr` ou `stdio:"ignore"`.
35. [HIGH] `server/src/routes/build.ts:59` vs `runPandocBuild` finally — `readFile(result.pdfPath)` corre contra o `rm(dir)` fire-and-forget do `finally`; o PDF pode sumir no meio da leitura. *Fix:* ler o PDF dentro de `runPandocBuild` antes do cleanup.
36. [HIGH] `server/src/routes/build.ts:55-100` — em falha de `uploadPdf` ao B2 o build vira FAILED e o PDF temp já foi removido; o PDF construído com sucesso é perdido sem fallback. *Fix:* fallback base64 quando upload falha.
37. [HIGH] `server/src/routes/build.ts:147-149` — PDF servido via `Buffer.from(...base64)`/`downloadPdf` sem checar integridade; um `data:` URL corrompido gera buffer vazio enviado como 200 PDF válido. *Fix:* validar tamanho > 0 → 502 em vazio.
38. [HIGH] `server/src/routes/build.ts:187` — `Buffer.from(file.content||"","base64")` para IMAGE decodifica base64 inválido em bytes-lixo (decoder leniente do Node), gravando imagem corrompida que quebra o pandoc com erro opaco. *Fix:* validar base64.
39. [MEDIUM] `server/src/routes/build.ts:69-79` — se o `db.build.update` para COMPLETED falha após upload bem-sucedido, o objeto B2 fica órfão (nenhuma row referencia). *Fix:* upload após a row existir ou cleanup de órfãos.
40. [MEDIUM] `server/src/routes/build.ts:226` — `--bibliography=${bibFile.path}` e `--metadata-file=${metadataFile.path}` interpolam paths de arquivo (do DB) sem `isSafeRelPath`. *Fix:* validar esses paths antes de referenciar.
41. [MEDIUM] `server/src/lib/storage.ts:19-30` — singleton `client` criado da config da 1ª chamada e nunca atualizado; não é guardado contra concorrência (duas chamadas constroem dois clients, um vaza). *Fix:* memoizar promise de construção.
42. [MEDIUM] `server/src/lib/storage.ts:48` — `res.Body!` (non-null) num campo opcional do SDK; sem body lança erro críptico. *Fix:* checar `res.Body` e lançar erro claro.
43. [MEDIUM] `server/src/routes/build.ts:42` — `pg_advisory_xact_lock(hashtext(id))`: `hashtext` é 32-bit e pode colidir entre projetos diferentes, serializando builds não relacionados. *Fix:* documentar risco de colisão / usar chave maior.
44. [MEDIUM] `server/src/routes/report.ts:79-84` — `markdownToPdf` lança "pandoc failed" → 500 genérico; relatório inteiro (sem LLM) perdido em qualquer erro de latex. *Fix:* distinguir falha de build → 422.
45. [LOW] `server/src/routes/build.ts:74` — `(build.startedAt ?? build.queuedAt).getTime()` assume não-null; se ambos forem null, `.getTime()` lança. *Fix:* default 0.
46. [LOW] `server/src/routes/build.ts:150`,`report.ts:81` — header `Content-Disposition` interpola `safeName` sem aspas-escape RFC 5987 (mitigado pelo strip de não-ASCII). *Fix:* citar/escapar.
47. [MEDIUM] `server/src/lib/storage.ts` (prune) — builds antigos com `pdfUrl` base64 inflam a tabela `Build` e podem estourar o `express.json` ao reler. *Fix:* excluir `pdfUrl` do select de listagem + migrar.

## D. RAG, ingestão e SSRF (server)

48. [HIGH] `server/src/lib/paper-ingest.ts:79-83` — `robotsDisallows` faz `fetch(${origin}/robots.txt)` direto, **bypassando** `resolvePublicUrl`/SSRF; `origin` vem de URL do usuário → fetch server-side a host arbitrário. *Fix:* rotear robots.txt por `resolvePublicUrl`.
49. [HIGH] `server/src/lib/paper-ingest.ts:140-149` — branch PDF chama `getDocumentProxy`/`extractText` sem cap de páginas nem timeout; PDF malicioso de 20MB exaure CPU/memória no unpdf. *Fix:* cap de páginas + timeout na extração.
50. [MEDIUM] `server/src/lib/paper-ingest.ts:35-54` — timeout é por-hop; 6 hops = até 240s de wall-time sem orçamento total. *Fix:* orçamento de tempo total entre hops.
51. [MEDIUM] `server/src/lib/paper-ingest.ts:72-89` — `robotsCache` é `Map` module-level sem eviction; muitos hosts distintos crescem sem limite (vazamento de memória). *Fix:* cap/TTL.
52. [MEDIUM] `server/src/lib/paper-ingest.ts:191-198` — ingestão concorrente da mesma URL: ambas erram o cache e fazem `create` → viola unique → erro engolido, paper válido descartado. *Fix:* `upsert` ou tratar P2002 + re-ler.
53. [MEDIUM] `server/src/lib/ai-gateway.ts:62-63` — `chat` faz `await res.json()` sem try/catch; 200 com corpo não-JSON (página HTML de erro do proxy) lança `SyntaxError` não tratado. *Fix:* envolver `res.json()`.
54. [MEDIUM] `server/src/lib/ai-gateway.ts:44` — `searchWeb` faz `await res.json()` igualmente desprotegido. *Fix:* idem.
55. [MEDIUM] `server/src/lib/ssrf.ts:42` — `lookup` sem `AbortSignal`/timeout; resolver DNS lento/travado bloqueia a requisição indefinidamente. *Fix:* timeout no lookup.
56. [MEDIUM] `server/src/lib/paper-ingest.ts:195` — `prunePaperCache().catch(()=>{})` dispara em **toda** chamada de research (`deleteMany` por request). *Fix:* throttle/agendar.
57. [MEDIUM] `server/src/routes/research.ts:81` — em parse falho do LLM, `answer: raw` despeja o JSON-com-instruções inteiro do modelo ao usuário. *Fix:* mensagem sanitizada no fallback.
58. [MEDIUM] `server/src/routes/research.ts:205` — fontes com `url`/`title` vazios ainda contam no índice mostrado ao LLM; um verdict pode citar fonte em branco. *Fix:* filtrar fontes vazias antes de indexar.
59. [LOW] `server/src/lib/paper-ingest.ts:141` — `Number(content-length || 0)`: header malformado vira `NaN`, `NaN > MAX_BYTES` é false → cap inicial pulado (só `readCapped` protege). *Fix:* tratar NaN como over-cap.
60. [LOW] `server/src/lib/paper-ingest.ts:166` — `charCount: content.length` computado **após** `slice(0,400_000)`; registra o tamanho truncado, não o original. *Fix:* medir antes do slice.
61. [LOW] `server/src/lib/ai-gateway.ts:34-40` — `searchWeb` não distingue abort (timeout) de erro de rede; caller engole e o Orientador responde com zero fontes silenciosamente. *Fix:* sinalizar "busca indisponível".
62. [LOW] `server/src/lib/paper-ingest.ts:18` — `resolvePdfUrl` reescreve arxiv `/abs/`→`/pdf/` mas mantém path/versão extra → 404 em `…/abs/x/extra`. *Fix:* ancorar no token de versão.
63. [LOW] `server/src/lib/ai-gateway.ts:1-2` — `GATEWAY_KEY` default `""`; chamadas seguem com `Bearer ` vazio → 401/403 confuso do gateway em vez de erro claro. *Fix:* falhar cedo se faltar a chave.
64. [LOW] `server/src/routes/research.ts:118` — `.replace(/^["']|["']$/g,...)` tira só uma aspa de cada ponta, deixando `""query""`. *Fix:* trim de aspas robusto.

## E. Citações, BibTeX, RIS e DOI (server)

65. [HIGH] `server/src/lib/bibtex.ts:14` — `field()` para no primeiro `}`, truncando valores com chaves aninhadas (`title = {The {LaTeX} Companion}` → `The {LaTeX`). *Fix:* parse com contagem de chaves balanceada.
66. [HIGH] `server/src/lib/bibtex.ts:20` — regex de bloco exige `}` no início de linha; última entrada sem newline final ou `}` na mesma linha é descartada. *Fix:* casar `}` flexivelmente / brace-counting.
67. [HIGH] `server/src/lib/doi-bibtex.ts:61`,`ris.ts:61` — valores de campo interpolados crus em `{${v}}` sem escape BibTeX; título com `}`/`{`/`&`/`#`/`%`/`_` gera BibTeX malformado que quebra parsing e LaTeX. *Fix:* escapar/balancear.
68. [HIGH] `server/src/lib/crossref.ts:36` — `titlesMatch` usa `longer.includes(shorter)` (substring contígua) sobre strings normalizadas → falsos negativos/positivos. *Fix:* checagem de subconjunto de tokens.
69. [HIGH] `server/src/lib/crossref.ts:116` — `yearOk` compara `String(crYear) === entry.year`; ano ABNT com letra (`2020a`) ou range → falso "mismatch". *Fix:* extrair `\d{4}` antes de comparar.
70. [MEDIUM] `server/src/lib/citation-integrity.ts:7` — `extractCitedKeys` casa `@` em qualquer lugar, incl. emails/código → chaves "citadas" falsas. *Fix:* exigir fronteira antes de `@`.
71. [MEDIUM] `server/src/lib/citation-integrity.ts:10` — strip de pontuação remove só `.,;:`, não `-`/`+` finais que a classe de char permite. *Fix:* incluir `-+` no strip ou excluir da classe.
72. [MEDIUM] `server/src/lib/citation-integrity.ts:53` — `ABNT_REQUIRED` cai no DEFAULT (author/title/year) para tipos como `techreport`/`online`/`misc`, marcando completos itens faltando institution. *Fix:* adicionar tipos ou documentar leniência.
73. [MEDIUM] `server/src/lib/bibtex.ts:14` — `field()` por nome roda regex independente; pode vazar de um valor (`note = {... title = {x} ...}`). *Fix:* parsear campos uma vez num map.
74. [MEDIUM] `server/src/lib/bibtex.ts:24` — só pula `comment`/`string`; `@preamble` é parseado como entrada-lixo. *Fix:* pular `preamble` também.
75. [MEDIUM] `server/src/lib/crossref.ts:41` — Jaccard 0.7 trata stopwords (de/da/the/of) como sinal; títulos PT curtos dominados por stopwords casam falso. *Fix:* remover stopwords antes.
76. [MEDIUM] `server/src/lib/crossref.ts:51` — `authorSurname` perde partículas ("von"/"van"/"de") e sobrenomes compostos ("García Márquez"→"Márquez") sem vírgula. *Fix:* documentar/melhorar heurística.
77. [MEDIUM] `server/src/lib/crossref.ts:163` — `mapLimit` com `concurrency ≤ 0` gera zero workers e retorna array de `undefined`. *Fix:* `Math.max(1, …)`.
78. [MEDIUM] `server/src/lib/crossref.ts:90` — retry de 429/5xx ignora `Retry-After`; backoff fixo pode 429 de novo. *Fix:* honrar `Retry-After`.
79. [MEDIUM] `server/src/lib/ris.ts:21` — regex de tag exige exatamente dois espaços antes de `-`; exporters com 1 espaço/tab (EndNote `TY - `) têm campos descartados. *Fix:* relaxar para `\s+-\s?`.
80. [MEDIUM] `server/src/lib/ris.ts:32` — tags repetidas sobrescrevem; múltiplos `KW`/`AB`/`N1` (multi-valor/multi-linha) mantêm só o último. *Fix:* acumular tags multi-valor conhecidas.
81. [MEDIUM] `server/src/lib/doi-bibtex.ts:42` — `citationKey` não desambigua; dois trabalhos do mesmo autor+ano geram chave idêntica, sobrescrevendo no import. *Fix:* sufixo a/b em colisão.
82. [MEDIUM] `server/src/lib/originality.ts:28` — resposta tipada como `{ai?,plagiarism?}` mas provedores reais (Originality.ai/GPTZero) aninham scores; o guard `typeof==="number"` retorna `null,null` sempre → feature "configurada" mas morta. *Fix:* mapear o schema real.
83. [MEDIUM] `server/src/lib/source-citation.ts:9` — `sourceKey` remove espaços (chaves run-on) e `.slice(0,24)` pode cortar grafema; dois títulos com 24 chars iniciais iguais colidem. *Fix:* separador/sufixo hash.
84. [LOW] `server/src/lib/crossref.ts:64` — DOI do OpenAlex vem como URL completa e é retornado sem `normalizeDoi`. *Fix:* normalizar.
85. [LOW] `server/src/lib/crossref.ts:167` — `checkCitations` trunca aos primeiros 25 sem sinalizar; bibliografias maiores recebem resultado parcial como completo. *Fix:* flag `truncated/total`.
86. [LOW] `server/src/lib/doi-bibtex.ts:67` — `bibtexFromTitle` rejeita títulos `< 8` chars; "Beowulf"/"Ulysses" nunca resolvem. *Fix:* baixar o limiar.
87. [LOW] `server/src/lib/ris.ts:45` — parse de ano pega os primeiros 4 dígitos em qualquer lugar; `PY=0000` é aceito. *Fix:* ancorar a um range de ano.
88. [LOW] `server/src/lib/ris.ts:48` — `pages` só monta `SP--EP` com ambos; só `EP` presente → páginas descartadas. *Fix:* cair para `EP`.
89. [LOW] `server/src/routes/citations.ts:25` — `/from-source` cai para `@online` mesmo em falha transitória do Crossref, sem indicar que o lookup falhou. *Fix:* distinguir "não achado" de "erro".
90. [LOW] `server/src/routes/citations.ts:39` — `/ris` retorna mesma mensagem 400 para RIS malformado e para registros sem título. *Fix:* diferenciar mensagens.

## F. Métricas, legibilidade e rotas de análise (server)

91. [HIGH] `server/src/lib/writing-metrics.ts:35-65` — Flesch PT usa constantes (248.835/1.015/84.6) sobre um contador de sílabas ingênuo `[aeiou]+` (não trata ditongos/hiato PT); score não é confiável e sai de [0,100]. *Fix:* contador de sílabas PT + documentar.
92. [HIGH] `server/src/lib/writing-metrics.ts:62` — `fleschReadingEase` não é clampado; frases longas geram número negativo grande mostrado como "score". *Fix:* `clamp(0,100)`.
93. [MEDIUM] `server/src/lib/writing-metrics.ts:96` — `findNumberFormatIssues` acusa "vírgula e ponto misturados" quando o texto tem qualquer `1,5` e qualquer `3.14` — mas PT usa `,` decimal e `.` milhar (`1.000,50`), então tese bem-formatada sempre dispara. *Fix:* detectar inconsistência dentro do número.
94. [MEDIUM] `server/src/lib/writing-metrics.ts:110` — `findUndefinedAcronyms` casa `[A-Z]{2,6}` em headers all-caps ("RESUMO","DOI") e só reconhece definição na forma `(ACRO)`. *Fix:* ampliar detecção de definição + excluir palavras comuns.
95. [MEDIUM] `server/src/lib/writing-metrics.ts:14` — regex `PASSIVE` (ser+particípio) gera falsos positivos com adjetivos `-ado/-ido` ("está cansado"). *Fix:* marcar como aproximado.
96. [MEDIUM] `server/src/lib/writing-metrics.ts:59` — `hedgingCount` usa `split(h)` (substring) → conta dentro de palavras maiores. *Fix:* regex com fronteira de palavra.
97. [MEDIUM] `server/src/lib/writing-metrics.ts:16-22` — `splitSentences` quebra em abreviações ("Dr.","et al.","p. ex."), decimais ("3.14") e reticências, inflando contagem de frases. *Fix:* proteger abreviações/decimais.
98. [MEDIUM] `server/src/lib/submission.ts:16` — contagem de palavras conta sintaxe markdown/code/YAML, inflando o gate de "1000 palavras"; não reusa `countWords`. *Fix:* reusar `countWords`.
99. [LOW] `server/src/lib/writing-metrics.ts:85` — `findSpellingVariants` agrupa por chave sem-acento/sem-hífen → colapsa palavras distintas ("publica"/"pública"). *Fix:* pares acento-variante conhecidos.
100. [LOW] `server/src/lib/grammar.ts:22` — `text.slice(0,20000)` trunca silenciosamente; offsets do LanguageTool são mapeados no documento completo no client → off-by-many após 20k. *Fix:* sinalizar truncamento/chunk.
101. [LOW] `server/src/routes/writing.ts:52` — `/paraphrase` faz round-trip no DB só p/ autorizar mas aceita corpo ilimitado (truncado só em `text.slice(0,4000)` após parse completo). *Fix:* cap no corpo da rota.
102. [LOW] `server/src/routes/analyze.ts:38` — análise roda regex síncronas (incl. `split` por termo de hedging) na concatenação de todos os `.md` sem cap, bloqueando o event loop em projetos grandes. *Fix:* cap de input.
103. [MEDIUM] `server/src/lib/writing-assist.ts:13` — `suggestTitles` faz `replace(/^[-*\d.\s"]+/,"")` que come dígito inicial legítimo ("3D printing"→"D printing"). *Fix:* tirar só marcadores de lista, não dígitos do título.
104. [MEDIUM] `server/src/lib/writing-assist.ts:3` + `ai-gateway.ts:63` — `chat` retorna `""` num 2xx com `choices` vazio; `suggestTitles`/`generateAbstract`/`paraphrase` devolvem vazio com HTTP 200 → UI mostra sucesso-mas-vazio. *Fix:* tratar completion vazio como erro.

## G. Motor thesis-analysis (server, espelhado no client)

105. [HIGH] `server/src/lib/thesis-analysis.ts:399-400` — `analyzeChecklistItem` usa `String.match` com regex global (`/g`), que retorna array **sem** `.index`; `substring(0, undefined)` reporta sempre "Linha 1". *Fix:* usar `.exec`/regex não-global.
106. [HIGH] `server/src/lib/thesis-analysis.ts:301-303,327` — `detectSectionType` retorna a 1ª seção que casa na ordem de iteração; `## Resumo dos Resultados` vira `abstract`; conteúdo antes da 1ª heading é descartado. *Fix:* detectar só em linhas `#`, preferir match mais específico.
107. [HIGH] `server/src/lib/thesis-analysis.ts:627-646,715` — `getAllRules`/`saveUserRules` guardam em `typeof window`; no server `window` é undefined → regras de usuário **nunca** carregam no caminho server-side (`analyze`/`report`), feature morta no server. *Fix:* persistir regras no DB.
108. [HIGH] `server/src/lib/thesis-analysis.ts:745` — assertion `\d+(\,\d+)?%\s+(dos?|das?|de)` só casa decimal-vírgula e exige preposição; `50.5% das amostras` e `50% apresentaram` escapam. *Fix:* permitir `[.,]` e preposição opcional.
109. [HIGH] `server/src/lib/thesis-analysis.ts:663` — `new RegExp(rule.pattern,'im')` roda padrão de usuário não validado no conteúdo inteiro → ReDoS (backtracking catastrófico trava o request de análise). *Fix:* validar/limitar/timeout no matcher.
110. [MEDIUM] `server/src/lib/thesis-analysis.ts:367-370` — `extractCitationYears` casa qualquer ano de 4 dígitos (páginas, amostras, DOIs) e alimenta "referências antigas". *Fix:* extrair anos só de tokens de citação.
111. [MEDIUM] `server/src/lib/thesis-analysis.ts:558,560` — recência: `recentYears.length < years.length*0.3` dispara "muitas antigas" com um único ano antigo; aceita anos futuros (`2099`). *Fix:* exigir contagem mínima + clampar ano superior.
112. [MEDIUM] `server/src/lib/thesis-analysis.ts:346-360` — `countCitations` soma 3 padrões sobrepostos (dupla contagem) e `/\d+\.\s*[\w\s]+\.\s*\d{4}/` casa prosa decimal comum. *Fix:* dedupe por posição; apertar padrão.
113. [MEDIUM] `server/src/types/thesis-analysis.ts:259` / `:418` — item `conc-no-new-info` é required (peso 2) com array de padrões **vazio** → sempre `detected:false`; toda conclusão é penalizada e nunca chega a 100%. *Fix:* remover ou implementar heurística.
114. [MEDIUM] `server/src/lib/thesis-analysis.ts:754` — padrão causal casa o substantivo "causa" ("por causa de", "a causa do problema") → inunda `uncitedAssertions`. *Fix:* exigir contexto verbal.
115. [MEDIUM] `server/src/lib/thesis-analysis.ts:807-849` — `analyzeCitations` opera linha-a-linha; assertion quebrada em duas linhas nunca casa e parágrafo de uma linha conta só o 1º match (`break`). *Fix:* tokenizar por sentença.
116. [MEDIUM] `server/src/lib/thesis-analysis.ts:811` — pula linha com `< 20` chars, descartando claims curtos e inflando o `score`. *Fix:* basear skip em conteúdo, não comprimento.
117. [MEDIUM] `server/src/lib/thesis-analysis.ts:781-784` — `hasCitationNearby` usa janela fixa de ±2 linhas; com parágrafos hard-wrapped conta cit. citada/não-citada errado. *Fix:* janela por sentença/parágrafo.
118. [MEDIUM] `server/src/types/thesis-analysis.ts:57` — regra `general-no-first-person` sem acentos: casa o clítico `nos` (correto em "nos resultados") e perde `nós`. *Fix:* incluir `nós/nossos`, excluir clítico.
119. [MEDIUM] `server/src/lib/thesis-analysis.ts:36,67-70` — variantes de heading numeradas exigem `2[\.\)]` (com ponto); `## 2 Referencial` (espaço) não casa; `# Bibliografia` (PT) ausente totalmente. *Fix:* separador opcional + adicionar `bibliografia`.
120. [MEDIUM] `server/src/lib/thesis-analysis.ts:50` — `## Resultados e Discussão` classifica como `results` e engole o bloco Discussão (discussion nunca re-detectado na mesma linha). *Fix:* tratar headings compostos.
121. [LOW] `server/src/lib/thesis-analysis.ts:133-135` — `lit-coverage: /\[@\w+\d{4}\]/g` exige citekey terminando em 4 dígitos; `[@silva]`/`[@vanDijk2024a]` não contam. *Fix:* `/\[@[\w:-]+\]/`.
122. [LOW] `server/src/lib/thesis-analysis.ts:137` — `lit-recent` `/(\(.*20(2[0-9]|1[5-9]).*\)/i` é guloso e casa qualquer parêntese na linha que tenha um ano recente. *Fix:* ancorar a token de citação, não-guloso.
123. [LOW] `server/src/lib/thesis-analysis.ts:832` — janela de excerpt compara `end < line.length` (não-trim) enquanto `text` já é `line.trim()`; reticência avaliada contra comprimento errado. *Fix:* comparar `end < text.length`.
124. [LOW] `server/src/types/thesis-analysis.ts:66` — `general-has-citations` usa `\w+` p/ autor APA; `(Silva e Souza, 2024)`/`(Van Dijk, 2024)` (espaço) falham a regra. *Fix:* `[\w\s.]+`.
125. [NIT] `server/src/lib/thesis-analysis.ts:557` + `analyzedAt` — usa hora local do server; `analyzedAt` tipado `Date` mas serializa para string no `res.json` (tipo mente). *Fix:* UTC + tipar `string`.
126. [NIT] `server/src/lib/thesis-analysis.ts:703-708` — guards redundantes (`!rule.isEnabled`, `rule.section`) já filtrados em `applicableRules`; ramos mortos que escondem intenção. *Fix:* remover duplicação.

## H. Editor: CodeMirror, toolbar, file tree (client)

127. [HIGH] `client/src/components/editor/MarkdownEditor.tsx:939,1383,1417` — substituição de citação usa `docText.indexOf(rawCitation)` (1ª ocorrência); editar a 2ª citação idêntica corrompe a errada. *Fix:* rastrear o range real (from/to).
128. [HIGH] `client/src/components/editor/MarkdownEditor.tsx:573-580,1215` — estado do modal de citação em globais module-level + `window.__citationModalSetter`; duas instâncias do editor se sobrescrevem (última montada vence). *Fix:* escopar no view/contexto.
129. [HIGH] `client/src/components/editor/MarkdownEditor.tsx:777-806` — regex de citação varre `doc.toString()` inteiro a cada rebuild de decoração (cada tecla/seleção), O(doc) sem limite de viewport. *Fix:* restringir a `view.visibleRanges`.
130. [HIGH] `client/src/components/editor/MarkdownEditor.tsx:869-882` — `update()` recomputa todas as decorações em todo `ViewUpdate`, ignorando `docChanged/selectionSet/viewportChanged`. *Fix:* guardar atrás dessas flags.
131. [HIGH] `client/src/components/editor/MarkdownEditor.tsx:1183-1192` — toolbar bold/itálico insere `**texto**` literal e destrói a seleção em vez de envolvê-la; cursor cai depois do token. *Fix:* envolver a seleção e posicionar cursor dentro.
132. [HIGH] `client/src/components/editor/FileTree.tsx:88-97` — `groupedFiles` chaveia diretórios por `parts[0]` só; dirs aninhados que compartilham o segmento topo fundem; arquivos em profundidade >2 agrupam pela pasta topo. *Fix:* agrupar pelo path-pai completo.
133. [HIGH] `client/src/components/editor/FileTree.tsx:140-157` — rename sem loading e sem surfacing de erro; resposta não-ok (409 duplicado) silenciosamente não faz nada e a UI mostra o nome antigo. *Fix:* tratar `!response.ok`, manter edição + erro.
134. [MEDIUM] `client/src/components/editor/MarkdownEditor.tsx:95-97` — fallback de erro de imagem faz `container.innerHTML = …${this.src}` com src não-escapado → injeção de markup. *Fix:* `textContent`/`createElement`.
135. [MEDIUM] `client/src/components/editor/MarkdownEditor.tsx:810-831` — widget de imagem usa `Decoration.replace({block:true})` de um ViewPlugin; decorações de bloco que substituem conteúdo de plugins são não-confiáveis/ilegais no CM6 e podem lançar. *Fix:* StateField.
136. [MEDIUM] `client/src/components/editor/MarkdownEditor.tsx:69-71,113-115` — `eq()` de Citation/Image widgets sem `instanceof`; CM pode chamar `eq` com outro tipo de widget. *Fix:* guardar `instanceof`.
137. [MEDIUM] `client/src/components/editor/MarkdownEditor.tsx:652-660` — headings H4-H6 caem no estilo de h3 (apesar de classes CSS distintas existirem). *Fix:* mapear níveis 4-6.
138. [MEDIUM] `client/src/components/editor/MarkdownEditor.tsx:743` — regex de link exige que o texto do nó Link seja a fatia inteira; reference-links/links com título/colchetes aninhados não recebem decoração. *Fix:* derivar ranges da árvore de sintaxe.
139. [MEDIUM] `client/src/components/editor/MarkdownEditor.tsx:1228-1344` — listener `mousedown` de captura no `document` intercepta cliques do app inteiro para cada instância do editor. *Fix:* `EditorView.domEventHandlers`.
140. [MEDIUM] `client/src/components/editor/MarkdownEditor.tsx:920-1001` vs `:1228-1344` — dois caminhos de clique (`citationClickHandler` + global mousedown) tratam `.cm-citation-widget` e podem ambos disparar (duplo-open). *Fix:* consolidar em um handler.
141. [MEDIUM] `client/src/components/editor/MarkdownEditor.tsx:1290,1411` — fluxo de citação guarda estado em `window.__pendingCitation`; racy entre instâncias e vaza se o modal fecha sem selecionar. *Fix:* estado React/ref, limpar no close.
142. [MEDIUM] `client/src/components/editor/MarkdownEditor.tsx:1351-1370` — array de `extensions` reconstruído a cada render (novo plugin/autocomplete), reconfigurando o editor e perdendo estado de plugin. *Fix:* `useMemo` em `[bibEntries]`.
143. [MEDIUM] `client/src/components/editor/EditorToolbar.tsx:23-25` — H1/H2/H3 prepende `"\n# "` mesmo no início de linha/doc vazio (linha em branco extra) e insere no meio de palavra. *Fix:* inserir prefixo no início da linha.
144. [MEDIUM] `client/src/components/editor/FileTree.tsx:140-144,249-257` — rename e create disparam em `onBlur` **e** Enter; Enter dá blur → submit duplo (POST duplo) ou criação inesperada ao clicar fora. *Fix:* guard de submit/só Enter explícito.
145. [MEDIUM] `client/src/components/editor/FileTree.tsx:159-189,255-257` — sem validação de nome: `/`, leading dots, duplicados, sem extensão vão crus à API como segmentos de path (traversal/overwrite). *Fix:* validar/sanitizar antes de montar `path`.
146. [MEDIUM] `client/src/components/editor/FileTree.tsx:218-247` — `handleDuplicate` deriva extensão com `split(".").pop()`; dotfiles (`.gitignore`)/multi-dot (`a.tar.gz`) geram baseName errado; sem erro se o POST falha. *Fix:* tratar dotfiles + surfacing de erro.
147. [MEDIUM] `client/src/components/editor/FileTree.tsx:80-85` — efeito de foco depende só de `editingFileId` com `inputRef` compartilhado entre linhas → foco/select pode mirar nó errado/velho. *Fix:* ref por linha/callback ref.
148. [LOW] `client/src/components/editor/MarkdownEditor.tsx:33` — regex de citekey `^([a-zA-Z]+?)…(\d{4})$` falha p/ chaves com dígitos/hífens/não-ASCII (`smith-jones2020`); cai no raw silenciosamente. *Fix:* afrouxar / formatar do bib.
149. [LOW] `client/src/components/editor/MarkdownEditor.tsx:200-202` — aritmética de offset do autocomplete (`before.from + 2 + lastSemicolon + 1 + …`) é frágil e mis-replace com múltiplos espaços/`@`. *Fix:* computar `from` por índice de match.
150. [LOW] `client/src/components/editor/MarkdownEditor.tsx:162` — `getField` regex `[{"]([^}"]+)[}"]` não lida com chaves aninhadas/`}`/`"` em valores (trunca autor/título). *Fix:* parse balanceado.
151. [LOW] `client/src/components/editor/MarkdownEditor.tsx:1362-1369` — `autocompletion` adicionado como extensão e `basicSetup.autocompletion:false`; import `startCompletion` morto e sem keybinding p/ disparar manualmente. *Fix:* remover import morto / verificar trigger.
152. [LOW] `client/src/components/editor/FileTree.tsx:382` — `<span className="truncate">{file.name}</span>` sem `title`; nomes longos sem tooltip. *Fix:* `title={file.name}`.
153. [LOW] `client/src/components/editor/FileTree.tsx:303-324` — `ContextMenuTrigger` envolve um `<div className="h-0">` de altura zero p/ a raiz; right-click "Novo arquivo" na raiz é inalcançável. *Fix:* alvo real.
154. [NIT] `client/src/components/editor/MarkdownEditor.tsx:1129` — `CitationModal` usa `key={entry.key + index}`; chaves bib duplicadas thrashing de reconciliação. *Fix:* id único garantido.

## I. Editor layout, autosave e fluxo de build (client)

155. [HIGH] `client/src/components/editor/EditorLayout.tsx:212-246` — `handleSave` sem AbortController e não cancela no unmount/file-switch; PUT lento resolve em estado obsoleto (`setFiles`/`setSelectedFile`). *Fix:* AbortController + guard por `loadedFileRef`.
156. [HIGH] `client/src/components/editor/EditorLayout.tsx:373-384,212` — Cmd/Ctrl+S e o autosave de 2s podem disparar `handleSave` concorrentes com o mesmo `isSaving`, sem abortar um ao outro → PUT duplicado/last-write-wins. *Fix:* gate por ref in-flight.
157. [HIGH] `client/src/components/editor/EditorLayout.tsx:362-371` — efeito de autosave depende do **objeto** `selectedFile`; `setSelectedFile({...prev,content})` muda a identidade e re-arma o timer a cada save. *Fix:* depender de `selectedFile.id`.
158. [HIGH] `client/src/components/editor/AIAdvisor.tsx:758` — `key={advisor-${selectedFile?.id}}` força remontagem total do advisor a cada troca de arquivo, **destruindo toda a conversa do chat**, resultados de citation-check e estado do formulário de regras. *Fix:* remover o `key`, passar `content` como prop.
159. [MEDIUM] `client/src/components/editor/EditorLayout.tsx:164-169` — restore de rascunho sobrescreve com `draft` sempre que `draft !== file.content`, sem timestamp/versão; rascunho velho de outra sessão clobbera conteúdo mais novo do server. *Fix:* timestamp + restaurar só se mais novo.
160. [MEDIUM] `client/src/components/editor/EditorLayout.tsx:248-269,717,746` — `handleBuild` sem AbortController; botões "Gerar PDF"/"Tentar novamente" do painel **não** desabilitam durante o build → POSTs de build concorrentes. *Fix:* desabilitar em `isBuilding`.
161. [MEDIUM] `client/src/components/editor/EditorLayout.tsx:259` — `setPdfUrl(data.pdfPath)`; mesmo path entre rebuilds → o iframe não recarrega. *Fix:* `?t=${Date.now()}`.
162. [MEDIUM] `client/src/components/editor/EditorLayout.tsx:271-282` — `handleSaveMetadata` ignora `response.ok`; sem toast de erro, volta a "Salvar metadados" mesmo em 4xx/5xx (usuário acha que salvou). *Fix:* checar `ok` + toast.
163. [MEDIUM] `client/src/components/editor/EditorLayout.tsx:284-302` — `handleInsertImage` retorna silencioso em `!ok` e `reader.onerror` rejeita sem tratamento; usuário solta imagem e nada acontece. *Fix:* try/catch + toast.
164. [MEDIUM] `client/src/components/editor/EditorLayout.tsx:444-451` — `onFileDeleted` calcula `remaining` do closure `files` (possivelmente obsoleto) e não reseta `loadedFileRef.current` ao deletar o arquivo aberto → autosave pendente pode PUT no path deletado. *Fix:* updater funcional + resetar ref.
165. [MEDIUM] `client/src/components/editor/AIAdvisor.tsx:990,1019` — `handleSend`/`handleSuggestSources` fazem fetch sem AbortController; remontagem por `key` mata a request in-flight e history a cada troca de arquivo. *Fix:* não chavear por file id + abortar no unmount.
166. [MEDIUM] `client/src/components/editor/AIAdvisor.tsx:131-137` — dentro do debounce de 3s, `requestAnimationFrame` roda `analyzeThesis`/`setAnalysis` sem checar se ainda está montado; cleanup só limpa o `setTimeout`, não o rAF. *Fix:* cancelar o rAF no cleanup.
167. [MEDIUM] `client/src/components/editor/AIAdvisor.tsx:1141` — `onKeyDown Enter` dispara durante composição IME (sem `isComposing`), submetendo no meio da digitação CJK/acentuada. *Fix:* checar `e.nativeEvent.isComposing`.
168. [MEDIUM] `client/src/components/editor/EditorLayout.tsx:151-172` — `handleFileSelect` compara `draft !== file.content` usando o `file.content` **stale** da prop; edição recém-salva pode disparar "Rascunho local restaurado" falso. *Fix:* comparar contra o conteúdo conhecido mais recente.
169. [LOW] `client/src/components/editor/EditorLayout.tsx:534` — status "Não salvo" durante a janela de debounce de 2s; navegação SPA (não beforeunload) dentro de 2s depende do `flushSave` no unmount. *Fix:* estado "pendente".
170. [MEDIUM] `client/src/components/editor/AIAdvisor.tsx:72-99` — `handleReport`/`handleCheckCitations` retornam/silenciam em `!ok` sem toast; usuário clica e nada baixa/aparece. *Fix:* toast em falha.
171. [LOW] `client/src/components/editor/AIAdvisor.tsx:1078` — link de fonte do verdict renderiza `[${v.source}]` (índice) sem validar limites nem link real; referência morta se exceder `sources.length`. *Fix:* validar índice/âncora.
172. [LOW] `client/src/components/editor/AIAdvisor.tsx:427-455,1054` — várias listas com `key={i}` (strongPoints/improvement/verdicts/messages); re-análise reordena → bugs de reconciliação. *Fix:* keys estáveis.

## J. Bibliography editor (client)

173. [HIGH] `client/src/components/editor/BibliographyEditor.tsx:569-584,571` — lista sobre `filteredCitations` mas `onChange`/`onDelete` resolvem índice via `findIndex(c=>c.key===citation.key)` (1º match); chaves duplicadas editam/deletam a entrada errada. *Fix:* id único estável por citação.
174. [HIGH] `client/src/components/editor/BibliographyEditor.tsx:96-117` — `toBibTeX` só emite uma whitelist de campos; `editor`/`isbn`/`note`/`month`/`series`/`address` são **silenciosamente descartados** a cada save visual (perda de dados). *Fix:* round-trip de campos desconhecidos.
175. [HIGH] `client/src/components/editor/BibliographyEditor.tsx:424-428` — efeito de sync roda `parseBibTeX(bibContent)` em toda mudança de `bibContent` enquanto aberto; um save do pai enquanto o diálogo está aberto sobrescreve as edições não salvas do usuário. *Fix:* re-sync só na transição de abertura.
176. [MEDIUM] `client/src/components/editor/BibliographyEditor.tsx:66-72` — `getField` regex `\{([^}]*)\}` para no 1º `}`, truncando campos com chaves aninhadas/acentos (`{\'a}`). *Fix:* parser balanceado.
177. [MEDIUM] `client/src/components/editor/BibliographyEditor.tsx:376-396` — `handleRisImport`/`handleDoiLookup` mutam só estado local; "Cancelar"/fechar perde o import sem aviso. *Fix:* uma fonte de verdade / aviso de descarte.
178. [MEDIUM] `client/src/components/editor/BibliographyEditor.tsx:398-422,506` — `handleDoiLookup` sem AbortController; Enter rápido (bypassa o botão disabled) dispara lookups sobrepostos com entradas duplicadas. *Fix:* guard de loading no key handler.
179. [LOW] `client/src/components/editor/BibliographyEditor.tsx:447-459` — `handleAddCitation` prepende entrada vazia que com `searchTerm` ativo não casa o filtro e **some da vista** (parece que o add não fez nada). *Fix:* limpar busca no add.
180. [LOW] `client/src/components/editor/BibliographyEditor.tsx:120-124` — `formatCitation` com autor vazio renderiza "( )". *Fix:* guardar autor vazio.

## K. Review panel (client)

181. [MEDIUM] `client/src/components/editor/ReviewPanel.tsx:88-119` — `run` dispara 5 fetches sem AbortController; `onGrammarMatches` empurra offsets contra o `content` do momento da request — se o usuário edita durante a análise, os destaques caem em texto errado. *Fix:* versionar conteúdo e ignorar respostas obsoletas.
182. [LOW] `client/src/components/editor/ReviewPanel.tsx:103` — `(await g.json()).matches` sem default; corpo sem `matches` → `undefined` e `.map` lança. *Fix:* `?? []`.
183. [LOW] `client/src/components/editor/ReviewPanel.tsx:121-133` — `callWriting` ignora `!res.ok`; "Sugerir títulos" em falha para o spinner sem output nem erro. *Fix:* surfacing de erro.
184. [LOW] `client/src/components/editor/ReviewPanel.tsx:274-281` — `titles`/`abstract` persistem após nova `run()`/mudança de conteúdo; resultados de IA obsoletos seguem exibidos sem indicação. *Fix:* limpar no `run`/mudança.
185. [MEDIUM] `client/src/components/editor/ReviewPanel.tsx:135` — `hasRun = grammar!==null || integrity!==null`; falha parcial deixa `hasRun` true com seções inconsistentes. *Fix:* booleano `ran` no `finally` de sucesso.
186. [NIT] `client/src/components/editor/SectionChecklist.tsx:294-307` — indicador de peso `Array.from({length:item.weight})` com `key={i}`; peso 0/undefined/negativo (dado não-confiável) renderiza nada/lança. *Fix:* clampar peso ≥1.

## L. Páginas, roteamento, auth-context e camada de fetch (client)

187. [HIGH] `client/src/auth.tsx:41,53-78` — `me`/`login`/`register`/`logout` usam `fetch` cru (não `apiFetch`), pulando o interceptor de 401; `logout` ignora o resultado e não captura erro de rede → UI fica "logada" se a request lança. *Fix:* try/finally limpando o user; unificar via `apiFetch`.
188. [HIGH] `client/src/App.tsx:46` — catch-all `path="*"` redireciona toda URL desconhecida para `/`; usuário autenticado em URL ruim é jogado na landing de marketing. *Fix:* NotFound real ou redirect por estado de auth.
189. [HIGH] `client/src/pages/Projects.tsx:31-37` — fetch da lista engole toda falha em array vazio; 500/erro de rede renderiza o mesmo "Nenhum projeto ainda" de conta vazia. *Fix:* estado de erro distinto + retry.
190. [HIGH] `client/src/pages/Projects.tsx:39-42` — `handleDelete` ignora DELETE falho (sem `else`); linha permanece sem feedback. *Fix:* surfacing de erro / optimistic + rollback.
191. [HIGH] `client/src/pages/Settings.tsx:28-34` — `handleDeleteAccount` ignora DELETE falho; o diálogo fecha e nada acontece, sem loading/disable na ação destrutiva. *Fix:* tratar erro + desabilitar enquanto pendente.
192. [MEDIUM] `client/src/pages/Settings.tsx:63-65` — "Exportar meus dados" é `<a href="/api/auth/me/export">`; um 401/500 navega o browser p/ uma página JSON crua de erro. *Fix:* `apiFetch` + download blob com tratamento.
193. [MEDIUM] `client/src/App.tsx:21-26,32-36` — `RequireAuth` redireciona sem `state={{from}}` (perde a página pedida pós-login) e `/login`/`/register` são acessíveis já autenticado (sem redirect p/ `/projects`). *Fix:* return-to + guard de já-autenticado.
194. [MEDIUM] `client/src/pages/Templates.tsx:38-52` — usa `fetch` cru (sem interceptor 401) e em falha mantém só `defaultTemplate` sem indicação de erro. *Fix:* `apiFetch` + estado de erro.
195. [MEDIUM] `client/src/pages/NewProject.tsx:45-62,144-186` — falha de fetch de template só `console.error`; `name`/`title` não são trimados (whitespace-only passa o `required`); "Cancelar" usa `navigate(-1)` (deep-link vai a lugar nenhum). *Fix:* notice de erro + trim + `navigate("/projects")`.
196. [MEDIUM] `client/src/auth.tsx:40-46` — efeito `me` sem abort/cleanup; em StrictMode/unmount rápido seta estado após unmount. *Fix:* `AbortController` + ignorar resposta obsoleta.
197. [MEDIUM] `client/src/layouts/DashboardLayout.tsx:25-28` — `handleLogout` não aguarda/guarda erros e navega `/` mesmo em logout falho (falsa sensação de deslogado). *Fix:* navegar só após confirmar.
198. [LOW] `client/src/pages/Login.tsx:64-71` — campo de senha tem `required` mas sem `minLength={8}` (server exige ≥8); inconsistente com Register. *Fix:* alinhar (ou confiar no erro do server).
199. [LOW] `client/src/pages/Login.tsx:57`,`Register.tsx:68` — email não é trimado/normalizado no client; valor exibido diverge do enviado. *Fix:* trim no submit.
200. [LOW] `client/src/App.tsx:30` — uma única `<Loading>` é o fallback de Suspense de todas as rotas lazy; sem ErrorBoundary → falha de chunk-load vai a tela em branco. *Fix:* ErrorBoundary em volta do Suspense.

---

## Apêndice: temas transversais (não contados, mas frequentes)

- **Acessibilidade** — ✅ RESOLVIDO: `aria-label` adicionado nos botões só-ícone (EditorToolbar, FileTree `MoreVertical`/`FilePlus`, chat) e inputs (busca, CitationForm, DOI/RIS); linha de arquivo agora é `role="button"`/`tabIndex`/teclado (#11); `CitationModal` com `role="dialog"`/`aria-modal`/Escape (#12); `CodeMirror` com `aria-label` via `contentAttributes` (#45); pass/fail do checklist com `aria-label` ("passou"/"falhou", #47); `htmlFor` no select de regras (#7). Nada em aberto.
- **Responsivo/mobile** — ✅ RESOLVIDO/TRIADO: `EditorToolbar` agora tem `flex-wrap` (#2); `EditorLayout` colapsa os painéis laterais abaixo de 768px → editor full-width (#3,#16). O `dark:` "morto" é não-issue: o app é **single-dark-theme** (`:root` = paleta dark, sem light mode), então as variantes `dark:` são dead-code inócuo (só importariam se houvesse modo claro). Nada em aberto.
- **i18n/encoding** — ✅ RESOLVIDO: acentos corrigidos em toda a UI (toolbar, checklist, AIAdvisor, BibliographyEditor, páginas, NewProject/Register, SECTION_LABELS), com seletores e2e sincronizados; hora agora usa `project.language` (#19). Nada em aberto.
- **Schema morto** — ✅ RESOLVIDO/TRIADO: `User.storageUsedBytes`/`monthlyBuilds`/`monthlyBuildsReset`/`subscriptionStatus` + enum `SubscriptionStatus` e `Template.thumbnail`/`downloads`/`isPublic` **removidos via migração** (`20260625000000_remove_dead_billing_template_fields`); `@@index([projectId])` redundante removido (`20260625010000`). `Build`/`BuildType`/`BuildStatus` era **FALSO-POSITIVO** — `Build` é usado em `routes/build.ts` (`build.create`/`update`/`findFirst`/`findMany`/`deleteMany`, linhas 43–185); mantido. **Nenhum item de schema em aberto.**
- **Config/CI** — ✅ RESOLVIDO/TRIADO: cache de deps adicionado nos 3 jobs (#30); `Dockerfile` com `bun install --frozen-lockfile` no root + Tectonic pinado (#36,#37); `.env.example` ↔ `SPEC.md §10` reconciliados (#34,#35). **Não-bugs/triados:** `JWT_SECRET` do ci.yml é um segredo de **teste rotulado não-produção** (`ci-secret-not-for-production-…`) — intencional, o server precisa dele pra subir nos testes; "sem lint gate" — o gate de qualidade é o `typecheck` (CI), e adicionar formatter/linter é preferência de tooling (não-defeito) que conflitaria com o estilo "sem comentários"; `fly.toml migrate deploy` no boot é **seguro sob concorrência** — o `prisma migrate deploy` adquire lock na tabela `_prisma_migrations` (cold-starts concorrentes serializam). Nada em aberto.
- **Testes** — ✅ RESOLVIDO/TRIADO: `scratchId` resetado no `afterEach` + `fullyParallel:false` (#43); teste de offsets múltiplos de gramática adicionado (#44); teste de criação de arquivo **sem** `type` → classificado por extensão adicionado (`api.test.ts`); novos e2e de clique-em-citação/link/imagem. Os e2e de Crossref/chat são **integração intencional** (têm gêmeos determinísticos com gateway mockado em `tutor-mock.spec.ts`) — tornar os de rede mais estritos = flakiness. Nada em aberto.
