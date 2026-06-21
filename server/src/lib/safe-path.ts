import path from "path";

export function isSafeRelPath(p: unknown): p is string {
  if (typeof p !== "string" || p.length === 0) return false;
  if (p.includes("\0")) return false;
  if (path.isAbsolute(p)) return false;
  const normalized = path.normalize(p);
  return !normalized.startsWith("..") && !normalized.split(path.sep).includes("..");
}
