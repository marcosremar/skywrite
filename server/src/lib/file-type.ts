import type { FileType } from "@prisma/client";

const EXTENSION_TYPE: Record<string, FileType> = {
  md: "MARKDOWN",
  markdown: "MARKDOWN",
  yaml: "YAML",
  yml: "YAML",
  bib: "BIBTEX",
  tex: "LATEX",
  png: "IMAGE",
  jpg: "IMAGE",
  jpeg: "IMAGE",
  gif: "IMAGE",
  webp: "IMAGE",
  svg: "IMAGE",
  pdf: "PDF",
};

const VALID_TYPES = new Set<FileType>([
  "MARKDOWN",
  "YAML",
  "BIBTEX",
  "LATEX",
  "IMAGE",
  "PDF",
  "OTHER",
]);

export function fileTypeFromPath(path: string): FileType {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  return EXTENSION_TYPE[ext] ?? "OTHER";
}

export function resolveFileType(type: unknown, path: string): FileType {
  if (typeof type === "string" && VALID_TYPES.has(type as FileType)) return type as FileType;
  return fileTypeFromPath(path);
}
