export function rewriteFileReferences(content: string, oldPath: string, newPath: string): string {
  const oldName = oldPath.split("/").pop() || "";
  const newName = newPath.split("/").pop() || "";
  return content
    .split(`](${oldPath})`)
    .join(`](${newPath})`)
    .split(`](${oldName})`)
    .join(`](${newName})`);
}
