import { describe, expect, test } from "vitest";
import { findReferencingFiles } from "./file-refs";

const files = [
  { path: "media/fig.png", content: null },
  { path: "chapters/01.md", content: "Veja a ![](media/fig.png) no texto." },
  { path: "chapters/02.md", content: "Cita intro mas não a figura." },
  { path: "main.tex", content: "\\includegraphics[width=1cm]{media/fig.png}" },
  { path: "refs.tex", content: "\\input{chapters/01.md}" },
];

describe("findReferencingFiles", () => {
  test("finds markdown image references", () => {
    const refs = findReferencingFiles(files, "media/fig.png");
    expect(refs).toContain("chapters/01.md");
  });
  test("finds latex includegraphics references", () => {
    const refs = findReferencingFiles(files, "media/fig.png");
    expect(refs).toContain("main.tex");
  });
  test("finds latex input references", () => {
    const refs = findReferencingFiles(files, "chapters/01.md");
    expect(refs).toContain("refs.tex");
  });
  test("does not match bare-word substrings", () => {
    const refs = findReferencingFiles(files, "media/fig.png");
    expect(refs).not.toContain("chapters/02.md");
  });
  test("excludes the file itself", () => {
    const refs = findReferencingFiles(files, "chapters/01.md");
    expect(refs).not.toContain("chapters/01.md");
  });
  test("ignores files with no content", () => {
    const refs = findReferencingFiles([{ path: "a.md", content: null }], "media/fig.png");
    expect(refs).toEqual([]);
  });
});
