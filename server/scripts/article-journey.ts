import { execFileSync } from "node:child_process";
import { writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const BASE = process.env.BASE_URL || "http://127.0.0.1:4000";
const J = { "Content-Type": "application/json" };

function pdfPageCount(buf: Buffer): number {
  try {
    const f = join(mkdtempSync(join(tmpdir(), "journey-")), "out.pdf");
    writeFileSync(f, buf);
    const info = execFileSync("pdfinfo", [f], { encoding: "utf8" });
    return Number(info.match(/Pages:\s+(\d+)/)?.[1] ?? 0);
  } catch {
    return 0;
  }
}

let cookie = "";
const results: { feature: string; ok: boolean; note: string }[] = [];

async function api(method: string, path: string, body?: unknown) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { ...J, ...(cookie ? { Cookie: cookie } : {}) },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(190_000),
  });
  const set = res.headers.get("set-cookie");
  if (set) cookie = set.split(";")[0];
  const text = await res.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = text;
  }
  return { status: res.status, json, headers: res.headers };
}

async function step(feature: string, fn: () => Promise<string>) {
  try {
    const note = await fn();
    results.push({ feature, ok: true, note });
    console.log(`  ✅ ${feature} — ${note}`);
  } catch (err) {
    const note = err instanceof Error ? err.message : String(err);
    results.push({ feature, ok: false, note });
    console.log(`  ❌ ${feature} — ${note}`);
  }
}

const must = (cond: unknown, msg: string) => {
  if (!cond) throw new Error(msg);
};

function section(title: string, n: number, cites: string[]): string {
  const cite = cites.map((c) => `[@${c}]`).join(", ");
  const para =
    "A inteligência artificial vem reconfigurando o ensino de línguas estrangeiras, com aplicações que vão de tutores adaptativos a sistemas de avaliação automática da escrita. " +
    `Diversos estudos ${cite} apontam ganhos de motivação e de personalização, ainda que persistam questões metodológicas sobre a validade dos instrumentos empregados. ` +
    "Este trabalho analisa criticamente essas evidências e discute as condições sob as quais tais ganhos se sustentam em contextos reais de sala de aula. ";
  return `# ${title}\n\n${para.repeat(2)}\n\nConforme ilustrado na Figura 1 [@fig:fluxo] e sintetizado na Tabela 1 [@tbl:dados], os resultados convergem para um efeito positivo moderado. ${para}\n\n${para.repeat(2)}\n`;
}

const bib = `@article{gregg1986,
  author = {Gregg, Kevin R.},
  title = {The Input Hypothesis: Issues and Implications},
  journal = {TESOL Quarterly},
  year = {1986},
  doi = {10.2307/3586393}
}
@book{krashen1982,
  author = {Krashen, Stephen D.},
  title = {Principles and Practice in Second Language Acquisition},
  publisher = {Pergamon Press},
  year = {1982}
}
@article{silva2020,
  author = {Silva, Ana and Souza, Bruno},
  title = {Gamificação e motivação no ensino de línguas},
  journal = {Revista Brasileira de Linguística Aplicada},
  year = {2020}
}
`;

const ris = `TY  - JOUR
AU  - Oliveira, Carla
TI  - Inteligência Artificial e avaliação automática da escrita
PY  - 2022
JO  - Educação e Tecnologia
ER  -
`;

async function run() {
  console.log(`\nJornada: artigo de ~5 páginas usando todas as funcionalidades\nBASE=${BASE}\n`);

  let projectId = "";
  let bibPath = "";

  await step("login", async () => {
    const r = await api("POST", "/api/auth/login", { email: "demo@thesis.writer", password: "demo123" });
    must(r.status === 200 && cookie, `status ${r.status}`);
    return "cookie obtido";
  });

  await step("criar projeto (artigo)", async () => {
    const r = await api("POST", "/api/projects", { name: `Jornada ${Date.now()}`, title: "IA no Ensino de Línguas", language: "pt-BR" });
    must(r.status === 200, `status ${r.status}`);
    projectId = r.json.project.id;
    return `id ${projectId.slice(0, 8)}`;
  });

  const chapters = [
    ["Introdução", ["silva2020", "krashen1982"]],
    ["Referencial Teórico", ["gregg1986", "krashen1982"]],
    ["Metodologia", ["silva2020"]],
    ["Resultados", ["silva2020", "gregg1986"]],
    ["Discussão", ["gregg1986", "krashen1982", "oliveira2022"]],
    ["Conclusão", ["silva2020"]],
  ] as const;

  await step("escrever conteúdo (~5 páginas, multi-seção)", async () => {
    const proj = await api("GET", `/api/projects/${projectId}`);
    const files: { path: string }[] = proj.json.project.files;
    const mdPaths = files.filter((f) => f.path.endsWith(".md") && f.path.includes("chapter")).map((f) => f.path).sort();
    bibPath = files.find((f) => f.path.endsWith(".bib"))?.path || "";
    must(mdPaths.length >= 5, `só ${mdPaths.length} capítulos`);
    must(bibPath, "sem .bib");
    let words = 0;
    for (let i = 0; i < mdPaths.length; i++) {
      const [title, cites] = chapters[Math.min(i, chapters.length - 1)];
      const content = section(title, i + 1, cites as unknown as string[]);
      words += content.split(/\s+/).length;
      const enc = mdPaths[i].split("/").map(encodeURIComponent).join("/");
      const r = await api("PUT", `/api/projects/${projectId}/files/${enc}`, { content });
      must(r.status === 200, `PUT ${mdPaths[i]} -> ${r.status}`);
    }
    return `${mdPaths.length} seções, ~${words} palavras`;
  });

  await step("DOI → BibTeX (Crossref)", async () => {
    const r = await api("POST", `/api/projects/${projectId}/citations/doi`, { doi: "10.2307/3586393" });
    const bibtex: string = r.json.bibtex || "";
    must(r.status === 200 && /@\w+\{/.test(bibtex), `status ${r.status}`);
    must(/Gregg/.test(bibtex), `autor Gregg ausente: ${bibtex.slice(0, 80)}`);
    must(/1986/.test(bibtex), `ano 1986 ausente`);
    return `Gregg 1986 resolvido (${bibtex.match(/@\w+\{([^,]+)/)?.[1]})`;
  });

  await step("RIS → BibTeX (Zotero/Mendeley)", async () => {
    const r = await api("POST", `/api/projects/${projectId}/citations/ris`, { ris });
    const bibtex: string = r.json.bibtex || "";
    must(r.status === 200 && /Oliveira/.test(bibtex), `status ${r.status}`);
    must(/2022/.test(bibtex), `ano 2022 ausente`);
    must(/Intelig[eê]ncia Artificial/.test(bibtex), `título ausente`);
    return "Oliveira 2022 importado";
  });

  await step("escrever bibliografia (.bib)", async () => {
    const enc = bibPath.split("/").map(encodeURIComponent).join("/");
    const w = await api("PUT", `/api/projects/${projectId}/files/${enc}`, { content: bib });
    must(w.status === 200, `status ${w.status}`);
    const back = await api("GET", `/api/projects/${projectId}/files/${enc}`);
    const entries = (back.json.content?.match(/@\w+\{/g) || []).length;
    must(entries === 3, `persistiu ${entries} entradas (esperado 3)`);
    return "3 referências persistidas";
  });

  await step("editar metadados", async () => {
    const r = await api("PATCH", `/api/projects/${projectId}`, { author: "Marcos Jornada", university: "UFRGS" });
    must(r.status === 200, `status ${r.status}`);
    const back = await api("GET", `/api/projects/${projectId}`);
    must(back.json.project.author === "Marcos Jornada" && back.json.project.university === "UFRGS", `não persistiu`);
    return "autor/universidade persistidos";
  });

  await step("verificar citações (Crossref)", async () => {
    const r = await api("POST", `/api/projects/${projectId}/citations/check`);
    must(r.status === 200 && Array.isArray(r.json.results), `status ${r.status}`);
    must(r.json.results.length >= 3, `só ${r.json.results.length} verificadas`);
    const found = r.json.results.filter((x: any) => x.status === "found").length;
    must(found >= 1, `nenhuma citação encontrada no Crossref`);
    return `${r.json.results.length} verificadas, ${found} encontradas`;
  });

  await step("integridade in-text ↔ .bib (ABNT)", async () => {
    const r = await api("POST", `/api/projects/${projectId}/citations/integrity`);
    must(r.status === 200 && Array.isArray(r.json.orphans), `status ${r.status}`);
    const orphans: string[] = r.json.orphans;
    must(!orphans.some((k) => /^(fig|tbl|eq|sec|lst):/.test(k)), `cross-ref vazou como órfã: ${orphans.join(",")}`);
    must(orphans.length === 1 && orphans[0] === "oliveira2022", `órfãs inesperadas: ${JSON.stringify(orphans)}`);
    must(r.json.unused.length === 0, `não-usadas: ${r.json.unused.join(",")}`);
    must(r.json.incomplete.length === 0, `incompletas: ${r.json.incomplete.length}`);
    return `órfã única = oliveira2022, cross-refs ignorados ✓`;
  });

  await step("análise (score + métricas + consistência)", async () => {
    const r = await api("POST", `/api/projects/${projectId}/analyze`);
    must(r.status === 200 && typeof r.json.analysis?.overallScore === "number", `status ${r.status}`);
    const s = r.json.analysis.overallScore;
    must(s >= 0 && s <= 100, `score fora de faixa: ${s}`);
    must(r.json.metrics.words >= 1000, `só ${r.json.metrics.words} palavras (esperado >=1000)`);
    must(typeof r.json.metrics.fleschReadingEase === "number", `sem Flesch`);
    return `score ${s}, ${r.json.metrics.words} palavras, Flesch ${r.json.metrics.fleschReadingEase}`;
  });

  await step("gramática (LanguageTool)", async () => {
    const r = await api("POST", `/api/projects/${projectId}/grammar`, { text: "Os menino foi na escola e nao comprou pao." });
    must(r.status === 200 && Array.isArray(r.json.matches), `status ${r.status}`);
    const detectouConcordancia = r.json.matches.some((m: any) =>
      (m.replacements || []).some((rep: any) => /menino/i.test(typeof rep === "string" ? rep : rep?.value || ""))
    );
    must(detectouConcordancia, `não detectou concordância em "Os menino"`);
    return `${r.json.matches.length} problemas, concordância detectada ✓`;
  });

  await step("Orientador chat (RAG real)", async () => {
    const r = await api("POST", `/api/projects/${projectId}/research`, {
      question: "A gamificação ajuda na motivação dos alunos?",
      content: "# Introdução\nEste artigo investiga gamificação no ensino de línguas.",
      fileName: "01.md",
    });
    must(r.status === 200 && typeof r.json.answer === "string" && r.json.answer.length > 40, `status ${r.status}`);
    must((r.json.sources?.length || 0) >= 1, `resposta sem fontes (não fundamentada)`);
    return `resposta ${r.json.answer.length} chars, ${r.json.sources.length} fontes`;
  });

  await step("sugerir fontes p/ afirmação", async () => {
    const r = await api("POST", `/api/projects/${projectId}/research/sources`, { claim: "Gamificação aumenta a motivação no ensino" });
    must(r.status === 200 && Array.isArray(r.json.sources), `status ${r.status}`);
    must(r.json.sources.length >= 1, `nenhuma fonte sugerida`);
    return `${r.json.sources.length} fontes`;
  });

  await step("citar fonte (DOI pelo título)", async () => {
    const r = await api("POST", `/api/projects/${projectId}/citations/from-source`, {
      title: "Principles and Practice in Second Language Acquisition",
      url: "https://example.org/krashen",
    });
    must(r.status === 200 && r.json.bibtex?.includes("@"), `status ${r.status}`);
    return r.json.resolved ? "DOI resolvido" : "@online (sem match)";
  });

  await step("gerar títulos (LLM)", async () => {
    const r = await api("POST", `/api/projects/${projectId}/writing/titles`);
    must(r.status === 200 && Array.isArray(r.json.titles), `status ${r.status}`);
    const titles = r.json.titles.map((t: string) => (t || "").trim()).filter(Boolean);
    must(titles.length >= 3, `só ${titles.length} títulos`);
    must(new Set(titles).size === titles.length, `títulos duplicados`);
    return `${titles.length} títulos distintos`;
  });

  await step("gerar resumo/abstract (LLM)", async () => {
    const r = await api("POST", `/api/projects/${projectId}/writing/abstract`);
    must(r.status === 200 && typeof r.json.abstract === "string" && r.json.abstract.length > 200, `status ${r.status} len ${r.json.abstract?.length}`);
    return `${r.json.abstract.length} chars`;
  });

  await step("paráfrase (LLM)", async () => {
    const input = "A inteligência artificial tem se tornado cada vez mais presente no ensino.";
    const r = await api("POST", `/api/projects/${projectId}/writing/paraphrase`, { text: input });
    must(r.status === 200 && typeof r.json.text === "string", `status ${r.status}`);
    const out = r.json.text.trim();
    must(out.length > 20, `paráfrase curta: ${out.length}`);
    must(out !== input, `paráfrase idêntica ao original`);
    return `${out.length} chars, difere do original ✓`;
  });

  await step("prontidão para submissão", async () => {
    const r = await api("POST", `/api/projects/${projectId}/citations/submission`);
    must(r.status === 200 && Array.isArray(r.json.checks), `status ${r.status}`);
    const by: Record<string, boolean> = Object.fromEntries(r.json.checks.map((c: any) => [c.id, c.passed]));
    must(by.references === true, `references deveria passar`);
    must(by.length === true, `length deveria passar`);
    must(by["abnt-complete"] === true, `abnt-complete deveria passar`);
    must(by["no-orphans"] === false, `no-orphans deveria falhar (oliveira2022)`);
    const ok = r.json.checks.filter((c: any) => c.passed).length;
    return `${ok}/${r.json.checks.length} (refs/length/abnt ✓, órfã esperada ✗)`;
  });

  await step("originalidade (provedor externo)", async () => {
    const r = await api("POST", `/api/projects/${projectId}/originality`);
    must(r.status === 200 && "configured" in r.json, `status ${r.status}`);
    return r.json.configured ? "provedor ativo" : "sem provedor (esperado)";
  });

  await step("build PDF (pandoc + tectonic) ~5 páginas", async () => {
    const r = await api("POST", `/api/projects/${projectId}/build`);
    must(r.status === 200 && r.json.build?.status === "COMPLETED", `status ${r.status} / ${r.json.build?.status} / ${r.json.error || ""}`);
    const pdf = await fetch(`${BASE}${r.json.pdfPath}`, { headers: { Cookie: cookie }, signal: AbortSignal.timeout(30_000) });
    must(pdf.headers.get("content-type")?.includes("pdf"), "não é pdf");
    const buf = Buffer.from(await pdf.arrayBuffer());
    must(buf.length > 10_000, `PDF muito pequeno: ${buf.length}B`);
    const pages = pdfPageCount(buf);
    must(pages >= 5, `só ${pages} páginas (esperado ~5+ para o artigo)`);
    return `${(buf.length / 1024).toFixed(0)} KB, ${pages} páginas`;
  });

  await step("exportar dados (LGPD)", async () => {
    const r = await api("GET", "/api/auth/me/export");
    must(r.status === 200 && Array.isArray(r.json.projects), `status ${r.status}`);
    const mine = r.json.projects.find((p: any) => p.id === projectId);
    must(mine, `projeto da jornada ausente no export`);
    must(Array.isArray(mine.files) && mine.files.length > 0, `export sem arquivos`);
    return `${r.json.projects.length} projetos, jornada com ${mine.files.length} arquivos`;
  });

  if (projectId) await api("DELETE", `/api/projects/${projectId}`).catch(() => {});

  const ok = results.filter((r) => r.ok).length;
  console.log(`\n${"=".repeat(60)}\nRESULTADO: ${ok}/${results.length} funcionalidades OK\n${"=".repeat(60)}`);
  results.filter((r) => !r.ok).forEach((r) => console.log(`  FALHOU: ${r.feature} — ${r.note}`));
  process.exit(ok === results.length ? 0 : 1);
}

run();
