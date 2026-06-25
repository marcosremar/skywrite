const HEDGING = [
  "talvez",
  "possivelmente",
  "aparentemente",
  "supostamente",
  "de certa forma",
  "de certo modo",
  "parece que",
  "pode ser que",
  "acredita-se",
  "eventualmente",
];

const PASSIVE = /\b(é|foi|foram|são|será|serão|ser|sendo|sido)\s+\w+(ad[oa]s?|id[oa]s?)\b/gi;

function splitSentences(text: string): string[] {
  return text
    .replace(/\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/[#*_`>]/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

const NOMINALIZATION = /\b\w{4,}(ções|ção|mentos|mento|dades|dade|agem|ância|ência|ismos|ismo)\b/gi;

function words(text: string): string[] {
  return text.split(/\s+/).filter(Boolean);
}

function stripAccents(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function syllables(word: string): number {
  const groups = stripAccents(word.toLowerCase()).match(/[aeiou]+/g);
  return groups ? groups.length : 1;
}

export interface Readability {
  sentences: number;
  words: number;
  avgSentenceLength: number;
  longSentences: number;
  passiveCount: number;
  hedgingCount: number;
  nominalizations: number;
  fleschReadingEase: number;
}

export function readability(text: string, longThreshold = 40): Readability {
  const sentences = splitSentences(text);
  const tokens = sentences.flatMap((s) => words(s).filter((w) => /[\p{L}]/u.test(w)));
  const wordTotal = tokens.length;
  const syllableTotal = tokens.reduce((sum, w) => sum + syllables(w), 0);
  const longSentences = sentences.filter((s) => words(s).length > longThreshold).length;
  const passiveCount = (text.match(PASSIVE) || []).length;
  const hedgingCount = HEDGING.reduce((sum, h) => {
    const escaped = h.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`(?<!\\p{L})${escaped}(?!\\p{L})`, "giu");
    return sum + (text.match(re) || []).length;
  }, 0);
  const nominalizations = (text.match(NOMINALIZATION) || []).length;

  const flesch =
    sentences.length && wordTotal
      ? 248.835 - 1.015 * (wordTotal / sentences.length) - 84.6 * (syllableTotal / wordTotal)
      : 0;

  return {
    sentences: sentences.length,
    words: wordTotal,
    avgSentenceLength: sentences.length ? Math.round((wordTotal / sentences.length) * 10) / 10 : 0,
    longSentences,
    passiveCount,
    hedgingCount,
    nominalizations,
    fleschReadingEase: Math.max(0, Math.min(100, Math.round(flesch * 10) / 10)),
  };
}

export interface SpellingVariant {
  forms: string[];
}

export function findSpellingVariants(text: string): SpellingVariant[] {
  const groups = new Map<string, Set<string>>();
  for (const raw of text.match(/[\p{L}][\p{L}-]{3,}/gu) || []) {
    const surface = raw.toLowerCase();
    const key = stripAccents(surface).replace(/-/g, "");
    if (!groups.has(key)) groups.set(key, new Set());
    groups.get(key)!.add(surface);
  }
  return [...groups.values()].filter((forms) => forms.size > 1).map((forms) => ({ forms: [...forms] }));
}

export function findNumberFormatIssues(text: string): string[] {
  const issues: string[] = [];
  const enDecimal = /\d\.\d{1,2}(?!\d)/.test(text);
  const ptDecimal = /\d,\d{1,2}(?!\d)/.test(text);
  if (enDecimal && ptDecimal) {
    issues.push("Decimais com vírgula e ponto misturados");
  }
  if (/\d%/.test(text) && /\d\s%/.test(text)) {
    issues.push("Percentual com e sem espaço antes de %");
  }
  return issues;
}

export interface UndefinedAcronym {
  acronym: string;
  count: number;
}

const KNOWN_ACRONYMS = new Set([
  "DOI", "URL", "PDF", "HTML", "XML", "ISBN", "ISSN", "HTTP", "HTTPS", "ABNT",
  "RESUMO", "ABSTRACT", "II", "III", "IV", "VI", "VII", "VIII", "IX", "TCC",
]);

export function findUndefinedAcronyms(text: string): UndefinedAcronym[] {
  const counts = new Map<string, number>();
  const re = /\b([A-Z]{2,6})\b/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    const acro = match[1];
    if (KNOWN_ACRONYMS.has(acro)) continue;
    counts.set(acro, (counts.get(acro) ?? 0) + 1);
  }
  const isDefined = (acro: string) =>
    text.includes(`(${acro})`) || new RegExp(`\\b${acro}\\b\\s*[-:–]`).test(text);
  return [...counts.entries()]
    .filter(([acro]) => !isDefined(acro))
    .map(([acronym, count]) => ({ acronym, count }));
}
