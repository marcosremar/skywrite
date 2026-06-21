// Thesis Analysis Utilities
// Detects sections and analyzes content for the Orientador Virtual

import {
  SectionType,
  ChecklistItem,
  SectionChecklist,
  SectionFeedback,
  ThesisAnalysis,
  DEFAULT_CHECKLISTS,
  SECTION_LABELS,
  Rule,
  RuleResult,
  RulesAnalysis,
  SYSTEM_RULES,
  USER_RULES_STORAGE_KEY,
  CitationAnalysis,
  UncitedAssertion,
} from "@/types/thesis-analysis";

// Patterns to detect sections in markdown content
// ORDER MATTERS: More specific patterns should come before generic ones
const SECTION_PATTERNS: Record<SectionType, RegExp[]> = {
  // Check specific sections FIRST (before generic title)
  abstract: [
    /^##?\s*(resumo|abstract)/im,
    /^##?\s*(sumário\s*executivo)/im,
  ],
  introduction: [
    /^##?\s*(introdução|introducao|introduction)/im,
    /^##?\s*1[\.\)]\s*(introdução|introducao|introduction)/im,
    /^#\s+introdução/im,
    /^#\s+introduction/im,
  ],
  "literature-review": [
    /^##?\s*(revisão\s*(de\s*)?literatura|fundamentação\s*teórica|referencial\s*teórico)/im,
    /^##?\s*(literature\s*review|theoretical\s*framework)/im,
    /^##?\s*2[\.\)]\s*(revisão|fundamentação|referencial)/im,
    /^#\s+revisão\s*(de\s*)?literatura/im,
    /^#\s+referencial\s*teórico/im,
    /^#\s+fundamentação/im,
  ],
  methodology: [
    /^##?\s*(metodologia|método|materiais\s*e\s*métodos)/im,
    /^##?\s*(methodology|methods|materials\s*and\s*methods)/im,
    /^##?\s*3[\.\)]\s*(metodologia|método)/im,
    /^#\s+metodologia/im,
  ],
  results: [
    /^##?\s*(resultados|findings|results)/im,
    /^##?\s*4[\.\)]\s*(resultados)/im,
    /^#\s+resultados/im,
  ],
  discussion: [
    /^##?\s*(discussão|discussao|discussion)/im,
    /^##?\s*5[\.\)]\s*(discussão|discussao)/im,
    /^#\s+discussão/im,
    /^#\s+discussao/im,
  ],
  conclusion: [
    /^##?\s*(conclusão|conclusao|considerações\s*finais|conclusion)/im,
    /^##?\s*6[\.\)]\s*(conclusão|considerações)/im,
    /^#\s+conclusão/im,
    /^#\s+conclusao/im,
    /^#\s+considerações\s*finais/im,
  ],
  references: [
    /^##?\s*(referências|referencias|bibliography|references)/im,
    /^#\s+referências/im,
  ],
  // Title is checked LAST and only matches generic titles (not section names)
  title: [
    /^#\s+título/im,
    /^#\s+title/im,
  ],
};

// Detection patterns for checklist items
const DETECTION_PATTERNS: Record<string, RegExp[]> = {
  // Introduction patterns
  "intro-context": [
    /contexto|cenário|panorama|atualmente|nos últimos anos|historicamente/i,
    /tem\s*se\s*tornado|crescente|cada\s*vez\s*mais/i,
  ],
  "intro-relevance": [
    /relevância|importância|fundamental|essencial|necessário|justifica/i,
    /por\s*que\s*(é|e)\s*importante|faz-se\s*necessário/i,
  ],
  "intro-problem": [
    /problema\s*(de\s*pesquisa|central|principal)/i,
    /problemática|questão\s*central|desafio\s*(principal|a\s*ser)/i,
    /o\s*problema\s*(que|a\s*ser)/i,
  ],
  "intro-question": [
    /pergunta\s*(de\s*)?pesquisa|questão\s*norteadora|busca\s*responder/i,
    /quais?\s*(são|seriam|fatores|elementos).*\?/im,
    /como\s+(a|o|os|as)\s+\w+.*\?/im,
    /de\s*que\s*(forma|maneira|modo).*\?/im,
  ],
  "intro-objective-general": [
    /objetivo\s*(geral|principal|deste\s*(trabalho|estudo))/i,
    /este\s*(trabalho|estudo)\s*(tem\s*como\s*)?objetivo/i,
    /pretende-se\s*(analisar|investigar|avaliar|compreender|verificar)/i,
    /o\s*presente\s*(estudo|trabalho)\s*(visa|objetiva|tem\s*por)/i,
  ],
  "intro-objectives-specific": [
    /objetivos\s*específicos/i,
    /especificamente|de\s*forma\s*específica/i,
    /[a-z]\)\s+\w/m, // lettered list
    /•\s*(identificar|analisar|avaliar|investigar|verificar|comparar)/im,
    /^\s*[-•]\s*(identificar|analisar|avaliar)/im,
  ],
  "intro-hypothesis": [
    /hipótese|hipotese|supõe-se|presume-se|espera-se\s*que/i,
    /pressuposto|pressupõe-se|parte-se\s*do\s*princípio/i,
  ],
  "intro-structure": [
    /estrutura\s*(do\s*)?(trabalho|texto|documento|tese|dissertação)/i,
    /organizado\s*(da\s*seguinte\s*forma|em\s*\d+\s*capítulos)/i,
    /capítulo\s*\d+.*apresenta|seção\s*\d+/i,
    /primeiro\s*capítulo|segundo\s*capítulo/i,
  ],
  "intro-scope": [
    /delimitação|delimita-se|escopo|âmbito|abrangência/i,
    /limita-se\s*a|restrito\s*a|foco\s*d(o|a)\s*(estudo|pesquisa)/i,
  ],

  // Literature review patterns
  "lit-organization": [
    /##\s*\w+/m, // Has subheadings
    /primeiramente|em\s*seguida|por\s*fim|inicialmente/i,
  ],
  "lit-coverage": [
    /\[@\w+\d{4}\]/g, // At least has some citations
  ],
  "lit-recent": [
    /\[@\w+(202[0-9]|201[5-9])\]/i, // Recent years in citations
    /\(.*20(2[0-9]|1[5-9]).*\)/i,
  ],
  "lit-synthesis": [
    /enquanto|por\s*outro\s*lado|diferentemente|em\s*contrapartida|similarmente/i,
    /corrobora|contradiz|diverge|converge|alinha-se/i,
    /de\s*modo\s*semelhante|assim\s*como|diferente\s*de/i,
  ],
  "lit-comparison": [
    /comparando|em\s*comparação|diferente\s*de|similar\s*a/i,
    /ambos|tanto\s*.*\s*quanto|assim\s*como/i,
    /enquanto\s*\w+\s*(afirma|defende|propõe)/i,
  ],
  "lit-gap": [
    /lacuna|gap|poucos\s*estudos|carência|escassez|não\s*(foi|foram)\s*explorad/i,
    /ainda\s*não|permanece\s*inexplorado|necessita\s*de\s*mais|pouca\s*atenção/i,
    /pouco\s*(investigado|estudado|explorado)/i,
  ],
  "lit-critical": [
    /limitação|limitações|crítica|critica|no\s*entanto|porém|contudo/i,
    /não\s*considera|falha\s*em|negligencia|questiona-se/i,
    /pode-se\s*questionar|é\s*questionável/i,
  ],
  "lit-connection": [
    /neste\s*(estudo|trabalho)|a\s*presente\s*pesquisa|nosso\s*estudo/i,
    /para\s*(esta|nossa)\s*pesquisa|no\s*contexto\s*desta/i,
  ],

  // Methodology patterns
  "method-type": [
    /qualitativ[ao]|quantitativ[ao]|mist[ao]|exploratóri[ao]|descritiv[ao]/i,
    /pesquisa\s*(de\s*)?(campo|bibliográfica|documental|experimental)/i,
  ],
  "method-approach": [
    /abordagem|enfoque|perspectiva\s*metodológica/i,
    /estudo\s*de\s*caso|etnografia|fenomenologia|grounded\s*theory/i,
  ],
  "method-population": [
    /população|universo\s*(da\s*pesquisa|do\s*estudo)|público-alvo/i,
  ],
  "method-sample": [
    /amostra|participantes|sujeitos|respondentes|n\s*=\s*\d+/i,
    /\d+\s*(participantes|professores|alunos|entrevistados)/i,
    /critérios\s*de\s*(seleção|inclusão|exclusão)/i,
  ],
  "method-instruments": [
    /questionário|entrevista|formulário|instrumento|escala|teste/i,
    /roteiro\s*(de\s*)?entrevista|guia\s*de\s*observação/i,
  ],
  "method-procedures": [
    /procedimento|etapa|fase\s*de\s*coleta|período\s*de\s*coleta/i,
    /os\s*dados\s*foram\s*coletados/i,
  ],
  "method-analysis": [
    /análise\s*(de\s*)?(conteúdo|discurso|temática|estatística)/i,
    /spss|nvivo|atlas\.ti|excel|stata|r\s*studio|maxqda/i,
    /categorização|codificação|triangulação/i,
  ],
  "method-justification": [
    /escolheu-se|optou-se\s*por|a\s*escolha\s*(de|do|da)/i,
    /justifica-se|adequado\s*para|apropriado\s*para/i,
  ],
  "method-ethics": [
    /comitê\s*de\s*ética|cep|tcle|consentimento|aprovado/i,
    /aspectos\s*éticos|considerações\s*éticas|aprovação\s*ética/i,
    /número\s*(do\s*)?parecer|caae/i,
  ],
  "method-alignment": [
    /de\s*acordo\s*com\s*(o|os)\s*objetivo|alinhado|coerente\s*com/i,
    /para\s*atingir\s*(o|os)\s*objetivo|a\s*fim\s*de\s*investigar/i,
  ],

  // Results patterns
  "results-objective": [
    /os\s*(dados|resultados)\s*(mostram|indicam|revelam|apontam)/i,
    /observou-se|verificou-se|constatou-se|identificou-se/i,
  ],
  "results-organization": [
    /##\s*\w+/m, // Has subheadings
    /quanto\s*a(o)?\s*(primeiro|segundo|terceiro)\s*objetivo/i,
    /em\s*relação\s*a(o)?\s*objetivo/i,
  ],
  "results-visuals": [
    /tabela\s*\d+|figura\s*\d+|gráfico\s*\d+|quadro\s*\d+/i,
    /!\[.*\]\(.*\)/i, // Markdown images
  ],
  "results-description": [
    /observa-se\s*que|nota-se\s*que|percebe-se\s*que/i,
    /os\s*dados\s*mostram|conforme\s*(a\s*)?(tabela|figura)/i,
  ],
  "results-complete": [
    /todos\s*os\s*(dados|participantes|respondentes)/i,
    /\d+%|a\s*maioria|a\s*totalidade/i,
  ],

  // Discussion patterns
  "disc-interpretation": [
    /isso\s*(significa|indica|sugere|demonstra)/i,
    /pode-se\s*(inferir|interpretar|entender)/i,
    /esses?\s*(resultados?|dados?|achados?)\s*(indicam|sugerem|demonstram)/i,
  ],
  "disc-literature": [
    /corrobora|confirma|vai\s*ao\s*encontro|diverge|difere/i,
    /segundo|de\s*acordo\s*com|conforme|como\s*apontado\s*por/i,
    /em\s*consonância\s*com|similar\s*ao\s*(estudo|achado)\s*de/i,
    /\[@\w+\d{4}\]/i, // Has citations
  ],
  "disc-unexpected": [
    /surpreendentemente|inesperadamente|contrariamente\s*ao\s*esperado/i,
    /diferente\s*do\s*esperado|não\s*era\s*esperado/i,
  ],
  "disc-theoretical": [
    /implicação\s*teórica|contribuição\s*teórica|teoria/i,
    /do\s*ponto\s*de\s*vista\s*teórico|teoricamente/i,
  ],
  "disc-practical": [
    /implicação\s*prática|aplicação\s*prática|na\s*prática/i,
    /pode\s*ser\s*(aplicado|utilizado)|profissionais\s*podem/i,
  ],
  "disc-limitations": [
    /limitação|limitações|limites\s*d(o|a)\s*(estudo|pesquisa)/i,
    /reconhece-se\s*(como\s*)?limitação|é\s*importante\s*reconhecer/i,
    /uma\s*limitação\s*(deste|do)\s*(estudo|trabalho)/i,
  ],
  "disc-future": [
    /futuras\s*pesquisas|estudos\s*futuros|pesquisas\s*posteriores/i,
    /recomenda-se\s*(investigar|explorar|aprofundar)|sugere-se\s*que/i,
    /trabalhos\s*futuros|novas\s*pesquisas/i,
  ],
  "disc-answer": [
    /respondendo\s*(à|a)\s*pergunta|em\s*resposta\s*(à|a)/i,
    /conclui-se\s*que|pode-se\s*afirmar|confirma-se\s*(a\s*)?hipótese/i,
    /o\s*objetivo\s*(geral\s*)?(foi|está)\s*(alcançado|atingido)/i,
  ],

  // Conclusion patterns
  "conc-answer": [
    /respondendo|em\s*resposta|conclui-se\s*que|pode-se\s*afirmar/i,
    /o\s*estudo\s*(permitiu|possibilitou|demonstrou)/i,
    /foi\s*possível\s*(identificar|analisar|compreender|verificar)/i,
  ],
  "conc-synthesis": [
    /em\s*síntese|em\s*suma|de\s*modo\s*geral|os\s*principais\s*achados/i,
    /resumidamente|os\s*resultados\s*principais/i,
  ],
  "conc-contributions": [
    /contribuição|contribuições|contribui\s*para/i,
    /a\s*(principal\s*)?contribuição\s*(deste|do)\s*(estudo|trabalho)/i,
    /este\s*(estudo|trabalho)\s*contribui/i,
  ],
  "conc-recommendations": [
    /recomenda-se|sugere-se|propõe-se/i,
    /recomendação|sugestão|proposta/i,
  ],
  "conc-no-new-info": [
    // This is tricky - we check for absence of new data presentation
  ],
};

/**
 * Detects the section type from markdown content
 */
export function detectSectionType(content: string): SectionType | null {
  for (const [section, patterns] of Object.entries(SECTION_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(content)) {
        return section as SectionType;
      }
    }
  }
  return null;
}

/**
 * Extracts all sections from the full document
 */
export function extractSections(content: string): Map<SectionType, string> {
  const sections = new Map<SectionType, string>();
  const lines = content.split("\n");
  let currentSection: SectionType | null = null;
  let currentContent: string[] = [];

  for (const line of lines) {
    const detectedSection = detectSectionType(line);

    if (detectedSection && detectedSection !== currentSection) {
      // Save previous section
      if (currentSection) {
        sections.set(currentSection, currentContent.join("\n"));
      }
      currentSection = detectedSection;
      currentContent = [line];
    } else if (currentSection) {
      currentContent.push(line);
    }
  }

  // Save last section
  if (currentSection) {
    sections.set(currentSection, currentContent.join("\n"));
  }

  return sections;
}

/**
 * Counts citations in content
 */
export function countCitations(content: string): number {
  const citationPatterns = [
    /\[@[\w-]+\]/g, // Markdown citation [@author2024]
    /\([\w\s]+,\s*\d{4}\)/g, // APA style (Author, 2024)
    /\d+\.\s*[\w\s]+\.\s*\d{4}/g, // Numbered references
  ];

  let count = 0;
  for (const pattern of citationPatterns) {
    const matches = content.match(pattern);
    if (matches) {
      count += matches.length;
    }
  }
  return count;
}

/**
 * Extracts years from citations
 */
export function extractCitationYears(content: string): number[] {
  const yearPattern = /\b(19|20)\d{2}\b/g;
  const matches = content.match(yearPattern);
  if (!matches) return [];
  return [...new Set(matches.map((y) => parseInt(y)))].sort((a, b) => b - a);
}

/**
 * Counts words in content
 */
export function countWords(content: string): number {
  return content
    .replace(/[#*_`\[\]()]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 0).length;
}

/**
 * Analyzes a checklist item in the content
 */
function analyzeChecklistItem(
  itemId: string,
  content: string
): { detected: boolean; location?: string } {
  const patterns = DETECTION_PATTERNS[itemId];
  if (!patterns) {
    return { detected: false };
  }

  for (const pattern of patterns) {
    const match = content.match(pattern);
    if (match) {
      // Find the line number
      const beforeMatch = content.substring(0, match.index);
      const lineNumber = beforeMatch.split("\n").length;
      return {
        detected: true,
        location: `Linha ${lineNumber}`,
      };
    }
  }

  return { detected: false };
}

/**
 * Creates a checklist for a section with auto-detection
 */
export function createSectionChecklist(
  section: SectionType,
  content: string
): SectionChecklist {
  const defaultItems = DEFAULT_CHECKLISTS[section] || [];

  const items: ChecklistItem[] = defaultItems.map((item) => {
    const analysis = analyzeChecklistItem(item.id, content);
    return {
      ...item,
      status: analysis.detected ? "complete" : "incomplete",
      autoDetected: analysis.detected,
      detectedAt: analysis.location,
    };
  });

  // Calculate score
  const completedWeight = items
    .filter((i) => i.status === "complete")
    .reduce((sum, i) => sum + i.weight, 0);

  const totalWeight = items.reduce((sum, i) => sum + i.weight, 0);
  const score = totalWeight > 0 ? Math.round((completedWeight / totalWeight) * 100) : 0;

  return {
    section,
    sectionLabel: SECTION_LABELS[section],
    items,
    score,
    maxScore: 100,
  };
}

// Specific suggestions for each missing item
const ITEM_SUGGESTIONS: Record<string, string> = {
  // Introduction
  "intro-problem": "Defina claramente o problema de pesquisa. Ex: 'O problema central desta pesquisa é...' ou 'A problemática que motiva este estudo refere-se a...'",
  "intro-question": "Formule uma pergunta de pesquisa explícita. Ex: 'Qual o impacto de X em Y?' ou 'Como Z influencia W?'",
  "intro-objective-general": "Adicione o objetivo geral. Ex: 'Este estudo tem como objetivo analisar/investigar/compreender...'",
  "intro-objectives-specific": "Liste 3-5 objetivos específicos usando verbos de ação: identificar, analisar, avaliar, comparar, propor.",
  "intro-hypothesis": "Se aplicável, formule uma hipótese. Ex: 'Espera-se que X esteja relacionado a Y' ou 'Supõe-se que...'",
  "intro-structure": "Descreva a organização do trabalho. Ex: 'Este trabalho está organizado em X capítulos. O primeiro apresenta...'",

  // Literature Review
  "lit-synthesis": "Conecte as ideias dos autores. Use: 'Enquanto X defende..., Y argumenta que...' ou 'Em consonância com X, Y também afirma...'",
  "lit-comparison": "Compare explicitamente os autores. Ex: 'Diferente de X, Y propõe que...' ou 'Tanto X quanto Y concordam que...'",
  "lit-gap": "Identifique lacunas na literatura. Ex: 'Poucos estudos investigaram...' ou 'Uma lacuna identificada é...'",
  "lit-critical": "Apresente posicionamento crítico. Ex: 'Embora X argumente..., pode-se questionar...' ou 'Uma limitação do estudo de X é...'",
  "lit-connection": "Conecte a literatura ao seu estudo. Ex: 'Para a presente pesquisa, é relevante o conceito de...'",

  // Methodology
  "method-sample": "Descreva a amostra com números. Ex: 'Participaram 30 professores, selecionados por...' Inclua critérios de seleção.",
  "method-analysis": "Especifique a técnica de análise. Ex: 'Os dados foram analisados por meio de análise de conteúdo temática' ou cite o software usado.",
  "method-ethics": "Inclua informações éticas. Ex: 'Este estudo foi aprovado pelo Comitê de Ética (Parecer nº X)' ou 'Todos assinaram o TCLE.'",
  "method-justification": "Justifique suas escolhas metodológicas. Ex: 'Optou-se pela abordagem qualitativa pois permite compreender em profundidade...'",

  // Results
  "results-visuals": "Inclua tabelas ou figuras para apresentar dados. Ex: 'A Tabela 1 apresenta...' ou 'Conforme ilustrado na Figura 2...'",

  // Discussion
  "disc-literature": "Conecte resultados com a literatura. Ex: 'Esse achado corrobora os estudos de X [@autor2020], que também identificou...'",
  "disc-limitations": "Reconheça limitações do estudo. Ex: 'Uma limitação deste estudo refere-se ao tamanho da amostra, que...'",
  "disc-future": "Sugira pesquisas futuras. Ex: 'Estudos futuros poderiam investigar...' ou 'Recomenda-se aprofundar a análise de...'",

  // Conclusion
  "conc-answer": "Responda à pergunta de pesquisa. Ex: 'Conclui-se que...' ou 'Foi possível identificar que...'",
  "conc-contributions": "Destaque as contribuições. Ex: 'A principal contribuição deste estudo é...' ou 'Este trabalho contribui para o campo ao...'",
};

/**
 * Generates feedback for a section
 */
export function generateSectionFeedback(
  section: SectionType,
  content: string,
  checklist: SectionChecklist
): SectionFeedback {
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const suggestions: string[] = [];

  // Analyze based on checklist
  const completedRequired = checklist.items.filter(
    (i) => i.required && i.status === "complete"
  );
  const missingRequired = checklist.items.filter(
    (i) => i.required && i.status === "incomplete"
  );
  const completedOptional = checklist.items.filter(
    (i) => !i.required && i.status === "complete"
  );

  // Add strengths with better messages
  for (const item of completedRequired) {
    if (item.detectedAt) {
      strengths.push(`${item.label} identificado (${item.detectedAt})`);
    } else {
      strengths.push(`${item.label} presente`);
    }
  }

  // Also mention good optional items
  for (const item of completedOptional) {
    strengths.push(`${item.label} incluído (bom!)`);
  }

  // Add weaknesses with specific suggestions
  for (const item of missingRequired) {
    weaknesses.push(`${item.label} não identificado`);
    const specificSuggestion = ITEM_SUGGESTIONS[item.id];
    if (specificSuggestion) {
      suggestions.push(specificSuggestion);
    } else {
      suggestions.push(`Adicione: ${item.description}`);
    }
  }

  // Section-specific analysis with better feedback
  const wordCount = countWords(content);

  if (section === "introduction") {
    if (wordCount < 300) {
      weaknesses.push(`Introdução curta (${wordCount} palavras)`);
      suggestions.push("Expanda a introdução para 500-800 palavras. Desenvolva melhor o contexto, justificativa e objetivos.");
    } else if (wordCount >= 500) {
      strengths.push(`Extensão adequada (${wordCount} palavras)`);
    }
  }

  if (section === "literature-review") {
    const citations = countCitations(content);

    if (citations === 0) {
      weaknesses.push("Nenhuma citação encontrada");
      suggestions.push("A revisão de literatura deve citar diversos autores. Use [@autor2024] ou (AUTOR, 2024) para incluir referências.");
    } else if (citations < 5) {
      weaknesses.push(`Poucas citações (${citations} encontradas)`);
      suggestions.push("Uma boa revisão deve ter pelo menos 10-15 citações. Amplie a discussão com mais autores relevantes da área.");
    } else if (citations >= 10) {
      strengths.push(`Boa quantidade de citações (${citations})`);
    }

    const years = extractCitationYears(content);
    const currentYear = new Date().getFullYear();
    const recentYears = years.filter((y) => currentYear - y <= 5);

    if (years.length > 0 && recentYears.length < years.length * 0.3) {
      weaknesses.push("Muitas referências antigas");
      suggestions.push(`Inclua mais publicações dos últimos 5 anos (${currentYear-5}-${currentYear}). Referências recentes mostram atualização do pesquisador.`);
    } else if (recentYears.length >= years.length * 0.5) {
      strengths.push("Bom equilíbrio entre referências clássicas e recentes");
    }

    if (wordCount < 500) {
      weaknesses.push(`Revisão muito curta (${wordCount} palavras)`);
      suggestions.push("A revisão de literatura é uma das seções mais importantes. Desenvolva cada tópico com profundidade.");
    }
  }

  if (section === "methodology") {
    if (wordCount < 300) {
      weaknesses.push(`Metodologia muito sucinta (${wordCount} palavras)`);
      suggestions.push("Detalhe melhor cada aspecto metodológico: tipo de pesquisa, participantes, instrumentos, procedimentos e análise.");
    }
  }

  if (section === "discussion") {
    const citations = countCitations(content);
    if (citations === 0) {
      weaknesses.push("Discussão sem diálogo com a literatura");
      suggestions.push("Compare seus resultados com outros estudos. Ex: 'Esses achados corroboram X [@autor2020], que também identificou...'");
    }

    if (wordCount < 300) {
      weaknesses.push(`Discussão curta (${wordCount} palavras)`);
      suggestions.push("A discussão deve interpretar os resultados, não apenas repeti-los. Analise o significado dos achados.");
    }
  }

  if (section === "conclusion") {
    if (wordCount < 150) {
      weaknesses.push(`Conclusão muito breve (${wordCount} palavras)`);
      suggestions.push("Sintetize os principais achados e destaque as contribuições do estudo.");
    }
    if (wordCount > 800) {
      weaknesses.push("Conclusão muito longa");
      suggestions.push("A conclusão deve ser concisa. Evite introduzir novos argumentos ou dados nesta seção.");
    }
  }

  // Determine priority based on score and number of missing required items
  let priority: "high" | "medium" | "low" = "low";
  if (checklist.score < 40 || missingRequired.length >= 4) {
    priority = "high";
  } else if (checklist.score < 60 || missingRequired.length >= 2) {
    priority = "medium";
  }

  return {
    section,
    sectionLabel: SECTION_LABELS[section],
    score: checklist.score,
    maxScore: 100,
    strengths: strengths.slice(0, 5),
    weaknesses: weaknesses.slice(0, 5),
    suggestions: suggestions.slice(0, 5),
    priority,
  };
}

/**
 * Get all rules (system + user rules from localStorage)
 */
export function getAllRules(): Rule[] {
  const userRules: Rule[] = [];

  // Try to get user rules from localStorage (client-side only)
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(USER_RULES_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          userRules.push(...parsed);
        }
      }
    } catch (e) {
      console.error('Failed to load user rules:', e);
    }
  }

  return [...SYSTEM_RULES, ...userRules];
}

/**
 * Check a single rule against content
 */
function checkRule(rule: Rule, content: string, detectedSection: SectionType | null): RuleResult {
  // Skip disabled rules
  if (!rule.isEnabled) {
    return { rule, passed: true }; // Treat disabled as passed
  }

  // If rule is section-specific, only check if we're in that section
  if (rule.section !== null && rule.section !== detectedSection) {
    return { rule, passed: true }; // Not applicable to this section
  }

  try {
    const regex = new RegExp(rule.pattern, 'im');
    const match = content.match(regex);

    if (match && match.index !== undefined) {
      // Find line number
      const beforeMatch = content.substring(0, match.index);
      const lineNumber = beforeMatch.split('\n').length;

      return {
        rule,
        passed: true,
        matchedAt: `Linha ${lineNumber}`,
      };
    }

    return { rule, passed: false };
  } catch (e) {
    // Invalid regex pattern
    console.error(`Invalid rule pattern: ${rule.pattern}`, e);
    return { rule, passed: true }; // Skip invalid rules
  }
}

/**
 * Analyze content against all rules
 */
export function analyzeRules(content: string, detectedSection: SectionType | null): RulesAnalysis {
  const allRules = getAllRules();

  // Filter rules that apply to this context
  const applicableRules = allRules.filter(rule => {
    if (!rule.isEnabled) return false;
    // Include general rules (section === null) and section-specific rules
    return rule.section === null || rule.section === detectedSection;
  });

  const results: RuleResult[] = applicableRules.map(rule =>
    checkRule(rule, content, detectedSection)
  );

  const passedCount = results.filter(r => r.passed).length;

  return {
    results,
    passedCount,
    totalCount: results.length,
  };
}

/**
 * Save user rules to localStorage
 */
export function saveUserRules(rules: Rule[]): void {
  if (typeof window !== 'undefined') {
    try {
      // Only save non-system rules
      const userRules = rules.filter(r => !r.isSystemRule);
      localStorage.setItem(USER_RULES_STORAGE_KEY, JSON.stringify(userRules));
    } catch (e) {
      console.error('Failed to save user rules:', e);
    }
  }
}

// ============================================
// CITATION ANALYSIS - Detects uncited assertions
// ============================================

// Patterns that indicate strong assertions requiring citations
const ASSERTION_PATTERNS: { pattern: RegExp; type: string }[] = [
  // Research/study claims
  { pattern: /estudos\s+(mostram|demonstram|indicam|comprovam|revelam|apontam)/i, type: "Alegação de pesquisa" },
  { pattern: /pesquisas?\s+(mostram|demonstram|indicam|comprovam|revelam|apontam|sugerem)/i, type: "Alegação de pesquisa" },
  { pattern: /a\s+literatura\s+(mostra|indica|aponta|sugere)/i, type: "Alegação de literatura" },
  { pattern: /evidências\s+(mostram|sugerem|indicam|apontam)/i, type: "Alegação de evidência" },

  // Proven/demonstrated facts
  { pattern: /(é|está|foi|são|foram)\s+(comprovado|demonstrado|verificado|constatado|evidenciado)/i, type: "Fato alegado" },
  { pattern: /(sabe-se|é sabido)\s+que/i, type: "Conhecimento alegado" },
  { pattern: /é\s+(consenso|unanimidade|amplamente\s+aceito)/i, type: "Consenso alegado" },

  // Statistics and numbers
  { pattern: /\d+(\,\d+)?%\s+(dos?|das?|de)/i, type: "Estatística" },
  { pattern: /(a\s+maioria|grande\s+parte|a\s+maior\s+parte)\s+(dos?|das?|de)/i, type: "Quantificação" },
  { pattern: /(muitos|diversos|vários|inúmeros)\s+(estudos|autores|pesquisadores|especialistas)/i, type: "Quantificação de fontes" },

  // Expert claims
  { pattern: /segundo\s+(especialistas|pesquisadores|estudiosos|cientistas)/i, type: "Alegação de especialistas" },
  { pattern: /(especialistas|pesquisadores|estudiosos)\s+(afirmam|defendem|argumentam|sustentam)/i, type: "Alegação de especialistas" },

  // Causal claims
  { pattern: /\b(causa|provoca|leva\s+a|resulta\s+em|gera|produz)\b/i, type: "Relação causal" },
  { pattern: /\b(é\s+fundamental|é\s+essencial|é\s+crucial|é\s+necessário)\s+(para|que)/i, type: "Alegação de importância" },

  // Definitive statements
  { pattern: /(tem\s+se\s+mostrado|mostrou-se|provou-se)\s+(eficaz|efetivo|útil|importante)/i, type: "Eficácia alegada" },
  { pattern: /resultados\s+(mostram|indicam|demonstram|comprovam|revelam)/i, type: "Alegação de resultados" },
  { pattern: /dados\s+(mostram|indicam|demonstram|apontam|revelam)/i, type: "Alegação de dados" },

  // Theoretical claims without attribution
  { pattern: /(a\s+teoria|o\s+conceito|a\s+abordagem)\s+(de|do|da)\s+\w+\s+(afirma|propõe|defende|estabelece)/i, type: "Teoria sem citação" },
];

// Patterns that indicate a citation is present
const CITATION_PATTERNS = [
  /\[@[\w-]+\]/,                          // Markdown: [@author2024]
  /\([\w\s]+,\s*\d{4}\)/,                 // APA: (Author, 2024)
  /\([\w\s]+\s+et\s+al\.,?\s*\d{4}\)/i,   // APA with et al.
  /\[\d+\]/,                              // Numbered: [1]
  /segundo\s+[\w]+\s*\(\d{4}\)/i,         // "segundo Author (2024)"
  /conforme\s+[\w]+\s*\(\d{4}\)/i,        // "conforme Author (2024)"
  /de\s+acordo\s+com\s+[\w]+/i,           // "de acordo com Author"
  /apud\s+/i,                             // apud citation
];

/**
 * Check if a line or nearby context has a citation
 */
function hasCitationNearby(lines: string[], lineIndex: number): boolean {
  // Check current line and adjacent lines (context of 2 lines before/after)
  const start = Math.max(0, lineIndex - 2);
  const end = Math.min(lines.length - 1, lineIndex + 2);

  for (let i = start; i <= end; i++) {
    const line = lines[i];
    for (const pattern of CITATION_PATTERNS) {
      if (pattern.test(line)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Analyze citations in content - detects strong assertions without citations
 */
export function analyzeCitations(content: string): CitationAnalysis {
  const lines = content.split('\n');
  const uncitedAssertions: UncitedAssertion[] = [];
  let totalAssertions = 0;
  let citedAssertions = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Skip empty lines, headers, and short lines
    if (!line.trim() || line.startsWith('#') || line.trim().length < 20) {
      continue;
    }

    // Check each assertion pattern
    for (const { pattern, type } of ASSERTION_PATTERNS) {
      if (pattern.test(line)) {
        totalAssertions++;

        // Check if there's a citation nearby
        if (hasCitationNearby(lines, i)) {
          citedAssertions++;
        } else {
          // Extract a snippet of the assertion (max 100 chars)
          const match = line.match(pattern);
          let text = line.trim();
          if (text.length > 100) {
            // Try to get context around the match
            if (match && match.index !== undefined) {
              const start = Math.max(0, match.index - 20);
              const end = Math.min(text.length, match.index + match[0].length + 50);
              text = (start > 0 ? '...' : '') + text.substring(start, end) + (end < line.length ? '...' : '');
            } else {
              text = text.substring(0, 97) + '...';
            }
          }

          uncitedAssertions.push({
            text,
            lineNumber: i + 1,
            assertionType: type,
          });
        }

        // Only count first match per line to avoid duplicates
        break;
      }
    }
  }

  // Calculate score (100 if no assertions, otherwise percentage of cited assertions)
  const score = totalAssertions === 0
    ? 100
    : Math.round((citedAssertions / totalAssertions) * 100);

  return {
    totalAssertions,
    citedAssertions,
    uncitedAssertions: uncitedAssertions.slice(0, 10), // Limit to 10 for UI
    score,
  };
}

/**
 * Performs a complete analysis of the thesis content
 */
export function analyzeThesis(content: string): ThesisAnalysis {
  const sections = extractSections(content);
  const checklists: SectionChecklist[] = [];
  const feedbacks: SectionFeedback[] = [];

  // Detect the main section type from content
  let detectedSection: SectionType | null = null;
  for (const line of content.split('\n')) {
    const section = detectSectionType(line);
    if (section) {
      detectedSection = section;
      break;
    }
  }

  for (const [sectionType, sectionContent] of sections) {
    const checklist = createSectionChecklist(sectionType, sectionContent);
    checklists.push(checklist);

    const feedback = generateSectionFeedback(sectionType, sectionContent, checklist);
    feedbacks.push(feedback);
  }

  // Analyze rules
  const rulesAnalysis = analyzeRules(content, detectedSection);

  // Analyze citations
  const citationAnalysis = analyzeCitations(content);

  // Calculate overall score
  const overallScore =
    checklists.length > 0
      ? Math.round(
          checklists.reduce((sum, c) => sum + c.score, 0) / checklists.length
        )
      : 0;

  // Generate summary
  const strongPoints = feedbacks
    .filter((f) => f.score >= 70)
    .map((f) => `${f.sectionLabel} bem estruturado`);

  const improvementAreas = feedbacks
    .filter((f) => f.score < 70)
    .map((f) => `${f.sectionLabel} precisa de atencao`);

  // Add citation warning if there are uncited assertions
  if (citationAnalysis.uncitedAssertions.length > 0) {
    improvementAreas.push(`${citationAnalysis.uncitedAssertions.length} afirmação(ões) sem citação`);
  }

  return {
    overallScore,
    sections: feedbacks,
    checklists,
    rules: rulesAnalysis,
    citations: citationAnalysis,
    summary: {
      strongPoints,
      improvementAreas,
    },
    analyzedAt: new Date(),
  };
}

/**
 * Analyzes a single section
 */
export function analyzeSection(
  content: string,
  sectionType: SectionType
): { checklist: SectionChecklist; feedback: SectionFeedback } {
  const checklist = createSectionChecklist(sectionType, content);
  const feedback = generateSectionFeedback(sectionType, content, checklist);
  return { checklist, feedback };
}
