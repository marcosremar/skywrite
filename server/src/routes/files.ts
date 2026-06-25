import { Router, type Response } from "express";
import { Prisma } from "@prisma/client";
import { db } from "../db.js";
import { requireAuth } from "../auth.js";
import { isSafeRelPath } from "../lib/safe-path.js";
import { resolveFileType } from "../lib/file-type.js";
import { rewriteFileReferences } from "../lib/file-references.js";

const MAX_CONTENT_BYTES = 5_000_000;

export const filesRouter = Router({ mergeParams: true });

filesRouter.use(requireAuth);

function handlePrismaError(error: unknown, res: Response): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2025") {
      res.status(404).json({ error: "File not found" });
      return true;
    }
    if (error.code === "P2002") {
      res.status(409).json({ error: "Já existe um arquivo com esse caminho" });
      return true;
    }
  }
  return false;
}

filesRouter.post("/", async (req, res) => {
  try {
    const { id } = req.params as { id: string };
    const { path, content, type } = req.body ?? {};

    if (!isSafeRelPath(path)) {
      return res.status(400).json({ error: "Caminho de arquivo invalido" });
    }
    if (content !== undefined && typeof content !== "string") {
      return res.status(400).json({ error: "Conteudo invalido" });
    }
    if (typeof content === "string" && Buffer.byteLength(content, "utf8") > MAX_CONTENT_BYTES) {
      return res.status(413).json({ error: "Arquivo muito grande" });
    }

    const project = await db.project.findFirst({
      where: { id, userId: req.userId },
    });
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    const name = path.split("/").pop() || path;

    const file = await db.projectFile.create({
      data: {
        projectId: id,
        path,
        name,
        content: content || "",
        type: resolveFileType(type, path),
        sizeBytes: Buffer.byteLength(content || "", "utf8"),
      },
    });

    return res.json({ file });
  } catch (error) {
    if (handlePrismaError(error, res)) return;
    console.error("Error creating file:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

filesRouter.post("/rename", async (req, res) => {
  try {
    const { id } = req.params as { id: string };
    const { oldPath, newPath, updateReferences } = req.body ?? {};

    if (!isSafeRelPath(oldPath) || !isSafeRelPath(newPath)) {
      return res.status(400).json({ error: "Caminho de arquivo invalido" });
    }

    const project = await db.project.findFirst({
      where: { id, userId: req.userId },
      include: { files: true },
    });
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    const newName = newPath.split("/").pop()!;

    const file = await db.projectFile.update({
      where: { projectId_path: { projectId: id, path: oldPath } },
      data: { path: newPath, name: newName, type: resolveFileType(undefined, newPath), updatedAt: new Date() },
    });

    if (updateReferences) {
      for (const other of project.files) {
        if (other.path === oldPath || !other.content) continue;
        const updated = rewriteFileReferences(other.content, oldPath, newPath);
        if (updated === other.content) continue;
        await db.projectFile.update({
          where: { id: other.id },
          data: { content: updated, updatedAt: new Date() },
        });
      }
    }

    return res.json({ file });
  } catch (error) {
    if (handlePrismaError(error, res)) return;
    console.error("Error renaming file:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

filesRouter.get("/*", async (req, res) => {
  try {
    const { id } = req.params as { id: string };
    const filePath = (req.params as Record<string, string>)[0];
    if (!isSafeRelPath(filePath)) {
      return res.status(400).json({ error: "Caminho de arquivo invalido" });
    }

    const file = await db.projectFile.findFirst({
      where: { projectId: id, path: filePath, project: { userId: req.userId } },
    });
    if (!file) {
      return res.status(404).json({ error: "File not found" });
    }
    return res.json(file);
  } catch (error) {
    console.error("Error fetching file:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

filesRouter.put("/*", async (req, res) => {
  try {
    const { id } = req.params as { id: string };
    const filePath = (req.params as Record<string, string>)[0];
    if (!isSafeRelPath(filePath)) {
      return res.status(400).json({ error: "Caminho de arquivo invalido" });
    }
    const { content } = req.body ?? {};
    if (typeof content !== "string") {
      return res.status(400).json({ error: "Conteudo invalido" });
    }
    if (Buffer.byteLength(content, "utf8") > MAX_CONTENT_BYTES) {
      return res.status(413).json({ error: "Arquivo muito grande" });
    }

    const project = await db.project.findFirst({
      where: { id, userId: req.userId },
    });
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    const file = await db.projectFile.update({
      where: { projectId_path: { projectId: id, path: filePath } },
      data: {
        content,
        sizeBytes: Buffer.byteLength(content, "utf8"),
        updatedAt: new Date(),
      },
    });
    return res.json(file);
  } catch (error) {
    if (handlePrismaError(error, res)) return;
    console.error("Error updating file:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

filesRouter.delete("/*", async (req, res) => {
  try {
    const { id } = req.params as { id: string };
    const filePath = (req.params as Record<string, string>)[0];
    if (!isSafeRelPath(filePath)) {
      return res.status(400).json({ error: "Caminho de arquivo invalido" });
    }

    const project = await db.project.findFirst({
      where: { id, userId: req.userId },
    });
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    await db.projectFile.delete({
      where: { projectId_path: { projectId: id, path: filePath } },
    });
    return res.json({ success: true });
  } catch (error) {
    if (handlePrismaError(error, res)) return;
    console.error("Error deleting file:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});
