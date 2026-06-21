export type FileType =
  | "MARKDOWN"
  | "YAML"
  | "BIBTEX"
  | "LATEX"
  | "IMAGE"
  | "PDF"
  | "OTHER";

export interface ProjectFile {
  id: string;
  projectId: string;
  path: string;
  name: string;
  type: FileType;
  mimeType: string | null;
  sizeBytes: number;
  content: string | null;
  storageKey: string | null;
  checksum: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  title: string | null;
  subtitle: string | null;
  author: string | null;
  university: string | null;
  degree: string | null;
  language: string;
  storageKey: string;
  templateId: string | null;
  settings: unknown;
  createdAt: string;
  updatedAt: string;
}
