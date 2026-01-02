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

// Enhanced suggestions with concrete examples and templates
const ITEM_SUGGESTIONS: Record<string, { short: string; detailed: string; template: string; verbs?: string[] }> = {
  // ============================================
  // INTRODUCTION
  // ============================================
  "intro-context": {
    short: "Contextualize o tema de pesquisa",
    detailed: "Inicie apresentando o cenário atual do tema. Mostre a evolução histórica ou a situação contemporânea que justifica a relevância do estudo.",
    template: "Nas últimas décadas, [fenômeno] tem se tornado cada vez mais [relevante/presente/discutido] no contexto de [área/campo]. Historicamente, [breve evolução]. Atualmente, [situação presente que demanda atenção].",
  },
  "intro-relevance": {
    short: "Justifique a relevância do estudo",
    detailed: "Explique POR QUE este estudo é importante. Quem se beneficia? Que problema social/científico/prático ele ajuda a resolver?",
    template: "A relevância deste estudo justifica-se por [razão principal]. Do ponto de vista [teórico/prático/social], esta pesquisa contribui para [contribuição]. Além disso, [beneficiários] podem se beneficiar ao [benefício específico].",
  },
  "intro-problem": {
    short: "Defina o problema de pesquisa",
    detailed: "O problema deve ser uma lacuna, contradição ou necessidade identificada. Não é apenas um tema, mas uma questão que PRECISA ser investigada.",
    template: "O problema central desta pesquisa reside em [lacuna/contradição/necessidade]. Apesar de [o que já se sabe], ainda não está claro [o que falta saber]. Esta lacuna é problemática porque [consequência de não resolver].",
  },
  "intro-question": {
    short: "Formule a pergunta de pesquisa",
    detailed: "A pergunta deve ser específica, investigável e alinhada ao problema. Deve começar com palavras interrogativas como 'Como', 'Qual', 'De que forma', 'Em que medida'.",
    template: "Diante do exposto, a pergunta que norteia esta pesquisa é: [Como/Qual/De que forma] [objeto de estudo] [verbo de ação] [contexto/condições]?",
    verbs: ["influencia", "afeta", "se relaciona com", "contribui para", "impacta"],
  },
  "intro-objective-general": {
    short: "Declare o objetivo geral",
    detailed: "O objetivo geral deve responder à pergunta de pesquisa. Use UM verbo no infinitivo que indique a amplitude do estudo. Deve ser alcançável e mensurável.",
    template: "O presente estudo tem como objetivo geral [verbo no infinitivo] [objeto de estudo] [contexto/delimitação], visando [resultado esperado].",
    verbs: ["analisar", "investigar", "compreender", "avaliar", "identificar", "verificar", "propor", "desenvolver"],
  },
  "intro-objectives-specific": {
    short: "Liste os objetivos específicos",
    detailed: "Os objetivos específicos são PASSOS para alcançar o objetivo geral. Devem ser 3-5 itens, em ordem lógica, cada um com um verbo diferente.",
    template: "Para alcançar o objetivo geral, definem-se os seguintes objetivos específicos:\na) Identificar [primeiro aspecto];\nb) Analisar [segundo aspecto];\nc) Avaliar [terceiro aspecto];\nd) Propor [quarto aspecto, se aplicável].",
    verbs: ["identificar", "descrever", "mapear", "categorizar", "comparar", "correlacionar", "mensurar", "propor"],
  },
  "intro-hypothesis": {
    short: "Formule a hipótese (se aplicável)",
    detailed: "A hipótese é uma resposta provisória à pergunta de pesquisa. Deve ser testável e falsificável. Em pesquisas qualitativas, pode ser substituída por pressupostos.",
    template: "Como hipótese inicial, pressupõe-se que [variável independente] [relação: influencia/afeta/está relacionada a] [variável dependente], de modo que [direção da relação: positiva/negativa/específica].",
  },
  "intro-structure": {
    short: "Descreva a estrutura do trabalho",
    detailed: "Apresente brevemente o que cada capítulo/seção contém. Isso orienta o leitor sobre o que esperar.",
    template: "Este trabalho está organizado em [N] capítulos. O primeiro capítulo apresenta [conteúdo]. O segundo capítulo aborda [conteúdo]. Na sequência, o terceiro capítulo descreve [conteúdo]. Por fim, o quarto capítulo [conteúdo].",
  },
  "intro-scope": {
    short: "Delimite o escopo do estudo",
    detailed: "Especifique os limites do estudo: temporal, geográfico, temático. O que NÃO será abordado e por quê.",
    template: "Este estudo delimita-se a [escopo geográfico], no período de [escopo temporal], focando especificamente em [escopo temático]. Não serão abordados [exclusões] devido a [justificativa].",
  },

  // ============================================
  // LITERATURE REVIEW
  // ============================================
  "lit-organization": {
    short: "Organize a revisão em subseções temáticas",
    detailed: "Divida a revisão em tópicos lógicos. Cada subseção deve ter um tema central e conectar-se às demais.",
    template: "## 2.1 [Primeiro conceito-chave]\n[Desenvolvimento do conceito com múltiplos autores]\n\n## 2.2 [Segundo conceito-chave]\n[Desenvolvimento e conexão com o anterior]",
  },
  "lit-synthesis": {
    short: "Sintetize e conecte as ideias dos autores",
    detailed: "Não apenas liste autores. DIALOGUE entre eles, mostrando convergências, divergências e complementaridades.",
    template: "Enquanto [Autor A] (ano) defende que [posição A], [Autor B] (ano) argumenta que [posição B]. Essa aparente contradição pode ser compreendida considerando que [síntese]. Em consonância, [Autor C] (ano) acrescenta que [complemento].",
  },
  "lit-comparison": {
    short: "Compare perspectivas de diferentes autores",
    detailed: "Mostre explicitamente como os autores concordam ou discordam. Use conectivos de comparação.",
    template: "Comparando as perspectivas, observa-se que tanto [Autor A] quanto [Autor B] concordam que [ponto comum]. Contudo, divergem quanto a [ponto de divergência]: enquanto o primeiro [posição A], o segundo [posição B].",
  },
  "lit-gap": {
    short: "Identifique lacunas na literatura",
    detailed: "Aponte O QUE ainda não foi estudado ou está subexplorado. Isso justifica SEU estudo.",
    template: "Apesar dos avanços apresentados, observa-se uma lacuna na literatura quanto a [lacuna específica]. Poucos estudos investigaram [aspecto negligenciado], especialmente no contexto de [seu contexto]. Esta lacuna torna-se relevante porque [importância].",
  },
  "lit-critical": {
    short: "Apresente posicionamento crítico",
    detailed: "Não aceite tudo passivamente. Questione limitações metodológicas, generalizações indevidas ou contextos diferentes.",
    template: "Embora [Autor] (ano) argumente que [argumento], pode-se questionar [aspecto questionável]. Isso porque [justificativa da crítica]. Uma limitação do estudo de [Autor] é [limitação], o que sugere cautela ao [aplicação].",
  },
  "lit-connection": {
    short: "Conecte a literatura ao seu estudo",
    detailed: "Ao final de cada subseção ou da revisão, mostre como aquele conhecimento se aplica à SUA pesquisa.",
    template: "Para o presente estudo, os conceitos de [conceitos] são particularmente relevantes, pois permitem [aplicação]. A perspectiva de [Autor] será adotada como lente teórica para [propósito].",
  },
  "lit-recent": {
    short: "Inclua referências recentes (últimos 5 anos)",
    detailed: "Equilibre clássicos com publicações recentes. Mostre que você está atualizado com o estado da arte.",
    template: "Estudos recentes, como os de [Autor] (2023) e [Autor] (2022), têm demonstrado que [achados recentes]. Isso representa um avanço em relação às perspectivas clássicas de [Autor] (ano anterior).",
  },

  // ============================================
  // METHODOLOGY
  // ============================================
  "method-type": {
    short: "Defina o tipo de pesquisa",
    detailed: "Especifique se é qualitativa, quantitativa ou mista. Se é exploratória, descritiva, explicativa ou aplicada.",
    template: "Esta pesquisa caracteriza-se como [qualitativa/quantitativa/mista], de natureza [exploratória/descritiva/explicativa/aplicada]. A escolha por essa abordagem justifica-se por [justificativa], uma vez que [razão específica do seu estudo].",
  },
  "method-approach": {
    short: "Especifique a abordagem metodológica",
    detailed: "Indique o método específico: estudo de caso, etnografia, survey, experimento, pesquisa-ação, etc.",
    template: "Adotou-se como estratégia metodológica o [estudo de caso/survey/experimento/etc.], conforme proposto por [Autor] (ano). Esta abordagem é apropriada porque [justificativa alinhada aos objetivos].",
  },
  "method-population": {
    short: "Descreva a população do estudo",
    detailed: "Especifique o universo do qual a amostra será extraída. Inclua características relevantes.",
    template: "A população deste estudo compreende [descrição da população], totalizando aproximadamente [número] indivíduos/organizações/casos. Esta população foi escolhida por [critério de escolha].",
  },
  "method-sample": {
    short: "Detalhe a amostra e critérios de seleção",
    detailed: "Informe: tamanho da amostra, tipo de amostragem (probabilística/não-probabilística), critérios de inclusão e exclusão.",
    template: "A amostra foi composta por [N] [participantes/casos/documentos], selecionados por meio de amostragem [tipo: intencional/aleatória/por conveniência/bola de neve].\n\nCritérios de inclusão: [lista]\nCritérios de exclusão: [lista]\n\nEste tamanho amostral justifica-se por [justificativa: saturação teórica/cálculo amostral/viabilidade].",
  },
  "method-instruments": {
    short: "Descreva os instrumentos de coleta",
    detailed: "Detalhe cada instrumento: questionário (quantas questões, escalas), roteiro de entrevista (tópicos), observação (protocolo).",
    template: "Para a coleta de dados, utilizou-se [instrumento], composto por [descrição: N questões, tipos de questões, escalas utilizadas]. O instrumento foi [validado por/adaptado de] [fonte]. Um pré-teste foi realizado com [N] participantes para [propósito do pré-teste].",
  },
  "method-procedures": {
    short: "Descreva os procedimentos de coleta",
    detailed: "Explique COMO os dados foram coletados: período, local, duração, quem coletou, etapas seguidas.",
    template: "A coleta de dados ocorreu entre [período], em [local]. Os procedimentos seguiram as seguintes etapas:\n1. [Primeira etapa e duração]\n2. [Segunda etapa e duração]\n3. [Terceira etapa e duração]\n\nCada [entrevista/aplicação] durou em média [tempo].",
  },
  "method-analysis": {
    short: "Especifique a técnica de análise de dados",
    detailed: "Indique O QUE foi feito com os dados: análise de conteúdo, estatística descritiva/inferencial, análise temática. Cite softwares.",
    template: "Os dados foram analisados por meio de [técnica: análise de conteúdo temática/análise estatística descritiva e inferencial/análise do discurso], conforme proposto por [Autor] (ano). Utilizou-se o software [SPSS/NVivo/Atlas.ti/Excel] para [propósito]. As categorias de análise foram [pré-definidas/emergentes].",
  },
  "method-ethics": {
    short: "Descreva os aspectos éticos",
    detailed: "Inclua: aprovação do CEP (número do parecer), TCLE, garantia de anonimato, armazenamento de dados.",
    template: "Este estudo foi aprovado pelo Comitê de Ética em Pesquisa da [instituição], sob parecer nº [número] (CAAE: [número]). Todos os participantes assinaram o Termo de Consentimento Livre e Esclarecido (TCLE). A confidencialidade foi garantida por meio de [medidas]. Os dados serão armazenados por [período] e descartados conforme [procedimento].",
  },
  "method-justification": {
    short: "Justifique as escolhas metodológicas",
    detailed: "Explique POR QUE cada escolha é adequada para responder sua pergunta de pesquisa.",
    template: "A opção pela abordagem [abordagem] justifica-se por permitir [benefício alinhado ao objetivo]. A escolha de [método específico] é apropriada porque [razão]. Esta combinação metodológica possibilita [o que possibilita em relação aos objetivos].",
  },

  // ============================================
  // RESULTS
  // ============================================
  "results-objective": {
    short: "Apresente os resultados objetivamente",
    detailed: "Descreva O QUE foi encontrado, sem interpretar ainda. Use verbos como 'observou-se', 'identificou-se', 'constatou-se'.",
    template: "Os resultados indicam que [achado principal]. Observou-se que [achado específico 1]. Adicionalmente, constatou-se que [achado específico 2]. Esses dados são detalhados a seguir.",
  },
  "results-organization": {
    short: "Organize por objetivos ou categorias",
    detailed: "Estruture os resultados seguindo a ordem dos objetivos específicos ou por categorias temáticas emergentes.",
    template: "## 4.1 [Primeiro objetivo específico ou categoria]\n[Resultados relacionados]\n\n## 4.2 [Segundo objetivo específico ou categoria]\n[Resultados relacionados]",
  },
  "results-visuals": {
    short: "Inclua tabelas ou figuras",
    detailed: "Use recursos visuais para sintetizar dados. Cada tabela/figura deve ser numerada, ter título e ser referenciada no texto.",
    template: "A Tabela 1 apresenta [o que apresenta]. Observa-se que [destaque principal].\n\n| Variável | Categoria A | Categoria B |\n|----------|-------------|-------------|\n| X | valor | valor |\n\nFonte: Dados da pesquisa (ano).\n\nConforme ilustrado na Figura 1, [descrição do que a figura mostra].",
  },
  "results-description": {
    short: "Descreva dados antes de apresentar tabelas",
    detailed: "Não insira tabelas/figuras sem contexto. Apresente, descreva os principais achados e depois interprete na discussão.",
    template: "Quanto a [aspecto analisado], os dados revelam que [tendência geral]. Conforme apresentado na Tabela X, [destaque específico]. Destaca-se que [dado mais relevante], representando [percentual ou proporção].",
  },

  // ============================================
  // DISCUSSION
  // ============================================
  "disc-interpretation": {
    short: "Interprete o significado dos resultados",
    detailed: "Vá além da descrição. O que os resultados SIGNIFICAM? Por que ocorreram? Quais as implicações?",
    template: "Esses resultados sugerem que [interpretação]. Uma possível explicação para [achado] é [explicação]. Isso significa que [implicação], o que tem consequências para [área/prática/teoria].",
  },
  "disc-literature": {
    short: "Dialogue com a literatura",
    detailed: "Compare seus achados com estudos anteriores. Corroboram? Contradizem? Por quê?",
    template: "Esses achados corroboram os estudos de [Autor] (ano), que também identificou [achado similar]. Contudo, diferem dos resultados de [Autor] (ano), que encontrou [achado diferente]. Essa divergência pode ser explicada por [possíveis razões: contexto, método, amostra].",
  },
  "disc-unexpected": {
    short: "Discuta resultados inesperados",
    detailed: "Se algo surpreendeu, discuta. Resultados inesperados frequentemente são os mais interessantes.",
    template: "Um resultado inesperado foi [achado]. Contrariamente ao pressuposto inicial de que [hipótese], os dados indicaram [realidade]. Isso pode ser atribuído a [possíveis explicações] e merece investigação adicional.",
  },
  "disc-theoretical": {
    short: "Discuta implicações teóricas",
    detailed: "O que seu estudo acrescenta ao conhecimento? Confirma, refuta ou estende teorias existentes?",
    template: "Do ponto de vista teórico, estes resultados contribuem para [área] ao [tipo de contribuição: confirmar/questionar/expandir] a perspectiva de [teoria/autor]. Especificamente, [contribuição específica].",
  },
  "disc-practical": {
    short: "Discuta implicações práticas",
    detailed: "Como os resultados podem ser aplicados? Quem pode usar e como?",
    template: "Em termos práticos, estes resultados sugerem que [implicação para prática]. Profissionais de [área] podem [aplicação específica]. Recomenda-se que [recomendação acionável].",
  },
  "disc-limitations": {
    short: "Reconheça as limitações do estudo",
    detailed: "Seja honesto sobre as fraquezas. Isso demonstra maturidade científica e orienta leitores.",
    template: "Este estudo apresenta algumas limitações que devem ser consideradas. Primeiramente, [limitação 1 e seu impacto]. Além disso, [limitação 2 e seu impacto]. Essas limitações sugerem cautela ao [generalização/aplicação] e apontam para [necessidade de estudos futuros].",
  },
  "disc-future": {
    short: "Sugira pesquisas futuras",
    detailed: "Indique caminhos para próximos estudos. O que ficou sem resposta? O que seria interessante investigar?",
    template: "Estudos futuros poderiam investigar [lacuna identificada]. Seria relevante também [outra sugestão], especialmente considerando [justificativa]. Recomenda-se ainda [terceira sugestão] para [propósito].",
  },
  "disc-answer": {
    short: "Responda à pergunta de pesquisa",
    detailed: "Explicitamente conecte os resultados à pergunta inicial. O objetivo foi alcançado?",
    template: "Retomando a pergunta de pesquisa — [pergunta] —, os resultados permitem afirmar que [resposta]. O objetivo geral de [objetivo] foi alcançado, demonstrando que [síntese dos achados principais].",
  },

  // ============================================
  // CONCLUSION
  // ============================================
  "conc-answer": {
    short: "Responda à pergunta de pesquisa",
    detailed: "Inicie a conclusão retomando o problema/pergunta e apresentando a resposta de forma clara e direta.",
    template: "Este estudo buscou [objetivo/responder à pergunta]. Os resultados permitiram concluir que [resposta principal]. Verificou-se que [síntese dos principais achados], confirmando [ou não] a hipótese inicial.",
  },
  "conc-synthesis": {
    short: "Sintetize os principais achados",
    detailed: "Resuma os resultados mais importantes em poucas frases. Não repita detalhes, apenas o essencial.",
    template: "Em síntese, os principais achados deste estudo foram: (1) [achado 1]; (2) [achado 2]; (3) [achado 3]. De modo geral, [conclusão integradora].",
  },
  "conc-contributions": {
    short: "Destaque as contribuições",
    detailed: "Explicite O QUE de novo este estudo traz para a área. Qual o valor agregado?",
    template: "A principal contribuição deste estudo reside em [contribuição principal]. Para o campo de [área], este trabalho oferece [contribuição teórica]. Do ponto de vista prático, contribui ao [contribuição prática].",
  },
  "conc-recommendations": {
    short: "Apresente recomendações",
    detailed: "Sugira ações concretas para profissionais, gestores, formuladores de políticas.",
    template: "Com base nos resultados, recomenda-se que [público-alvo 1] [ação recomendada 1]. Sugere-se ainda que [público-alvo 2] [ação recomendada 2]. Para [público-alvo 3], propõe-se [ação recomendada 3].",
  },
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

  // Add weaknesses with specific suggestions (enhanced with templates)
  for (const item of missingRequired) {
    weaknesses.push(`${item.label} não identificado`);
    const suggestionData = ITEM_SUGGESTIONS[item.id];
    if (suggestionData) {
      // Build enhanced suggestion with template
      let enhancedSuggestion = `**${suggestionData.short}**\n\n${suggestionData.detailed}`;

      // Add template
      enhancedSuggestion += `\n\n📝 **Modelo:**\n"${suggestionData.template}"`;

      // Add recommended verbs if available
      if (suggestionData.verbs && suggestionData.verbs.length > 0) {
        enhancedSuggestion += `\n\n💡 **Verbos sugeridos:** ${suggestionData.verbs.join(", ")}`;
      }

      suggestions.push(enhancedSuggestion);
    } else {
      suggestions.push(`Adicione: ${item.description}`);
    }
  }

  // Section-specific analysis with enhanced feedback
  const wordCount = countWords(content);

  if (section === "introduction") {
    if (wordCount < 300) {
      weaknesses.push(`Introdução curta (${wordCount} palavras)`);
      suggestions.push(`**Expanda a introdução**

A introdução atual tem ${wordCount} palavras, mas o recomendado é 500-800 palavras para uma tese/dissertação.

📝 **Estrutura sugerida:**
1. **Contextualização** (1-2 parágrafos): Apresente o cenário do tema
2. **Problema e justificativa** (1-2 parágrafos): Por que este estudo?
3. **Objetivos** (1 parágrafo): Geral e específicos
4. **Estrutura do trabalho** (1 parágrafo): O que cada capítulo aborda`);
    } else if (wordCount >= 500) {
      strengths.push(`Extensão adequada (${wordCount} palavras)`);
    }
  }

  if (section === "literature-review") {
    const citations = countCitations(content);

    if (citations === 0) {
      weaknesses.push("Nenhuma citação encontrada");
      suggestions.push(`**Adicione citações à revisão de literatura**

A revisão de literatura DEVE referenciar outros autores. Sem citações, não há diálogo acadêmico.

📝 **Formatos aceitos:**
- Markdown: \`[@silva2023]\`
- ABNT: \`(SILVA, 2023)\` ou \`Silva (2023)\`
- APA: \`(Silva, 2023)\` ou \`Silva (2023)\`

💡 **Dica:** Use "Segundo Silva (2023), ..." ou "De acordo com Silva (2023), ..." para integrar citações ao texto.`);
    } else if (citations < 5) {
      weaknesses.push(`Poucas citações (${citations} encontradas)`);
      suggestions.push(`**Amplie as referências**

Encontramos apenas ${citations} citações. Uma revisão robusta deve ter pelo menos 15-20 citações.

📝 **Sugestões:**
- Cada parágrafo deve ter ao menos 1 citação
- Cite autores clássicos E recentes
- Busque em bases como Google Scholar, Scopus, Web of Science`);
    } else if (citations >= 10) {
      strengths.push(`Boa quantidade de citações (${citations})`);
    }

    const years = extractCitationYears(content);
    const currentYear = new Date().getFullYear();
    const recentYears = years.filter((y) => currentYear - y <= 5);
    const recentPercent = years.length > 0 ? Math.round((recentYears.length / years.length) * 100) : 0;

    if (years.length > 0 && recentYears.length < years.length * 0.3) {
      weaknesses.push(`Referências desatualizadas (apenas ${recentPercent}% dos últimos 5 anos)`);
      suggestions.push(`**Atualize as referências**

Apenas ${recentPercent}% das suas citações são dos últimos 5 anos (${currentYear-5}-${currentYear}).

📝 **Recomendação:**
- Mínimo de 50% de referências recentes
- Busque artigos de ${currentYear-3} a ${currentYear}
- Mantenha clássicos, mas equilibre com atuais

💡 **Por quê?** Referências recentes demonstram que você conhece o estado da arte e as discussões atuais do campo.`);
    } else if (recentYears.length >= years.length * 0.5) {
      strengths.push(`Referências atualizadas (${recentPercent}% dos últimos 5 anos)`);
    }

    if (wordCount < 500) {
      weaknesses.push(`Revisão muito curta (${wordCount} palavras)`);
      suggestions.push(`**Desenvolva a revisão de literatura**

Com ${wordCount} palavras, a revisão está superficial. Espera-se pelo menos 2000-3000 palavras.

📝 **Como expandir:**
- Aprofunde cada conceito-chave
- Compare múltiplos autores sobre cada tema
- Identifique lacunas e contradições
- Conecte a literatura ao seu estudo`);
    }
  }

  if (section === "methodology") {
    if (wordCount < 300) {
      weaknesses.push(`Metodologia muito sucinta (${wordCount} palavras)`);
      suggestions.push(`**Detalhe a metodologia**

A metodologia precisa ser replicável. Com ${wordCount} palavras, faltam detalhes essenciais.

📝 **Elementos obrigatórios:**
1. **Tipo/natureza da pesquisa**: qualitativa, quantitativa, mista
2. **Estratégia metodológica**: estudo de caso, survey, experimento
3. **Participantes/amostra**: quem, quantos, como selecionados
4. **Instrumentos**: questionário, entrevista, observação
5. **Procedimentos**: como os dados foram coletados
6. **Análise**: técnica usada, software (se aplicável)
7. **Aspectos éticos**: CEP, TCLE`);
    } else if (wordCount >= 500) {
      strengths.push(`Metodologia com extensão adequada (${wordCount} palavras)`);
    }
  }

  if (section === "discussion") {
    const citations = countCitations(content);
    if (citations === 0) {
      weaknesses.push("Discussão sem diálogo com a literatura");
      suggestions.push(`**Conecte os resultados com a literatura**

A discussão deve COMPARAR seus achados com estudos anteriores, não apenas descrever.

📝 **Estrutura sugerida:**
"[Seu achado]. Esse resultado corrobora/contradiz os estudos de [Autor] (ano), que também identificou/encontrou diferente que [achado do autor]. Uma possível explicação para [convergência/divergência] é [explicação]."

💡 **Conectivos úteis:**
- Corrobora: "em consonância com", "confirma", "vai ao encontro de"
- Contradiz: "diferente de", "em contrapartida", "diverge de"`);
    }

    if (wordCount < 300) {
      weaknesses.push(`Discussão curta (${wordCount} palavras)`);
      suggestions.push(`**Aprofunde a discussão**

A discussão é onde você INTERPRETA os resultados. Não basta repetir dados.

📝 **Perguntas a responder:**
- O que os resultados SIGNIFICAM?
- Por que ocorreram assim?
- Como se comparam com outros estudos?
- Quais as implicações teóricas e práticas?
- Quais as limitações do estudo?
- O que estudos futuros deveriam investigar?`);
    } else if (wordCount >= 500) {
      strengths.push(`Discussão com extensão adequada (${wordCount} palavras)`);
    }
  }

  if (section === "conclusion") {
    if (wordCount < 150) {
      weaknesses.push(`Conclusão muito breve (${wordCount} palavras)`);
      suggestions.push(`**Expanda a conclusão**

A conclusão deve sintetizar o estudo. Com ${wordCount} palavras, faltam elementos importantes.

📝 **Estrutura sugerida:**
1. Retome a pergunta/objetivo de pesquisa
2. Apresente a resposta/conclusão principal
3. Sintetize os achados-chave (2-3 pontos)
4. Destaque as contribuições do estudo
5. Apresente recomendações práticas (se aplicável)`);
    } else if (wordCount > 800) {
      weaknesses.push("Conclusão muito longa");
      suggestions.push(`**Reduza a conclusão**

A conclusão deve ser concisa (300-500 palavras). Com ${wordCount} palavras, pode estar incluindo elementos que pertencem à discussão.

📝 **O que NÃO incluir:**
- Novos dados ou análises
- Discussão extensa de resultados
- Novas citações
- Detalhes metodológicos`);
    } else {
      strengths.push(`Conclusão com extensão adequada (${wordCount} palavras)`);
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

// Section weights for score calculation (higher = more important)
const SECTION_WEIGHTS: Record<SectionType, number> = {
  title: 0.5,
  abstract: 1.0,
  introduction: 1.5,
  'literature-review': 1.5,
  methodology: 2.0,  // Methodology is crucial
  results: 1.5,
  discussion: 1.5,
  conclusion: 1.0,
  references: 0.5,
};

// Critical sections that must exist (penalties if missing)
const CRITICAL_SECTIONS: SectionType[] = [
  'introduction',
  'methodology',
  'results',
  'conclusion',
];

/**
 * Performs a complete analysis of the thesis content
 * Uses weighted scoring with penalties for missing critical sections
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

  // ============================================
  // WEIGHTED SCORE CALCULATION WITH PENALTIES
  // ============================================

  let weightedScore = 0;
  let totalWeight = 0;
  const presentSections = new Set(feedbacks.map(f => f.section));

  // Calculate weighted average of present sections
  for (const feedback of feedbacks) {
    const weight = SECTION_WEIGHTS[feedback.section] || 1.0;
    weightedScore += feedback.score * weight;
    totalWeight += weight;
  }

  // Base score from weighted average
  let overallScore = totalWeight > 0
    ? Math.round(weightedScore / totalWeight)
    : 0;

  // PENALTIES for missing critical sections
  const missingSections: string[] = [];
  for (const criticalSection of CRITICAL_SECTIONS) {
    if (!presentSections.has(criticalSection)) {
      missingSections.push(SECTION_LABELS[criticalSection]);
      // Each missing critical section reduces score by 15%
      overallScore = Math.round(overallScore * 0.85);
    }
  }

  // PENALTY for very low methodology score (it's the most important section)
  const methodologyFeedback = feedbacks.find(f => f.section === 'methodology');
  if (methodologyFeedback && methodologyFeedback.score < 30) {
    // Methodology score under 30% = additional 20% penalty
    overallScore = Math.round(overallScore * 0.80);
  }

  // PENALTY for poor citation coverage
  if (citationAnalysis.score < 40) {
    // Many uncited assertions = 10% penalty
    overallScore = Math.round(overallScore * 0.90);
  }

  // BONUS for excellent sections (but cap at 100)
  const excellentSections = feedbacks.filter(f => f.score >= 90);
  if (excellentSections.length >= 3) {
    overallScore = Math.min(100, Math.round(overallScore * 1.05));
  }

  // Ensure score is within bounds
  overallScore = Math.max(0, Math.min(100, overallScore));

  // ============================================
  // GENERATE ENHANCED SUMMARY
  // ============================================

  const strongPoints = feedbacks
    .filter((f) => f.score >= 70)
    .map((f) => `${f.sectionLabel} bem estruturado (${f.score}%)`);

  const improvementAreas: string[] = [];

  // Add missing sections as high priority
  if (missingSections.length > 0) {
    improvementAreas.push(`Seções faltando: ${missingSections.join(', ')}`);
  }

  // Add low-scoring sections
  const lowScoringSections = feedbacks
    .filter((f) => f.score < 50)
    .sort((a, b) => a.score - b.score); // Worst first

  for (const section of lowScoringSections.slice(0, 3)) {
    improvementAreas.push(`${section.sectionLabel} precisa de atenção urgente (${section.score}%)`);
  }

  // Add medium-scoring sections
  const mediumScoringSections = feedbacks
    .filter((f) => f.score >= 50 && f.score < 70);

  for (const section of mediumScoringSections.slice(0, 2)) {
    improvementAreas.push(`${section.sectionLabel} pode ser melhorado (${section.score}%)`);
  }

  // Add citation warning with context
  if (citationAnalysis.uncitedAssertions.length > 0) {
    const count = citationAnalysis.uncitedAssertions.length;
    const severity = count > 5 ? 'ALERTA: ' : '';
    improvementAreas.push(`${severity}${count} afirmação(ões) sem citação adequada`);
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
