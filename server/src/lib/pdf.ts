import { spawn } from "child_process";
import { mkdtemp, writeFile, readFile, rm } from "fs/promises";
import { tmpdir } from "os";
import * as path from "path";

function runPandoc(args: string[], cwd: string) {
  return new Promise<number>((resolve) => {
    const pandoc = spawn("pandoc", args, { cwd, detached: true, stdio: "ignore" });
    let settled = false;
    const finish = (code: number) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(code);
    };
    const timer = setTimeout(() => {
      if (pandoc.pid) {
        try {
          process.kill(-pandoc.pid, "SIGKILL");
        } catch {
          pandoc.kill("SIGKILL");
        }
      }
      finish(1);
    }, 5 * 60 * 1000);
    pandoc.on("error", () => finish(1));
    pandoc.on("close", (code) => finish(code ?? 1));
  });
}

export async function markdownToPdf(markdown: string): Promise<Buffer> {
  const dir = await mkdtemp(path.join(tmpdir(), "skywrite-report-"));
  try {
    const mdPath = path.join(dir, "report.md");
    const pdfPath = path.join(dir, "report.pdf");
    const headerPath = path.join(dir, "header.tex");
    await writeFile(headerPath, "\\providecommand{\\xmpquote}[1]{#1}\n");
    await writeFile(mdPath, markdown);
    const code = await runPandoc(
      [mdPath, "--toc", "--include-in-header", headerPath, "--pdf-engine=tectonic", "-o", pdfPath],
      dir
    );
    if (code !== 0) throw new Error("pandoc failed");
    return await readFile(pdfPath);
  } finally {
    rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}
