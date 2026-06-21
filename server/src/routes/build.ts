import { Router } from "express";
import { spawn } from "child_process";
import { mkdtemp, mkdir, writeFile, readFile, rm } from "fs/promises";
import { tmpdir } from "os";
import * as path from "path";
import { db } from "../db.js";
import { requireAuth } from "../auth.js";
import { heavyLimiter } from "../lib/rate-limit.js";
import { isSafeRelPath } from "../lib/safe-path.js";

export const buildRouter = Router({ mergeParams: true });

buildRouter.use(requireAuth);

interface BuildFile {
  path: string;
  content: string | null;
  type: string;
}

interface BuildResult {
  success: boolean;
  pdfPath?: string;
  logs?: string;
  error?: string;
}

buildRouter.post("/", heavyLimiter, async (req, res) => {
  try {
    const { id } = req.params as { id: string };

    const project = await db.project.findFirst({
      where: { id, userId: req.userId },
      include: { files: true },
    });
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    const inFlight = await db.build.findFirst({
      where: { projectId: id, status: { in: ["QUEUED", "PROCESSING"] } },
    });
    if (inFlight) {
      return res.status(409).json({ error: "Já existe um build em andamento para este projeto" });
    }

    const build = await db.build.create({
      data: { projectId: id, type: "FULL", status: "PROCESSING", startedAt: new Date() },
    });

    try {
      const result = await runPandocBuild(project.files);

      if (result.success && result.pdfPath) {
        const pdfBuffer = await readFile(result.pdfPath);
        const pdfDataUrl = `data:application/pdf;base64,${pdfBuffer.toString("base64")}`;

        const completedBuild = await db.build.update({
          where: { id: build.id },
          data: {
            status: "COMPLETED",
            completedAt: new Date(),
            durationMs: Date.now() - build.queuedAt.getTime(),
            pdfUrl: pdfDataUrl,
            pdfSizeBytes: pdfBuffer.length,
            logs: result.logs || "PDF generated with pandoc",
          },
        });

        return res.json({
          build: { id: completedBuild.id, status: completedBuild.status, pdfSizeBytes: completedBuild.pdfSizeBytes },
          pdfPath: `/api/projects/${id}/build/${completedBuild.id}/pdf`,
          message: "Build completed successfully",
        });
      }
      throw new Error(result.error || "Build failed");
    } catch (buildError) {
      await db.build.update({
        where: { id: build.id },
        data: {
          status: "FAILED",
          completedAt: new Date(),
          errorMessage: buildError instanceof Error ? buildError.message : "Unknown error",
        },
      });
      throw buildError;
    }
  } catch (error) {
    console.error("Error creating build:", error);
    return res.status(500).json({
      error: "Build failed",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

buildRouter.get("/", async (req, res) => {
  try {
    const { id } = req.params as { id: string };
    const project = await db.project.findFirst({ where: { id, userId: req.userId } });
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }
    const builds = await db.build.findMany({
      where: { projectId: id },
      orderBy: { queuedAt: "desc" },
      take: 10,
      select: {
        id: true,
        type: true,
        status: true,
        queuedAt: true,
        completedAt: true,
        durationMs: true,
        pdfSizeBytes: true,
        errorMessage: true,
      },
    });
    return res.json({ builds });
  } catch (error) {
    console.error("Error fetching builds:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

buildRouter.get("/:buildId/pdf", async (req, res) => {
  try {
    const { id, buildId } = req.params as { id: string; buildId: string };
    const project = await db.project.findFirst({ where: { id, userId: req.userId } });
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }
    const build = await db.build.findFirst({ where: { id: buildId, projectId: id } });
    if (!build?.pdfUrl) {
      return res.status(404).json({ error: "PDF not found" });
    }
    const buffer = Buffer.from(build.pdfUrl.split(",", 2)[1] || "", "base64");
    const safeName = project.name.replace(/[^a-zA-Z0-9-_]+/g, "_") || "documento";
    const disposition = req.query.download ? "attachment" : "inline";
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `${disposition}; filename="${safeName}.pdf"`);
    return res.send(buffer);
  } catch (error) {
    console.error("Error serving PDF:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

async function runPandocBuild(files: BuildFile[]): Promise<BuildResult> {
  const dir = await mkdtemp(path.join(tmpdir(), "skywrite-build-"));
  try {
    for (const file of files) {
      if (!isSafeRelPath(file.path)) continue;
      const filePath = path.join(dir, file.path);
      await mkdir(path.dirname(filePath), { recursive: true });
      if (file.type === "IMAGE") {
        await writeFile(filePath, Buffer.from(file.content || "", "base64"));
      } else {
        await writeFile(filePath, file.content || "");
      }
    }

    const markdownFiles = files
      .filter((f) => f.type === "MARKDOWN" || f.path.endsWith(".md"))
      .map((f) => f.path)
      .sort();

    if (markdownFiles.length === 0) {
      return { success: false, error: "No markdown content to build" };
    }

    const metadataFile = files.find(
      (f) => f.type === "YAML" || f.path.endsWith("metadata.yaml")
    );
    const bibFile = files.find((f) => f.type === "BIBTEX" || f.path.endsWith(".bib"));

    const headerPath = path.join(dir, "skywrite-header.tex");
    await writeFile(headerPath, "\\providecommand{\\xmpquote}[1]{#1}\n");

    const pdfPath = path.join(dir, "output.pdf");
    const args = [
      ...markdownFiles,
      "--citeproc",
      "--toc",
      "--metadata",
      "reference-section-title=Referências",
      "--include-in-header",
      headerPath,
      "--resource-path",
      dir,
      "--pdf-engine=tectonic",
      "-o",
      pdfPath,
    ];
    if (metadataFile) args.push(`--metadata-file=${metadataFile.path}`);
    if (bibFile) args.push(`--bibliography=${bibFile.path}`);

    const result = await runPandoc(args, dir);
    if (result.code === 0) {
      return { success: true, pdfPath, logs: result.output };
    }
    return { success: false, error: result.output || "pandoc failed", logs: result.output };
  } finally {
    rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}

function runPandoc(args: string[], cwd: string) {
  return new Promise<{ code: number; output: string }>((resolve) => {
    const pandoc = spawn("pandoc", args, { cwd });
    let output = "";
    let settled = false;
    const finish = (result: { code: number; output: string }) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(result);
    };
    const timer = setTimeout(() => {
      pandoc.kill();
      finish({ code: 1, output: "Build timed out after 5 minutes" });
    }, 5 * 60 * 1000);
    pandoc.stdout.on("data", (d) => (output += d.toString()));
    pandoc.stderr.on("data", (d) => (output += d.toString()));
    pandoc.on("error", (err) => finish({ code: 1, output: `Failed to start pandoc: ${err.message}` }));
    pandoc.on("close", (code) => finish({ code: code ?? 1, output }));
  });
}
