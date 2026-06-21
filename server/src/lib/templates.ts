import fs from "fs/promises";
import path from "path";

export interface TemplateMetadata {
  id: string;
  name: string;
  description: string;
  category: string;
  publisher: string;
  language: string;
  citationStyle: string;
  documentClass: string;
  features: string[];
  requiredSections: string[];
  packages: string[];
  metadata: {
    journal?: string;
    keywords?: string[];
    authors?: string[];
  };
  thumbnail?: string;
}

export interface TemplateDefaultFile {
  path: string;
  name: string;
  type: "YAML" | "MARKDOWN" | "BIBTEX" | "LATEX";
  content: string;
}

const TEMPLATES_DIR = path.join(process.cwd(), "templates");

/**
 * Get all available templates
 */
export async function getTemplates(): Promise<TemplateMetadata[]> {
  try {
    const entries = await fs.readdir(TEMPLATES_DIR, { withFileTypes: true });
    const templates: TemplateMetadata[] = [];

    for (const entry of entries) {
      if (entry.isDirectory()) {
        try {
          const templatePath = path.join(TEMPLATES_DIR, entry.name, "template.json");
          const content = await fs.readFile(templatePath, "utf-8");
          const template = JSON.parse(content) as TemplateMetadata;
          templates.push(template);
        } catch {
          // Skip directories without valid template.json
          console.warn(`Skipping invalid template: ${entry.name}`);
        }
      }
    }

    return templates;
  } catch {
    console.error("Error reading templates directory");
    return [];
  }
}

/**
 * Get a specific template by ID
 */
export async function getTemplate(id: string): Promise<TemplateMetadata | null> {
  try {
    const templatePath = path.join(TEMPLATES_DIR, id, "template.json");
    const content = await fs.readFile(templatePath, "utf-8");
    return JSON.parse(content) as TemplateMetadata;
  } catch {
    return null;
  }
}

/**
 * Get default files for a template
 */
export async function getTemplateDefaultFiles(id: string): Promise<TemplateDefaultFile[]> {
  const defaultFilesDir = path.join(TEMPLATES_DIR, id, "default-files");
  const files: TemplateDefaultFile[] = [];

  async function readDir(dir: string, basePath: string = "") {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relativePath = basePath ? `${basePath}/${entry.name}` : entry.name;

        if (entry.isDirectory()) {
          await readDir(fullPath, relativePath);
        } else {
          const content = await fs.readFile(fullPath, "utf-8");
          const ext = path.extname(entry.name).toLowerCase();
          
          let type: "YAML" | "MARKDOWN" | "BIBTEX" | "LATEX" = "MARKDOWN";
          if (ext === ".yaml" || ext === ".yml") type = "YAML";
          else if (ext === ".bib") type = "BIBTEX";
          else if (ext === ".tex") type = "LATEX";
          else if (ext === ".md") type = "MARKDOWN";

          files.push({
            path: relativePath,
            name: entry.name,
            type,
            content,
          });
        }
      }
    } catch {
      // Directory doesn't exist or can't be read
    }
  }

  await readDir(defaultFilesDir);
  return files;
}

/**
 * Get LaTeX files for a template (preamble, template, etc.)
 */
export async function getTemplateLatexFiles(id: string): Promise<{ preamble?: string; template?: string }> {
  const latexDir = path.join(TEMPLATES_DIR, id, "latex");
  const result: { preamble?: string; template?: string } = {};

  try {
    const preamblePath = path.join(latexDir, "preamble.tex");
    result.preamble = await fs.readFile(preamblePath, "utf-8");
  } catch {
    // No preamble file
  }

  try {
    const templatePath = path.join(latexDir, "template.tex");
    result.template = await fs.readFile(templatePath, "utf-8");
  } catch {
    // No template file
  }

  return result;
}
