import { Router } from "express";
import {
  getTemplate,
  getTemplateDefaultFiles,
  getTemplateLatexFiles,
  getTemplates,
} from "../lib/templates.js";

export const templatesRouter = Router();

templatesRouter.get("/", async (_req, res) => {
  try {
    const templates = await getTemplates();
    return res.json({ templates });
  } catch (error) {
    console.error("Error fetching templates:", error);
    return res.status(500).json({ error: "Error fetching templates" });
  }
});

templatesRouter.get("/:id", async (req, res) => {
  try {
    const template = await getTemplate(req.params.id);
    if (!template) {
      return res.status(404).json({ error: "Template not found" });
    }
    const defaultFiles = await getTemplateDefaultFiles(req.params.id);
    const latexFiles = await getTemplateLatexFiles(req.params.id);
    return res.json({ template, defaultFiles, latexFiles });
  } catch (error) {
    console.error("Error fetching template:", error);
    return res.status(500).json({ error: "Error fetching template" });
  }
});
