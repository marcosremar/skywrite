import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Create demo user
  const passwordHash = await bcrypt.hash("demo123", 10);

  const demoUser = await prisma.user.upsert({
    where: { email: "demo@thesis.writer" },
    update: {},
    create: {
      email: "demo@thesis.writer",
      name: "Demo User",
      passwordHash,
      emailVerified: new Date(),
      subscriptionStatus: "PRO",
    },
  });

  console.log("Demo user created:", demoUser.email);

  // Create a sample project for the demo user
  const project = await prisma.project.upsert({
    where: { storageKey: `${demoUser.id}/demo-thesis` },
    update: {},
    create: {
      userId: demoUser.id,
      name: "Minha Tese de Doutorado",
      description: "Projeto de exemplo para demonstração",
      title: "Título da Tese",
      subtitle: "Subtítulo Opcional",
      author: "Demo User",
      university: "Universidade Federal",
      degree: "Doutorado",
      language: "pt-BR",
      storageKey: `${demoUser.id}/demo-thesis`,
    },
  });

  console.log("Demo project created:", project.name);

  // Create sample files
  const files = [
    {
      path: "metadata.yaml",
      name: "metadata.yaml",
      type: "YAML" as const,
      content: `title: "Título da Tese"
subtitle: "Subtítulo Opcional"
author: "Demo User"
university: "Universidade Federal"
degree: "Doutorado em Ciência da Computação"
date: "2024"
language: pt-BR
`,
    },
    {
      path: "chapters/01-introducao.md",
      name: "01-introducao.md",
      type: "MARKDOWN" as const,
      content: `# Introdução {#sec:introducao}

Esta é a introdução da sua tese. Aqui você apresenta o contexto do trabalho, a motivação e os objetivos.

## Contextualização

O contexto do trabalho é importante para situar o leitor sobre o tema abordado.

## Objetivos

### Objetivo Geral

Descreva aqui o objetivo geral da sua tese.

### Objetivos Específicos

1. Primeiro objetivo específico
2. Segundo objetivo específico
3. Terceiro objetivo específico

## Estrutura do Trabalho

Este trabalho está organizado da seguinte forma: no [@sec:referencial] apresentamos o referencial teórico...
`,
    },
    {
      path: "chapters/02-referencial.md",
      name: "02-referencial.md",
      type: "MARKDOWN" as const,
      content: `# Referencial Teórico {#sec:referencial}

Neste capítulo, apresentamos os conceitos fundamentais para a compreensão deste trabalho.

## Conceitos Básicos

Segundo [@krashen1984], a aquisição de linguagem ocorre de forma natural...

## Estado da Arte

Trabalhos recentes na área [@author2023] demonstram que...

### Citações

Para citar um autor, use a sintaxe \`[@author2023]\`. Por exemplo:

- Citação direta: [@krashen1984]
- Citação com página: [@krashen1984, p. 42]
- Múltiplas citações: [@krashen1984; @author2023]
`,
    },
    {
      path: "references.bib",
      name: "references.bib",
      type: "BIBTEX" as const,
      content: `@book{krashen1984,
  author    = {Stephen D. Krashen},
  title     = {The Input Hypothesis: Issues and Implications},
  publisher = {Longman},
  year      = {1984},
  address   = {London}
}

@article{author2023,
  author  = {João Silva and Maria Santos},
  title   = {Título do Artigo de Exemplo},
  journal = {Revista Brasileira de Pesquisa},
  year    = {2023},
  volume  = {10},
  number  = {2},
  pages   = {100--120}
}
`,
    },
  ];

  for (const file of files) {
    await prisma.projectFile.upsert({
      where: {
        projectId_path: {
          projectId: project.id,
          path: file.path,
        },
      },
      update: { content: file.content },
      create: {
        projectId: project.id,
        path: file.path,
        name: file.name,
        type: file.type,
        content: file.content,
        sizeBytes: Buffer.byteLength(file.content, "utf8"),
      },
    });
    console.log("File created:", file.path);
  }

  console.log("\n✅ Seed completed!");
  console.log("\nDemo credentials:");
  console.log("  Email: demo@thesis.writer");
  console.log("  Password: demo123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
