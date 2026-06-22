import { checkCitation } from "../src/lib/crossref.js";
import { CITATION_CASES, type CitationCase } from "./citation-cases.js";

interface Row {
  case: CitationCase;
  status: string;
  matchedTitle?: string;
  predictedReal: boolean;
  correct: boolean;
}

async function runChunked<T, R>(items: T[], size: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = [];
  for (let i = 0; i < items.length; i += size) {
    const chunk = items.slice(i, i + size);
    out.push(...(await Promise.all(chunk.map(fn))));
  }
  return out;
}

const rows = await runChunked(CITATION_CASES, 5, async (c): Promise<Row> => {
  const result = await checkCitation({ key: c.title, title: c.title, doi: c.doi, type: "article" });
  const predictedReal = result.status === "found";
  return {
    case: c,
    status: result.status,
    matchedTitle: result.matchedTitle,
    predictedReal,
    correct: predictedReal === c.expectReal,
  };
});

const tp = rows.filter((r) => r.case.expectReal && r.predictedReal).length;
const fn = rows.filter((r) => r.case.expectReal && !r.predictedReal).length;
const tn = rows.filter((r) => !r.case.expectReal && !r.predictedReal).length;
const fp = rows.filter((r) => !r.case.expectReal && r.predictedReal).length;
const total = rows.length;

const pct = (n: number, d: number) => (d ? ((100 * n) / d).toFixed(1) : "0.0");

console.log(`\n=== BENCHMARK: verificação de referência (Crossref) — ${total} casos ===\n`);
console.log(`Total: ${total} | reais: ${tp + fn} | fabricadas: ${tn + fp}`);
console.log(`Acurácia geral:        ${pct(tp + tn, total)}%  (${tp + tn}/${total})`);
console.log(`Recall (reais achadas): ${pct(tp, tp + fn)}%  (${tp}/${tp + fn})`);
console.log(`Especificidade (fakes pegas): ${pct(tn, tn + fp)}%  (${tn}/${tn + fp})`);
console.log(`>>> Falso-positivo (FAKE marcada como REAL): ${pct(fp, fp + tn)}%  (${fp}/${fp + tn})  [crítico]`);
console.log(`Falso-negativo (REAL marcada como inexistente): ${pct(fn, tp + fn)}%  (${fn}/${tp + fn})`);

console.log("\n--- FALSO-POSITIVOS (perigoso: fabricada aceita como real) ---");
const fps = rows.filter((r) => !r.case.expectReal && r.predictedReal);
if (fps.length === 0) console.log("  (nenhum)");
fps.forEach((r) => console.log(`  ✗ "${r.case.title.slice(0, 70)}" -> ${r.status} (match: ${r.matchedTitle?.slice(0, 50)})`));

console.log("\n--- FALSO-NEGATIVOS (real não confirmada) ---");
const fns = rows.filter((r) => r.case.expectReal && !r.predictedReal);
if (fns.length === 0) console.log("  (nenhum)");
fns.forEach((r) => console.log(`  ? "${r.case.title.slice(0, 60)}" -> ${r.status} (match: ${(r.matchedTitle || "—").slice(0, 50)})`));
