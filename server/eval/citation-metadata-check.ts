import { checkCitation } from "../src/lib/crossref.js";
import type { BibEntry } from "../src/lib/bibtex.js";

const ENTRIES: BibEntry[] = [
  { key: "lda", type: "article", title: "Latent Dirichlet Allocation", author: "Blei, David M.", year: "2003" },
  { key: "lasso", type: "article", title: "Regression Shrinkage and Selection Via the Lasso", author: "Tibshirani, Robert", year: "1996" },
  { key: "svm", type: "article", title: "Support-Vector Networks", author: "Cortes, Corinna", year: "1995" },
  { key: "dropout", type: "article", title: "Dropout: A Simple Way to Prevent Neural Networks from Overfitting", author: "Srivastava, Nitish", year: "2014" },
  { key: "power", type: "article", title: "A power primer", author: "Cohen, Jacob", year: "1992" },
  { key: "prospect", type: "article", title: "Prospect Theory: An Analysis of Decision under Risk", author: "Kahneman, Daniel", year: "1979" },
  { key: "prisma", type: "article", title: "The PRISMA 2020 statement: an updated guideline for reporting systematic reviews", author: "Page, Matthew J.", year: "2021" },
  { key: "weakties", type: "article", title: "The strength of weak ties", author: "Granovetter, Mark S.", year: "1973" },
  { key: "gamif", type: "article", title: "Gamification in education: A systematic mapping study", author: "Dicheva, Darina", year: "2015" },
  { key: "panas", type: "article", title: "Development and validation of brief measures of positive and negative affect: the PANAS scales", author: "Watson, David", year: "1988" },
  { key: "thematic", type: "article", title: "Using thematic analysis in psychology", author: "Braun, Virginia", year: "2006" },
  { key: "tpb", type: "article", title: "The theory of planned behavior", author: "Ajzen, Icek", year: "1991" },
];

const withMeta = await Promise.all(ENTRIES.map((e) => checkCitation(e)));
const titleOnly = await Promise.all(ENTRIES.map((e) => checkCitation({ key: e.key, type: e.type, title: e.title })));

const found = (r: { status: string }) => r.status === "found";
console.log("\n=== Cobertura: autor+ano vs só título (12 papers reais) ===\n");
console.log(`Só título:   ${titleOnly.filter(found).length}/${ENTRIES.length} confirmados`);
console.log(`Autor+ano:   ${withMeta.filter(found).length}/${ENTRIES.length} confirmados\n`);
ENTRIES.forEach((e, i) => {
  const a = found(titleOnly[i]) ? "✓" : "✗";
  const b = found(withMeta[i]) ? "✓" : "✗";
  const flag = a !== b ? "  <= ganho" : "";
  console.log(`  título:${a}  +meta:${b}  ${e.title.slice(0, 50)}${flag}`);
});
