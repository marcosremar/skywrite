import { Router, type Response } from "express";
import { Prisma } from "@prisma/client";
import { db } from "../db.js";
import { requireAuth } from "../auth.js";

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

    if (!path) {
      return res.status(400).json({ error: "Path is required" });
    }

    const project = await db.project.findFirst({
      where: { id, userId: req.userId },
    });
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    const name = path.split("/").pop();

    const file = await db.projectFile.create({
      data: {
        projectId: id,
        path,
        name,
        content: content || "",
        type: type || "OTHER",
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

    if (!oldPath || !newPath) {
      return res.status(400).json({ error: "Old path and new path are required" });
    }

    const project = await db.project.findFirst({
      where: { id, userId: req.userId },
      include: { files: true },
    });
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    const newName = newPath.split("/").pop();

    const existingFile = await db.projectFile.findFirst({
      where: { projectId: id, path: newPath },
    });
    if (existingFile) {
      return res.status(400).json({ error: "File with this name already exists" });
    }

    const file = await db.projectFile.update({
      where: { projectId_path: { projectId: id, path: oldPath } },
      data: { path: newPath, name: newName, updatedAt: new Date() },
    });

    if (updateReferences) {
      const oldFileName = oldPath.split("/").pop() || "";
      const newFileName = newPath.split("/").pop() || "";

      const filesToUpdate = project.files.filter(
        (f) =>
          f.path !== oldPath &&
          f.content &&
          (f.content.includes(oldFileName) || f.content.includes(oldPath))
      );

      for (const fileToUpdate of filesToUpdate) {
        let updatedContent = fileToUpdate.content || "";
        updatedContent = updatedContent.split(oldPath).join(newPath);
        updatedContent = updatedContent.split(oldFileName).join(newFileName);
        await db.projectFile.update({
          where: { id: fileToUpdate.id },
          data: { content: updatedContent, updatedAt: new Date() },
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
    const { content } = req.body ?? {};

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
        sizeBytes: Buffer.byteLength(content || "", "utf8"),
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
