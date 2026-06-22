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

## Como rodar
```bash
cd server
bun run eval:citations   # 50 casos, ~rede (Crossref/OpenAlex)
bun run eval:verdicts    # 20 casos, precisa do ai-gateway (LLM)
```
