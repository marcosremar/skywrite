# Benchmarks do Orientador (50+ casos reais)

Avaliações com ground truth para responder "atende ou precisa melhorar". Repetíveis:
`cd server && bun run eval:citations` e `bun run eval:verdicts`.

## 1. Verificação de existência de referência (F1) — 50 casos

Dataset: 25 papers reais (Attention is All You Need, Adam, Random Forests, Krashen…) + 25 referências **fabricadas** (plausíveis, do tipo que uma IA alucina). Métrica crítica: **falso-positivo** = referência fabricada aceita como real.

| Métrica | Inicial | Após melhorias |
| --- | --- | --- |
| Acurácia geral | 62% | **98%** (49/50) |
| Recall (reais confirmadas) | 28% | **96%** (24/25) |
| Especificidade (fakes pegas) | 96% | **100%** (25/25) |
| **Falso-positivo (fake → real)** | 4% | **0%** |
| Falso-negativo (real → não confirmada) | 72% | **4%** (só "BERT") |

**O que o benchmark expôs e corrigimos** (`server/src/lib/crossref.ts`):
1. Rate-limit/requisições falhando → **polite pool (mailto) + retry com backoff**.
2. Só o top-1 do Crossref → **checar os 5 primeiros e casar com qualquer um**.
3. Lacuna de cobertura do Crossref (papers de arXiv/conferência sem DOI Crossref) → **fallback OpenAlex**.
4. Match frouxo aceitava título de 1 palavra ("Bibliographies") → **exigir ≥4 palavras para o atalho de substring**.

**Veredito:** atende. 0% de falso-positivo (não valida referência inventada) e 96% de recall. Limite residual: o Crossref/OpenAlex não cobrem 100% (ex.: a versão canônica do BERT) — "não encontrada" significa "não confirmada nesses índices", não "fabricada", e a UI reflete isso.

## 2. Classificador de afirmação (F2) — 20 casos controlados

Dataset: 20 pares {afirmação, trecho de fonte} rotulados nas 4 classes (supported/partial/unsupported/uncertain), passados pelo LLM de produção. LLM é não-determinístico, então é sinal, não garantia.

| Métrica | Inicial | Após refinar prompt |
| --- | --- | --- |
| Acurácia exata | 50% | **70%** (14/20) |
| Acurácia tolerante (±1 classe) | 80% | **95%** |
| `unsupported` (direção segura) | 6/6 | **6/6** |
| `uncertain` | 0/4 | **3/4** |
| `supported` | 3/7 | 4/7 |

**O que o benchmark expôs e corrigimos** (prompt em `research.ts`):
- O modelo **nunca usava "uncertain"** — colapsava "a fonte não trata do tema" em "unsupported". Adicionamos definições explícitas distinguindo **"unsupported" (a fonte contradiz)** de **"uncertain" (a fonte não aborda)**.

**Veredito:** bom o suficiente para um assistente (não um juiz automático). O erro é quase sempre de **uma classe adjacente** (95% tolerante) e a direção crítica — não afirmar suporte falso — está sólida (`unsupported` 6/6 e `supported` nunca vira `unsupported`). Viés residual: conservador (rebaixa "supported" para "partial"), o que é seguro.

## Melhorias adicionais (rodada 2)

- **F1 — validação profunda de DOI:** quando a entrada tem DOI, resolve o DOI e compara título+ano. Pega dois modos de alucinação que checkers de abstract não pegam: **DOI fabricado** (título existe, mas o DOI citado é inválido → `mismatch`) e **DOI aponta para outro trabalho** (→ `mismatch`). Verificado com 3 casos (válido→found, DOI fabricado→mismatch, título errado→mismatch).
- **F1 — 3º índice Semantic Scholar** após Crossref/OpenAlex (mais cobertura de arXiv/conferência).
- **F2 — modelo de verificação configurável** (`AI_GATEWAY_VERIFY_MODEL`): o gateway atual só roteia `llama-3.3-70b`; quando houver um modelo mais forte, troca-se por env e re-mede com `eval:verdicts`.
- **F2 — self-consistency (3 votos) testada e descartada:** deu 70% (vs 75% single-pass). Os erros do classificador são **viés sistemático, não ruído aleatório** — votar não corrige e não compensa o custo 3×. Decisão por dados: não shippar.

## Cobertura (rodada 3)

**F1 ampliado para 80 casos** (40 reais multi-área: medicina, psicologia, educação, economia, linguística + 40 fabricadas):
- **Falso-positivo: 0%** (40/40 fabricadas pegas) — a garantia anti-alucinação aguenta em escala e fora de CS.
- Recall (só título): 70% — pessimista, porque busca só por título soterra papers famosos sob derivados.

**Maior lever de recall: autor+ano** (que o `.bib` real sempre tem). Medido em 12 papers difíceis (`eval:citations-meta`):
| Busca | Confirmados |
| --- | --- |
| só título | 4/12 |
| **título + autor + ano** | **10/12** |
A busca agora usa título+autor+ano (Crossref `query.bibliographic` + fallbacks) e rows=8. O 0% de FP é preservado: metadados só melhoram o *ranking*; o match de título continua sendo o filtro de aceitação. Limite residual: alguns papers (ex.: BERT canônico) estão mal-indexados nos índices abertos — "não encontrada" = "não confirmada", nunca "fabricada".

**Cobertura de código:** ~87% de linhas (`bun test --coverage`); 37 testes server.

## Como rodar
```bash
cd server
bun run eval:citations          # 80 casos, ~rede (Crossref/OpenAlex/Semantic Scholar)
bun run eval:citations-meta     # ganho de autor+ano (12 papers difíceis)
bun run eval:verdicts           # 20 casos, precisa do ai-gateway (LLM)
VOTES=3 bun run eval:verdicts    # variante self-consistency (não recomendada)
```
