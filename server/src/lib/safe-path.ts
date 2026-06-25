import path from "path";

export function isSafeRelPath(p: unknown): p is string {
  if (typeof p !== "string" || p.length === 0 || p.length > 1024) return false;
  if (p.includes("\0") || p.includes("\\")) return false;
  if (p.endsWith("/") || p.split("/").some((s) => s === "")) return false;
  if (path.isAbsolute(p)) return false;
  const normalized = path.normalize(p);
  return !normalized.startsWith("..") && !normalized.split(path.sep).includes("..");
}
