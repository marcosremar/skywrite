import { bibtexFromTitle } from "./doi-bibtex.js";
import { escapeBibValue } from "./bibtex.js";

export function sourceKey(title: string): string {
  return (
    title
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "")
      .slice(0, 24) || "fonte"
  );
}

function onlineEntry(title: string, url: string): string {
  return `@online{${sourceKey(title)},\n  title = {${escapeBibValue(title)}},\n  url = {${escapeBibValue(url)}}\n}`;
}

export async function sourceToBibTeX(
  title: string,
  url: string
): Promise<{ bibtex: string; resolved: boolean }> {
  const resolved = title.trim() ? await bibtexFromTitle(title).catch(() => null) : null;
  if (resolved) return { bibtex: resolved, resolved: true };
  return { bibtex: onlineEntry(title.trim() || "Fonte", url), resolved: false };
}
