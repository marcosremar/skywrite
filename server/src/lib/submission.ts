import { extractSections, countWords } from "./thesis-analysis.js";
import { crossCheckCitations, checkAbntCompleteness } from "./citation-integrity.js";
import type { BibEntry } from "./bibtex.js";

export interface SubmissionCheck {
  id: string;
  label: string;
  passed: boolean;
  detail?: string;
}

export function submissionReadiness(markdown: string, entries: BibEntry[]): SubmissionCheck[] {
  const sections = extractSections(markdown);
  const { orphans } = crossCheckCitations(markdown, entries);
  const incomplete = checkAbntCompleteness(entries);
  const words = countWords(markdown);

  return [
    { id: "abstract", label: "Possui resumo/abstract", passed: sections.has("abstract") },
    { id: "introduction", label: "Possui introdução", passed: sections.has("introduction") },
    { id: "methodology", label: "Possui metodologia", passed: sections.has("methodology") },
    { id: "conclusion", label: "Possui conclusão", passed: sections.has("conclusion") },
    {
      id: "references",
      label: "Possui referências",
      passed: entries.length > 0,
      detail: `${entries.length} referência(s)`,
    },
    {
      id: "no-orphans",
      label: "Sem citações órfãs",
      passed: orphans.length === 0,
      detail: orphans.length ? orphans.join(", ") : undefined,
    },
    {
      id: "abnt-complete",
      label: "Referências ABNT completas",
      passed: incomplete.length === 0,
      detail: incomplete.length ? `${incomplete.length} incompleta(s)` : undefined,
    },
    {
      id: "length",
      label: "Extensão mínima (1000 palavras)",
      passed: words >= 1000,
      detail: `${words} palavras`,
    },
  ];
}
