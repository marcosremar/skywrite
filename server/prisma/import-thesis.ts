import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";
import * as yaml from "yaml";

const prisma = new PrismaClient();

const THESIS_DIR = "/Users/marcos/Documents/projects/microsass/dumont-writer/thesis_overleaf/content";

function getFileType(filePath: string): "MARKDOWN" | "YAML" | "BIBTEX" | "IMAGE" | "OTHER" {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case ".md":
      return "MARKDOWN";
    case ".yaml":
    case ".yml":
      return "YAML";
    case ".bib":
      return "BIBTEX";
    case ".png":
    case ".jpg":
    case ".jpeg":
    case ".gif":
    case ".svg":
      return "IMAGE";
    default:
      return "OTHER";
  }
}

async function importThesis() {
  console.log("=" .repeat(60));
  console.log("Importando Tese do thesis_overleaf");
  console.log("=" .repeat(60));

  // Get demo user
  const user = await prisma.user.findUnique({
    where: { email: "demo@thesis.writer" },
  });

  if (!user) {
    console.error("Usuario demo nao encontrado! Execute npm run db:seed primeiro.");
    return;
  }

  // Load metadata
  const metadataPath = path.join(THESIS_DIR, "metadata.yaml");
  const metadataContent = fs.readFileSync(metadataPath, "utf-8");
  const metadata = yaml.parse(metadataContent);

  console.log(`\nMetadata: ${metadata.title}`);
  console.log(`Autor: ${metadata.author}`);

  // Create project
  const project = await prisma.project.upsert({
    where: { storageKey: `${user.id}/tese-doutorado-ia` },
    update: {},
    create: {
      userId: user.id,
      name: "Tese de Doutorado - IA e Ensino de Linguas",
      description: metadata.title,
      title: metadata.title,
      subtitle: metadata.subtitle || "",
      author: metadata.author,
      university: metadata.university,
      degree: metadata.degree,
      language: metadata.lang || "pt-BR",
      storageKey: `${user.id}/tese-doutorado-ia`,
    },
  });

  console.log(`\nProjeto criado: ${project.name} (${project.id})`);

  // Delete existing files for this project
  await prisma.projectFile.deleteMany({
    where: { projectId: project.id },
  });

  // Import chapters (Portuguese version - text/)
  const chaptersDir = path.join(THESIS_DIR, "text/chapters");
  const chapterFiles = fs.readdirSync(chaptersDir).filter((f) => f.endsWith(".md")).sort();

  console.log(`\nImportando ${chapterFiles.length} capitulos...`);

  for (const file of chapterFiles) {
    const filePath = path.join(chaptersDir, file);
    const content = fs.readFileSync(filePath, "utf-8");

    await prisma.projectFile.create({
      data: {
        projectId: project.id,
        path: `chapters/${file}`,
        name: file,
        type: "MARKDOWN",
        content,
        sizeBytes: Buffer.byteLength(content, "utf8"),
      },
    });

    console.log(`  + chapters/${file}`);
  }

  // Import structure files
  const structureDir = path.join(THESIS_DIR, "text/structure");
  if (fs.existsSync(structureDir)) {
    const structureFiles = fs.readdirSync(structureDir).filter((f) => f.endsWith(".md")).sort();

    console.log(`\nImportando ${structureFiles.length} arquivos de estrutura...`);

    for (const file of structureFiles) {
      const filePath = path.join(structureDir, file);
      const content = fs.readFileSync(filePath, "utf-8");

      await prisma.projectFile.create({
        data: {
          projectId: project.id,
          path: `structure/${file}`,
          name: file,
          type: "MARKDOWN",
          content,
          sizeBytes: Buffer.byteLength(content, "utf8"),
        },
      });

      console.log(`  + structure/${file}`);
    }
  }

  // Note: Appendices are intentionally NOT imported
  // They will be added manually by the user when ready
  console.log(`\nPulando apendices (serao adicionados manualmente)...`);

  // Import bibliography files
  const bibDir = path.join(THESIS_DIR, "bibliography");
  if (fs.existsSync(bibDir)) {
    const bibFiles = fs.readdirSync(bibDir).filter((f) => f.endsWith(".bib"));

    console.log(`\nImportando ${bibFiles.length} arquivos de bibliografia...`);

    // Combine all bib files into one
    let combinedBib = "";
    for (const file of bibFiles) {
      if (file.includes(".bak")) continue; // Skip backup files

      const filePath = path.join(bibDir, file);
      const content = fs.readFileSync(filePath, "utf-8");
      combinedBib += `% === ${file} ===\n${content}\n\n`;
      console.log(`  + bibliography/${file}`);
    }

    await prisma.projectFile.create({
      data: {
        projectId: project.id,
        path: "references.bib",
        name: "references.bib",
        type: "BIBTEX",
        content: combinedBib,
        sizeBytes: Buffer.byteLength(combinedBib, "utf8"),
      },
    });
  }

  // Import metadata.yaml
  await prisma.projectFile.create({
    data: {
      projectId: project.id,
      path: "metadata.yaml",
      name: "metadata.yaml",
      type: "YAML",
      content: metadataContent,
      sizeBytes: Buffer.byteLength(metadataContent, "utf8"),
    },
  });

  console.log(`  + metadata.yaml`);

  // Import media files
  const mediaDir = path.join(THESIS_DIR, "media");
  if (fs.existsSync(mediaDir)) {
    const mediaFiles = fs.readdirSync(mediaDir).filter((f) => {
      const ext = path.extname(f).toLowerCase();
      return [".png", ".jpg", ".jpeg", ".gif", ".svg"].includes(ext);
    });

    console.log(`\nImportando ${mediaFiles.length} arquivos de midia...`);

    for (const file of mediaFiles) {
      const filePath = path.join(mediaDir, file);
      const buffer = fs.readFileSync(filePath);
      const base64Content = buffer.toString("base64");
      const ext = path.extname(file).toLowerCase();

      let mimeType = "image/png";
      if (ext === ".jpg" || ext === ".jpeg") mimeType = "image/jpeg";
      else if (ext === ".gif") mimeType = "image/gif";
      else if (ext === ".svg") mimeType = "image/svg+xml";

      await prisma.projectFile.create({
        data: {
          projectId: project.id,
          path: `media/${file}`,
          name: file,
          type: "IMAGE",
          mimeType,
          content: base64Content,
          sizeBytes: buffer.length,
        },
      });

      console.log(`  + media/${file} (${(buffer.length / 1024).toFixed(1)} KB)`);
    }
  }

  // Count files
  const fileCount = await prisma.projectFile.count({
    where: { projectId: project.id },
  });

  console.log("\n" + "=" .repeat(60));
  console.log(`Importacao concluida!`);
  console.log(`Total de arquivos: ${fileCount}`);
  console.log(`Projeto ID: ${project.id}`);
  console.log("=" .repeat(60));

  console.log("\nCredenciais:");
  console.log("  Email: demo@thesis.writer");
  console.log("  Senha: demo123");
}

importThesis()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
