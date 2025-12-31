import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { randomUUID } from "crypto";

// GET /api/projects - List user's projects
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const projects = await db.project.findMany({
      where: { userId: session.user.id },
      orderBy: { updatedAt: "desc" },
      include: {
        _count: {
          select: { files: true, builds: true },
        },
      },
    });

    return NextResponse.json({ projects });
  } catch (error) {
    console.error("Error fetching projects:", error);
    return NextResponse.json(
      { error: "Error fetching projects" },
      { status: 500 }
    );
  }
}

// POST /api/projects - Create new project
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, title, language } = await request.json();

    if (!name) {
      return NextResponse.json(
        { error: "Nome do projeto e obrigatorio" },
        { status: 400 }
      );
    }

    // Generate unique storage key
    const storageKey = `${session.user.id}/${randomUUID()}`;

    // Create project with default files
    const project = await db.project.create({
      data: {
        userId: session.user.id,
        name,
        title,
        language: language || "pt-BR",
        storageKey,
        author: session.user.name || "",
        files: {
          create: getDefaultFiles(title || name),
        },
      },
      include: {
        files: true,
      },
    });

    return NextResponse.json({ project });
  } catch (error) {
    console.error("Error creating project:", error);
    return NextResponse.json(
      { error: "Error creating project" },
      { status: 500 }
    );
  }
}

// Default files for a new thesis project
function getDefaultFiles(title: string) {
  return [
    {
      path: "metadata.yaml",
      name: "metadata.yaml",
      type: "YAML" as const,
      content: `# Metadados do Projeto
title: "${title}"
subtitle: ""
author: ""
date: "${new Date().getFullYear()}"

# Instituicao
university: ""
faculty: ""
department: ""

# Grau
degree: "Doutorado"
field: ""

# Orientadores
advisor: ""
coadvisor: ""

# Configuracoes
lang: "pt-BR"
language: "portuguese"
papersize: "a4"
fontsize: "12pt"

# Strings do tema
strings:
  contents: "Sumario"
  listfigures: "Lista de Figuras"
  listtables: "Lista de Tabelas"
  abstract: "Resumo"
  acknowledgments: "Agradecimentos"
  bibliography: "Bibliografia"
  chapter: "Capitulo"
  appendix: "Apendice"

# Resumo
abstract: |
  Escreva seu resumo aqui.

# Palavras-chave
keywords:
  - "Palavra-chave 1"
  - "Palavra-chave 2"
`,
    },
    {
      path: "chapters/01-introduction.md",
      name: "01-introduction.md",
      type: "MARKDOWN" as const,
      content: `# Introducao {#ch:introduction}

## Contexto {#sec:intro_contexto}

Escreva a introducao da sua tese aqui.

Para citar um autor, use: [@autor2023]

Para referenciar uma figura: [@fig:exemplo]

## Objetivos {#sec:intro_objetivos}

### Objetivo Geral

Descreva o objetivo geral do seu trabalho.

### Objetivos Especificos

- Objetivo especifico 1
- Objetivo especifico 2
- Objetivo especifico 3

## Organizacao do Trabalho {#sec:intro_organizacao}

Este trabalho esta organizado da seguinte forma:

- **Capitulo 2**: Revisao da Literatura
- **Capitulo 3**: Metodologia
- **Capitulo 4**: Resultados
- **Capitulo 5**: Discussao
- **Capitulo 6**: Conclusao
`,
    },
    {
      path: "chapters/02-literature-review.md",
      name: "02-literature-review.md",
      type: "MARKDOWN" as const,
      content: `# Revisao da Literatura {#ch:literature}

## Fundamentacao Teorica {#sec:lit_teoria}

Apresente os conceitos teoricos que fundamentam seu trabalho.

## Trabalhos Relacionados {#sec:lit_trabalhos}

Discuta os trabalhos relacionados ao seu tema.
`,
    },
    {
      path: "chapters/03-methodology.md",
      name: "03-methodology.md",
      type: "MARKDOWN" as const,
      content: `# Metodologia {#ch:methodology}

## Tipo de Pesquisa {#sec:met_tipo}

Descreva o tipo de pesquisa realizada.

## Participantes {#sec:met_participantes}

Descreva os participantes do estudo.

## Instrumentos {#sec:met_instrumentos}

Descreva os instrumentos utilizados.

## Procedimentos {#sec:met_procedimentos}

Descreva os procedimentos adotados.
`,
    },
    {
      path: "chapters/04-results.md",
      name: "04-results.md",
      type: "MARKDOWN" as const,
      content: `# Resultados {#ch:results}

Apresente os resultados da sua pesquisa.
`,
    },
    {
      path: "chapters/05-discussion.md",
      name: "05-discussion.md",
      type: "MARKDOWN" as const,
      content: `# Discussao {#ch:discussion}

Discuta os resultados obtidos.
`,
    },
    {
      path: "chapters/06-conclusion.md",
      name: "06-conclusion.md",
      type: "MARKDOWN" as const,
      content: `# Conclusao {#ch:conclusion}

Apresente as conclusoes do seu trabalho.

## Contribuicoes {#sec:concl_contribuicoes}

Liste as principais contribuicoes.

## Trabalhos Futuros {#sec:concl_futuros}

Sugira trabalhos futuros.
`,
    },
    {
      path: "bibliography/references.bib",
      name: "references.bib",
      type: "BIBTEX" as const,
      content: `% Bibliografia
% Adicione suas referencias aqui no formato BibTeX

@book{exemplo2023,
  author = {Autor, Exemplo},
  title = {Titulo do Livro},
  publisher = {Editora},
  year = {2023}
}

@article{autor2023,
  author = {Autor, Outro},
  title = {Titulo do Artigo},
  journal = {Nome do Journal},
  year = {2023},
  volume = {10},
  pages = {1-15}
}
`,
    },
  ];
}
