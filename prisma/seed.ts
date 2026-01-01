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
      name: "Tese: IA no Ensino de Línguas",
      description: "Estudo sobre aplicações de Inteligência Artificial no ensino de línguas estrangeiras",
      title: "Inteligência Artificial no Ensino de Línguas Estrangeiras",
      subtitle: "Um Estudo sobre Aplicações e Impactos",
      author: "Demo User",
      university: "Universidade Federal do Rio Grande do Sul",
      degree: "Doutorado em Linguística Aplicada",
      language: "pt-BR",
      storageKey: `${demoUser.id}/demo-thesis`,
    },
  });

  console.log("Demo project created:", project.name);

  // Create sample files with intentional issues for AI Advisor to detect
  const files = [
    {
      path: "metadata.yaml",
      name: "metadata.yaml",
      type: "YAML" as const,
      content: `title: "Inteligência Artificial no Ensino de Línguas Estrangeiras"
subtitle: "Um Estudo sobre Aplicações e Impactos"
author: "Demo User"
university: "Universidade Federal do Rio Grande do Sul"
degree: "Doutorado em Linguística Aplicada"
date: "2024"
language: pt-BR
`,
    },
    {
      path: "chapters/01-introducao.md",
      name: "01-introducao.md",
      type: "MARKDOWN" as const,
      // INTENTIONAL ISSUES: No clear hypothesis, vague objectives, missing research question
      content: `# Introdução

A inteligência artificial tem se tornado cada vez mais presente em diversas áreas do conhecimento. No campo da educação, especialmente no ensino de línguas estrangeiras, observa-se um crescente interesse pela aplicação de tecnologias baseadas em IA.

Atualmente, existem muitas ferramentas tecnológicas disponíveis para auxiliar no aprendizado de idiomas. Aplicativos, plataformas online e assistentes virtuais prometem revolucionar a forma como aprendemos novas línguas.

Este trabalho busca analisar algumas dessas tecnologias. O estudo vai olhar para diferentes aspectos do uso da IA no ensino de línguas.

A área de ensino de línguas tem passado por transformações nos últimos anos. Muitas escolas e universidades estão adotando novas tecnologias em suas práticas pedagógicas.
`,
    },
    {
      path: "chapters/02-referencial.md",
      name: "02-referencial.md",
      type: "MARKDOWN" as const,
      // INTENTIONAL ISSUES: Few citations, no synthesis, no critical analysis, no gap identification
      content: `# Revisão de Literatura

## Aprendizagem de Línguas

O aprendizado de uma segunda língua é um processo complexo que envolve múltiplos fatores. Segundo [@krashen1984], a aquisição de linguagem ocorre de forma natural quando o aprendiz é exposto a input compreensível.

Existem diferentes abordagens para o ensino de línguas. Algumas focam na gramática, outras na comunicação. O importante é encontrar o método mais adequado para cada contexto.

## Inteligência Artificial na Educação

A inteligência artificial tem sido utilizada em diversas aplicações educacionais. Sistemas tutores inteligentes podem adaptar o conteúdo às necessidades do aluno.

Chatbots e assistentes virtuais também têm sido empregados no ensino de línguas. Essas ferramentas permitem prática conversacional a qualquer momento.

## Tecnologias de Reconhecimento de Voz

O reconhecimento de voz é uma tecnologia importante para o ensino de línguas. Permite que alunos pratiquem pronúncia e recebam feedback imediato.

Várias empresas desenvolvem soluções de reconhecimento de voz para educação. Essas tecnologias continuam evoluindo e melhorando sua precisão.
`,
    },
    {
      path: "chapters/03-metodologia.md",
      name: "03-metodologia.md",
      type: "MARKDOWN" as const,
      // INTENTIONAL ISSUES: Missing ethics approval, unclear sample, no analysis method
      content: `# Metodologia

## Tipo de Pesquisa

Esta pesquisa utiliza uma abordagem qualitativa. O estudo é de natureza exploratória.

## Participantes

Foram selecionados alguns professores e alunos de cursos de línguas estrangeiras. Os participantes são de diferentes instituições de ensino.

## Procedimentos

Os dados foram coletados através de entrevistas. As entrevistas foram realizadas de forma presencial e online.

## Instrumentos

Foi utilizado um roteiro de entrevista semiestruturado. As perguntas abordavam o uso de tecnologias no ensino de línguas.
`,
    },
    {
      path: "chapters/04-resultados.md",
      name: "04-resultados.md",
      type: "MARKDOWN" as const,
      // INTENTIONAL ISSUES: No visuals, limited data presentation
      content: `# Resultados

## Percepções dos Professores

Os professores entrevistados demonstraram diferentes níveis de familiaridade com tecnologias de IA. Alguns utilizam regularmente, outros têm resistência.

A maioria dos professores reconhece o potencial da IA para personalizar o ensino. Porém, existem preocupações sobre a substituição do professor.

## Experiências dos Alunos

Os alunos relataram experiências variadas com aplicativos de aprendizagem de línguas. Muitos usam apps como Duolingo e Babbel.

A gamificação presente nesses aplicativos foi mencionada como um fator motivacional. Alguns alunos preferem métodos mais tradicionais.

## Principais Achados

As entrevistas revelaram que existe interesse em tecnologias de IA. Contudo, a implementação efetiva ainda enfrenta barreiras.
`,
    },
    {
      path: "chapters/05-discussao.md",
      name: "05-discussao.md",
      type: "MARKDOWN" as const,
      // INTENTIONAL ISSUES: No connection to literature, no limitations, no future research
      content: `# Discussão

Os resultados obtidos mostram um cenário interessante sobre o uso de IA no ensino de línguas. As percepções de professores e alunos revelam oportunidades e desafios.

A resistência de alguns professores pode estar relacionada à falta de treinamento adequado. Programas de capacitação poderiam ajudar a resolver esse problema.

Os alunos parecem mais abertos às novas tecnologias. A familiaridade com smartphones e aplicativos facilita a adoção de ferramentas de IA.

É importante considerar que cada contexto educacional tem suas particularidades. O que funciona em uma instituição pode não funcionar em outra.

A integração entre tecnologia e práticas pedagógicas tradicionais parece ser o caminho mais promissor. Nem tudo precisa ser substituído pela IA.
`,
    },
    {
      path: "chapters/06-conclusao.md",
      name: "06-conclusao.md",
      type: "MARKDOWN" as const,
      // INTENTIONAL ISSUES: No clear answer to research question, no contributions stated
      content: `# Conclusão

Este trabalho investigou o uso de inteligência artificial no ensino de línguas estrangeiras. Foram ouvidos professores e alunos de diferentes instituições.

Os resultados indicam que a IA tem potencial para transformar o ensino de línguas. Porém, existem desafios a serem superados para sua implementação efetiva.

É necessário continuar estudando o tema à medida que novas tecnologias surgem. A área está em constante evolução e novas pesquisas são necessárias.
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

@article{vygotsky1978,
  author  = {Lev S. Vygotsky},
  title   = {Mind in Society: The Development of Higher Psychological Processes},
  journal = {Harvard University Press},
  year    = {1978}
}

@article{warschauer2004,
  author  = {Mark Warschauer and Deborah Healey},
  title   = {Computers and Language Learning: An Overview},
  journal = {Language Teaching},
  year    = {2004},
  volume  = {31},
  pages   = {57--71}
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
