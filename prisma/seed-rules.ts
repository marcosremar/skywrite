import { PrismaClient, RuleCategory, RuleType, RuleSeverity } from "@prisma/client";

const prisma = new PrismaClient();

const systemRules = [
  // Structure Rules
  {
    name: "Introducao presente",
    description: "O documento deve conter uma secao de introducao",
    category: RuleCategory.STRUCTURE,
    pattern: "introduc|introduction",
    section: "introduction",
    severity: RuleSeverity.ERROR,
    weight: 3,
  },
  {
    name: "Metodologia presente",
    description: "O documento deve conter uma secao de metodologia",
    category: RuleCategory.STRUCTURE,
    pattern: "metodolog|methodology|metodo",
    section: "methodology",
    severity: RuleSeverity.ERROR,
    weight: 3,
  },
  {
    name: "Resultados presente",
    description: "O documento deve conter uma secao de resultados",
    category: RuleCategory.STRUCTURE,
    pattern: "resultado|results",
    section: "results",
    severity: RuleSeverity.WARNING,
    weight: 2,
  },
  {
    name: "Conclusao presente",
    description: "O documento deve conter uma secao de conclusao",
    category: RuleCategory.STRUCTURE,
    pattern: "conclus|conclusion",
    section: "conclusion",
    severity: RuleSeverity.ERROR,
    weight: 3,
  },
  {
    name: "Referencias presente",
    description: "O documento deve conter referencias bibliograficas",
    category: RuleCategory.STRUCTURE,
    pattern: "referenc|bibliograf|bibliography",
    section: "references",
    severity: RuleSeverity.ERROR,
    weight: 3,
  },

  // Content Rules - Introduction
  {
    name: "Objetivo geral definido",
    description: "A introducao deve apresentar o objetivo geral do trabalho",
    category: RuleCategory.CONTENT,
    pattern: "objetivo geral|general objective|main goal|objetivo principal",
    section: "introduction",
    severity: RuleSeverity.ERROR,
    weight: 3,
  },
  {
    name: "Objetivos especificos definidos",
    description: "A introducao deve apresentar objetivos especificos",
    category: RuleCategory.CONTENT,
    pattern: "objetivos especificos|specific objectives",
    section: "introduction",
    severity: RuleSeverity.WARNING,
    weight: 2,
  },
  {
    name: "Justificativa presente",
    description: "A introducao deve conter a justificativa do trabalho",
    category: RuleCategory.CONTENT,
    pattern: "justificativ|justification|relevancia|relevance|importancia",
    section: "introduction",
    severity: RuleSeverity.WARNING,
    weight: 2,
  },
  {
    name: "Problema de pesquisa definido",
    description: "A introducao deve apresentar o problema de pesquisa",
    category: RuleCategory.CONTENT,
    pattern: "problema de pesquisa|research problem|questao de pesquisa|research question",
    section: "introduction",
    severity: RuleSeverity.ERROR,
    weight: 3,
  },
  {
    name: "Hipotese formulada",
    description: "O trabalho deve apresentar hipoteses",
    category: RuleCategory.CONTENT,
    pattern: "hipotese|hypothesis|hipoteses|hypotheses",
    section: null,
    severity: RuleSeverity.INFO,
    weight: 1,
  },

  // Content Rules - Methodology
  {
    name: "Tipo de pesquisa definido",
    description: "A metodologia deve indicar o tipo de pesquisa",
    category: RuleCategory.CONTENT,
    pattern: "pesquisa qualitativa|pesquisa quantitativa|qualitative research|quantitative research|pesquisa mista|mixed method",
    section: "methodology",
    severity: RuleSeverity.WARNING,
    weight: 2,
  },
  {
    name: "Populacao/Amostra definida",
    description: "A metodologia deve definir a populacao e amostra",
    category: RuleCategory.CONTENT,
    pattern: "populacao|amostra|population|sample|participantes|participants",
    section: "methodology",
    severity: RuleSeverity.WARNING,
    weight: 2,
  },
  {
    name: "Instrumento de coleta definido",
    description: "A metodologia deve descrever os instrumentos de coleta de dados",
    category: RuleCategory.CONTENT,
    pattern: "instrumento|questionario|entrevista|formulario|questionnaire|interview|data collection",
    section: "methodology",
    severity: RuleSeverity.WARNING,
    weight: 2,
  },
  {
    name: "Procedimento de analise descrito",
    description: "A metodologia deve descrever como os dados serao analisados",
    category: RuleCategory.CONTENT,
    pattern: "analise de dados|data analysis|procedimento de analise|analise estatistica|statistical analysis",
    section: "methodology",
    severity: RuleSeverity.WARNING,
    weight: 2,
  },

  // Content Rules - Conclusion
  {
    name: "Limitacoes apresentadas",
    description: "A conclusao deve mencionar as limitacoes do estudo",
    category: RuleCategory.CONTENT,
    pattern: "limitac|limitation|restricao|constraint",
    section: "conclusion",
    severity: RuleSeverity.INFO,
    weight: 1,
  },
  {
    name: "Trabalhos futuros sugeridos",
    description: "A conclusao deve sugerir trabalhos futuros",
    category: RuleCategory.CONTENT,
    pattern: "trabalhos futuros|future work|pesquisas futuras|future research|sugestoes para",
    section: "conclusion",
    severity: RuleSeverity.INFO,
    weight: 1,
  },

  // Citation Rules
  {
    name: "Citacoes presentes",
    description: "O documento deve conter citacoes",
    category: RuleCategory.CITATION,
    pattern: "\\([A-Z][a-z]+,\\s*\\d{4}\\)|\\[\\d+\\]|@\\w+",
    section: null,
    severity: RuleSeverity.ERROR,
    weight: 3,
  },
  {
    name: "Citacoes na introducao",
    description: "A introducao deve conter citacoes para contextualizar o tema",
    category: RuleCategory.CITATION,
    pattern: "\\([A-Z][a-z]+,\\s*\\d{4}\\)|\\[\\d+\\]",
    section: "introduction",
    severity: RuleSeverity.WARNING,
    weight: 2,
  },
  {
    name: "Citacoes na fundamentacao",
    description: "A revisao de literatura deve conter diversas citacoes",
    category: RuleCategory.CITATION,
    pattern: "\\([A-Z][a-z]+,\\s*\\d{4}\\)|\\[\\d+\\]",
    section: "literature_review",
    severity: RuleSeverity.ERROR,
    weight: 3,
  },

  // Style Rules
  {
    name: "Evitar primeira pessoa singular",
    description: "Textos academicos devem evitar 'eu' e formas na primeira pessoa do singular",
    category: RuleCategory.STYLE,
    pattern: "\\beu\\b|\\bmeu\\b|\\bminha\\b|\\bfiz\\b|\\brealizei\\b|\\bpenso\\b",
    section: null,
    severity: RuleSeverity.WARNING,
    weight: 1,
  },
  {
    name: "Uso de primeira pessoa do plural",
    description: "Verificar uso de 'nos' no texto (pode ser adequado)",
    category: RuleCategory.STYLE,
    pattern: "\\bnos\\b|\\bnosso\\b|\\bnossa\\b|realizamos|observamos|concluimos",
    section: null,
    severity: RuleSeverity.INFO,
    weight: 1,
  },
  {
    name: "Conectivos logicos presentes",
    description: "O texto deve usar conectivos para garantir coesao",
    category: RuleCategory.STYLE,
    pattern: "portanto|entretanto|contudo|alem disso|por outro lado|consequently|however|moreover|therefore",
    section: null,
    severity: RuleSeverity.INFO,
    weight: 1,
  },
];

async function seedRules() {
  console.log("Seeding system rules...");

  for (const rule of systemRules) {
    const existingRule = await prisma.rule.findFirst({
      where: {
        name: rule.name,
        isBuiltIn: true,
      },
    });

    if (existingRule) {
      // Update existing rule
      await prisma.rule.update({
        where: { id: existingRule.id },
        data: {
          ...rule,
          type: RuleType.SYSTEM,
          isBuiltIn: true,
          isEnabled: true,
        },
      });
      console.log(`Updated: ${rule.name}`);
    } else {
      // Create new rule
      await prisma.rule.create({
        data: {
          ...rule,
          type: RuleType.SYSTEM,
          isBuiltIn: true,
          isEnabled: true,
        },
      });
      console.log(`Created: ${rule.name}`);
    }
  }

  console.log(`Seeded ${systemRules.length} system rules`);
}

seedRules()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
