import { Router } from "express";
import { randomUUID } from "crypto";
import { db } from "../db.js";
import { requireAuth } from "../auth.js";
import { getTemplate, getTemplateDefaultFiles } from "../lib/templates.js";
import { getDefaultFiles } from "../lib/default-files.js";

export const projectsRouter = Router();

projectsRouter.use(requireAuth);

projectsRouter.get("/", async (req, res) => {
  try {
    const projects = await db.project.findMany({
      where: { userId: req.userId },
      orderBy: { updatedAt: "desc" },
      include: { _count: { select: { files: true, builds: true } } },
    });
    return res.json({ projects });
  } catch (error) {
    console.error("Error fetching projects:", error);
    return res.status(500).json({ error: "Error fetching projects" });
  }
});

projectsRouter.post("/", async (req, res) => {
  try {
    const { name, title, language, templateId } = req.body ?? {};
    if (typeof name !== "string" || name.trim().length === 0 || name.length > 500) {
      return res.status(400).json({ error: "Nome do projeto e obrigatorio" });
    }

    const storageKey = `${req.userId}/${randomUUID()}`;

    let files;
    let template = null;

    if (templateId) {
      template = await getTemplate(templateId);
      if (!template) {
        return res.status(400).json({ error: "Template invalido" });
      }
      const templateFiles = await getTemplateDefaultFiles(templateId);
      files = templateFiles.map((f) => ({
        path: f.path,
        name: f.name,
        type: f.type as "YAML" | "MARKDOWN" | "BIBTEX" | "LATEX",
        content: f.content,
      }));
    }

    if (!files || files.length === 0) {
      files = getDefaultFiles(title || name);
    }

    const user = await db.user.findUnique({ where: { id: req.userId } });

    const project = await db.project.create({
      data: {
        userId: req.userId!,
        name,
        title,
        language: language || template?.language || "pt-BR",
        storageKey,
        author: user?.name || "",
        templateId: templateId || null,
        files: { create: files },
      },
      include: { files: true },
    });

    return res.json({ project });
  } catch (error) {
    console.error("Error creating project:", error);
    return res.status(500).json({ error: "Error creating project" });
  }
});

projectsRouter.get("/:id", async (req, res) => {
  try {
    const project = await db.project.findFirst({
      where: { id: req.params.id, userId: req.userId },
      include: { files: { orderBy: { path: "asc" } } },
    });
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }
    return res.json({ project });
  } catch (error) {
    console.error("Error fetching project:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

const EDITABLE_FIELDS = ["name", "title", "subtitle", "author", "university", "language"] as const;

projectsRouter.patch("/:id", async (req, res) => {
  try {
    const body = req.body ?? {};
    const data: Record<string, string> = {};
    for (const field of EDITABLE_FIELDS) {
      const value = body[field];
      if (value === undefined) continue;
      if (typeof value !== "string" || value.length > 500) {
        return res.status(400).json({ error: `Campo invalido: ${field}` });
      }
      data[field] = value;
    }
    const result = await db.project.updateMany({
      where: { id: req.params.id, userId: req.userId },
      data,
    });
    if (result.count === 0) {
      return res.status(404).json({ error: "Project not found" });
    }
    const project = await db.project.findUnique({ where: { id: req.params.id } });
    return res.json({ project });
  } catch (error) {
    console.error("Error updating project:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

projectsRouter.delete("/:id", async (req, res) => {
  try {
    const result = await db.project.deleteMany({
      where: { id: req.params.id, userId: req.userId },
    });
    if (result.count === 0) {
      return res.status(404).json({ error: "Project not found" });
    }
    return res.json({ success: true });
  } catch (error) {
    console.error("Error deleting project:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});
