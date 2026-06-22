import "dotenv/config";
import { chat } from "../src/lib/ai-gateway.js";
import { SYSTEM_PROMPT, parseResearchResponse } from "../src/routes/research.js";
import { VERDICT_CASES, type VerdictCase } from "./verdict-cases.js";

const CLASSES = ["supported", "partial", "unsupported", "uncertain"] as const;
type Cls = (typeof CLASSES)[number];

function userMessage(c: VerdictCase): string {
  return `Pergunta do aluno: A afirmação a seguir está suportada pela fonte?

Seção atual:
"""
${c.claim}
"""

Fontes:
[1] Fonte
<fonte>
${c.source}
</fonte>`;
}

async function classify(c: VerdictCase): Promise<Cls | "none"> {
  const raw = await chat([
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: userMessage(c) },
  ]);
  const { verdicts } = parseResearchResponse(raw);
  return (verdicts[0]?.classification as Cls) ?? "none";
}

async function runChunked<T, R>(items: T[], size: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(...(await Promise.all(items.slice(i, i + size).map(fn))));
  }
  return out;
}

const results = await runChunked(VERDICT_CASES, 3, async (c) => {
  const got = await classify(c).catch(() => "none" as const);
  return { c, got, correct: got === c.expected };
});

const total = results.length;
const correct = results.filter((r) => r.correct).length;
const lenient = results.filter(
  (r) =>
    r.correct ||
    (r.c.expected === "supported" && r.got === "partial") ||
    (r.c.expected === "unsupported" && r.got === "uncertain") ||
    (r.c.expected === "partial" && (r.got === "supported" || r.got === "unsupported"))
).length;

const pct = (n: number) => ((100 * n) / total).toFixed(1);

console.log("\n=== BENCHMARK: classificador de verdicts (4 classes) — " + total + " casos ===\n");
console.log(`Acurácia exata:     ${pct(correct)}%  (${correct}/${total})`);
console.log(`Acurácia tolerante: ${pct(lenient)}%  (adjacências aceitas)`);

console.log("\n--- por classe esperada ---");
for (const cls of CLASSES) {
  const sub = results.filter((r) => r.c.expected === cls);
  const ok = sub.filter((r) => r.correct).length;
  if (sub.length) console.log(`  ${cls.padEnd(12)} ${ok}/${sub.length}`);
}

console.log("\n--- erros ---");
results
  .filter((r) => !r.correct)
  .forEach((r) => console.log(`  esperado=${r.c.expected.padEnd(11)} obtido=${String(r.got).padEnd(11)} | ${r.c.claim.slice(0, 55)}`));
