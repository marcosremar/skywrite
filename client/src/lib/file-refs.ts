type FileRef = { path: string; content?: string | null };

export function findReferencingFiles(files: FileRef[], filePath: string): string[] {
  const fileName = filePath.split("/").pop() || "";
  const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const targets = [filePath, fileName].filter(Boolean).map(escapeRe).join("|");
  const reference = new RegExp(
    `(?:\\]\\(|\\\\(?:input|include|includegraphics)(?:\\[[^\\]]*\\])?\\{)[^)}\\n]*(?:${targets})`,
    "i"
  );

  return files
    .filter((file) => file.path !== filePath && file.content && reference.test(file.content))
    .map((file) => file.path);
}
