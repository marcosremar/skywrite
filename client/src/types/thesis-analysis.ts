// Types for the Thesis Analysis System (Orientador Virtual + Checklist)

// ============================================
// RULES SYSTEM
// ============================================

export interface Rule {
  id: string;
  label: string;
  description: string;
  // Pattern to search for (regex string or simple keywords separated by |)
  pattern: string;
  // Optional: section this rule applies to. If null, it's a general rule
  section: SectionType | null;
  // Whether this is a system-defined rule (cannot be deleted)
  isSystemRule: boolean;
  // Whether the rule is enabled
  isEnabled: boolean;
}

export interface RuleResult {
  rule: Rule;
  passed: boolean;
  matchedAt?: string; // Line number or location where matched
}

export interface RulesAnalysis {
  results: RuleResult[];
  passedCount: number;
  totalCount: number;
}

// ============================================
// CITATION ANALYSIS
// ============================================

export interface UncitedAssertion {
  text: string;           // The assertion text
  lineNumber: number;     // Line where it was found
  assertionType: string;  // Type of assertion (statistic, claim, etc.)
}

export interface CitationAnalysis {
  totalAssertions: number;
  citedAssertions: number;
  uncitedAssertions: UncitedAssertion[];
  score: number; // 0-100
}

// Default system rules
export const SYSTEM_RULES: Rule[] = [
  // General rules (apply to any section)
  {
    id: 'general-no-first-person',
    label: 'Evitar primeira pessoa',
    description: 'Texto academico geralmente usa terceira pessoa ou voz passiva',
    pattern: '\\b(eu|meu|minha|meus|minhas|nos|nosso|nossa)\\b',
    section: null,
    isSystemRule: true,
    isEnabled: false, // Disabled by default - some styles allow first person
  },
  {
    id: 'general-has-citations',
    label: 'Possui citacoes',
    description: 'O texto deve conter referencias bibliograficas',
    pattern: '\\[@|\\(\\w+,\\s*\\d{4}\\)',
    section: null,
    isSystemRule: true,
    isEnabled: true,
  },

  // Introduction rules
  {
    id: 'intro-has-relevance',
    label: 'Justificativa da pesquisa',
    description: 'Explica por que a pesquisa e importante',
    pattern: 'importan|relevan|necessari|fundamental|essencial|justifica|contribui',
    section: 'introduction',
    isSystemRule: true,
    isEnabled: true,
  },
  {
    id: 'intro-has-objective',
    label: 'Objetivo definido',
    description: 'Apresenta o objetivo do estudo',
    pattern: 'objetivo|visa|pretende|busca|propoe|tem como finalidade',
    section: 'introduction',
    isSystemRule: true,
    isEnabled: true,
  },
  {
    id: 'intro-has-problem',
    label: 'Problema de pesquisa',
    description: 'Define o problema a ser investigado',
    pattern: 'problema|questao|pergunta|investiga|lacuna',
    section: 'introduction',
    isSystemRule: true,
    isEnabled: true,
  },

  // Literature review rules
  {
    id: 'lit-has-comparison',
    label: 'Comparacao entre autores',
    description: 'Compara diferentes perspectivas teoricas',
    pattern: 'enquanto|por outro lado|diferente|similar|corrobora|diverge|concorda|discorda',
    section: 'literature-review',
    isSystemRule: true,
    isEnabled: true,
  },
  {
    id: 'lit-has-gap',
    label: 'Identifica lacunas',
    description: 'Aponta gaps na literatura',
    pattern: 'lacuna|gap|poucos estudos|carencia|ainda nao|pouco explorad',
    section: 'literature-review',
    isSystemRule: true,
    isEnabled: true,
  },

  // Methodology rules
  {
    id: 'method-has-type',
    label: 'Tipo de pesquisa',
    description: 'Define a natureza da pesquisa',
    pattern: 'qualitativ|quantitativ|mist|explorator|descritiv|experimental',
    section: 'methodology',
    isSystemRule: true,
    isEnabled: true,
  },
  {
    id: 'method-has-sample',
    label: 'Amostra descrita',
    description: 'Descreve os participantes ou amostra',
    pattern: 'participante|amostra|sujeito|respondente|entrevistad|\\d+\\s*(pessoa|aluno|professor)',
    section: 'methodology',
    isSystemRule: true,
    isEnabled: true,
  },
  {
    id: 'method-has-ethics',
    label: 'Aspectos eticos',
    description: 'Menciona aprovacao etica ou consentimento',
    pattern: 'etica|cep|tcle|consentimento|comite|aprovad',
    section: 'methodology',
    isSystemRule: true,
    isEnabled: true,
  },

  // Discussion rules
  {
    id: 'disc-connects-literature',
    label: 'Dialoga com literatura',
    description: 'Conecta resultados com estudos anteriores',
    pattern: 'corrobora|confirma|vai ao encontro|segundo|de acordo com|conforme|\\[@',
    section: 'discussion',
    isSystemRule: true,
    isEnabled: true,
  },
  {
    id: 'disc-has-limitations',
    label: 'Reconhece limitacoes',
    description: 'Menciona limitacoes do estudo',
    pattern: 'limitac|limites do estudo|reconhece-se|ressalva',
    section: 'discussion',
    isSystemRule: true,
    isEnabled: true,
  },

  // Conclusion rules
  {
    id: 'conc-has-synthesis',
    label: 'Sintese dos resultados',
    description: 'Resume os principais achados',
    pattern: 'conclui-se|foi possivel|os resultados|em sintese|em suma|portanto',
    section: 'conclusion',
    isSystemRule: true,
    isEnabled: true,
  },
];

// Storage key for user rules
export const USER_RULES_STORAGE_KEY = 'thesis-writer-user-rules';

// ============================================
// SECTION TYPES
// ============================================

export type SectionType =
  | 'title'
  | 'abstract'
  | 'introduction'
  | 'literature-review'
  | 'methodology'
  | 'results'
  | 'discussion'
  | 'conclusion'
  | 'references';

export type ChecklistItemStatus = 'complete' | 'incomplete' | 'partial' | 'not-applicable';

export interface ChecklistItem {
  id: string;
  label: string;
  description: string;
  required: boolean;
  status: ChecklistItemStatus;
  autoDetected: boolean;
  detectedAt?: string; // Line or paragraph reference
  weight: number; // 1-3 importance
}

export interface SectionChecklist {
  section: SectionType;
  sectionLabel: string;
  items: ChecklistItem[];
  score: number; // 0-100
  maxScore: number;
}

export interface SectionFeedback {
  section: SectionType;
  sectionLabel: string;
  score: number;
  maxScore: number;
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
  priority: 'high' | 'medium' | 'low';
}

export interface ThesisAnalysis {
  overallScore: number;
  sections: SectionFeedback[];
  checklists: SectionChecklist[];
  rules: RulesAnalysis;
  citations: CitationAnalysis;
  summary: {
    strongPoints: string[];
    improvementAreas: string[];
  };
  analyzedAt: Date;
}

export interface AnalysisRequest {
  content: string;
  sectionType?: SectionType;
  projectId: string;
}

export interface AnalysisProgress {
  isAnalyzing: boolean;
  currentSection?: SectionType;
  progress: number; // 0-100
  message?: string;
}

// Default checklists for each section
export const DEFAULT_CHECKLISTS: Record<SectionType, Omit<ChecklistItem, 'status' | 'autoDetected' | 'detectedAt'>[]> = {
  title: [
    { id: 'title-descriptive', label: 'Titulo descritivo', description: 'O titulo descreve claramente o tema da pesquisa', required: true, weight: 3 },
    { id: 'title-length', label: 'Tamanho adequado', description: 'Entre 10-15 palavras (ideal)', required: false, weight: 1 },
    { id: 'title-keywords', label: 'Palavras-chave presentes', description: 'Contem termos que facilitam a busca', required: false, weight: 2 },
  ],
  abstract: [
    { id: 'abstract-context', label: 'Contexto/Introducao', description: 'Apresenta o contexto do estudo', required: true, weight: 3 },
    { id: 'abstract-objective', label: 'Objetivo', description: 'Objetivo da pesquisa esta claro', required: true, weight: 3 },
    { id: 'abstract-method', label: 'Metodologia', description: 'Descreve brevemente o metodo usado', required: true, weight: 3 },
    { id: 'abstract-results', label: 'Resultados principais', description: 'Apresenta os principais achados', required: true, weight: 3 },
    { id: 'abstract-conclusion', label: 'Conclusao', description: 'Conclui com as implicacoes do estudo', required: true, weight: 2 },
    { id: 'abstract-length', label: 'Tamanho adequado', description: 'Entre 150-300 palavras', required: false, weight: 1 },
  ],
  introduction: [
    { id: 'intro-context', label: 'Contextualizacao do tema', description: 'Apresenta o tema de forma clara e situa o leitor', required: true, weight: 3 },
    { id: 'intro-relevance', label: 'Relevancia/Justificativa', description: 'Explica por que a pesquisa e importante', required: true, weight: 3 },
    { id: 'intro-problem', label: 'Problema de pesquisa', description: 'Define claramente o problema a ser investigado', required: true, weight: 3 },
    { id: 'intro-question', label: 'Pergunta de pesquisa', description: 'Apresenta pergunta(s) de pesquisa explicita(s)', required: true, weight: 3 },
    { id: 'intro-objective-general', label: 'Objetivo geral', description: 'Define o objetivo principal do estudo', required: true, weight: 3 },
    { id: 'intro-objectives-specific', label: 'Objetivos especificos', description: 'Lista objetivos especificos (3-5 recomendado)', required: true, weight: 2 },
    { id: 'intro-hypothesis', label: 'Hipotese (se aplicavel)', description: 'Apresenta hipotese para estudos quantitativos', required: false, weight: 2 },
    { id: 'intro-scope', label: 'Delimitacao do escopo', description: 'Define os limites da pesquisa', required: false, weight: 2 },
    { id: 'intro-structure', label: 'Estrutura do trabalho', description: 'Apresenta como o trabalho esta organizado', required: false, weight: 1 },
    { id: 'intro-definitions', label: 'Definicao de termos-chave', description: 'Define conceitos importantes', required: false, weight: 1 },
  ],
  'literature-review': [
    { id: 'lit-organization', label: 'Organizacao logica', description: 'Estrutura tematica ou cronologica clara', required: true, weight: 3 },
    { id: 'lit-coverage', label: 'Cobertura dos principais autores', description: 'Cita os autores mais relevantes da area', required: true, weight: 3 },
    { id: 'lit-recent', label: 'Referencias recentes', description: 'Inclui publicacoes dos ultimos 5 anos', required: true, weight: 3 },
    { id: 'lit-synthesis', label: 'Sintese (nao apenas resumo)', description: 'Compara e contrasta diferentes autores', required: true, weight: 3 },
    { id: 'lit-comparison', label: 'Comparacao entre autores', description: 'Identifica convergencias e divergencias', required: true, weight: 2 },
    { id: 'lit-critical', label: 'Posicionamento critico', description: 'Avalia criticamente os estudos citados', required: false, weight: 2 },
    { id: 'lit-gap', label: 'Identificacao de lacunas', description: 'Aponta gaps na literatura existente', required: true, weight: 3 },
    { id: 'lit-connection', label: 'Conexao com sua pesquisa', description: 'Relaciona a literatura com seu estudo', required: true, weight: 3 },
    { id: 'lit-definitions', label: 'Definicoes conceituais', description: 'Define os conceitos centrais do trabalho', required: false, weight: 2 },
    { id: 'lit-transitions', label: 'Transicoes entre topicos', description: 'Conecta bem os diferentes subtopicos', required: false, weight: 1 },
  ],
  methodology: [
    { id: 'method-type', label: 'Tipo de pesquisa', description: 'Define se e quali, quanti ou mista', required: true, weight: 3 },
    { id: 'method-approach', label: 'Abordagem metodologica', description: 'Descreve a abordagem escolhida', required: true, weight: 3 },
    { id: 'method-population', label: 'Universo/Populacao', description: 'Define a populacao do estudo', required: true, weight: 3 },
    { id: 'method-sample', label: 'Amostra e criterios', description: 'Descreve a amostra e criterios de selecao', required: true, weight: 3 },
    { id: 'method-instruments', label: 'Instrumentos de coleta', description: 'Descreve os instrumentos utilizados', required: true, weight: 3 },
    { id: 'method-procedures', label: 'Procedimentos de coleta', description: 'Detalha como os dados foram coletados', required: true, weight: 2 },
    { id: 'method-analysis', label: 'Tecnicas de analise', description: 'Explica como os dados serao analisados', required: true, weight: 3 },
    { id: 'method-justification', label: 'Justificativa das escolhas', description: 'Explica por que escolheu esses metodos', required: false, weight: 2 },
    { id: 'method-ethics', label: 'Aspectos eticos', description: 'Menciona CEP, TCLE quando aplicavel', required: false, weight: 2 },
    { id: 'method-limitations', label: 'Limitacoes metodologicas', description: 'Reconhece limitacoes do metodo', required: false, weight: 2 },
    { id: 'method-alignment', label: 'Alinhamento com objetivos', description: 'Metodo adequado aos objetivos', required: true, weight: 3 },
  ],
  results: [
    { id: 'results-objective', label: 'Apresentacao objetiva', description: 'Apresenta dados sem interpretacao', required: true, weight: 3 },
    { id: 'results-organization', label: 'Organizacao por objetivo', description: 'Estrutura resultados por objetivo/hipotese', required: true, weight: 3 },
    { id: 'results-visuals', label: 'Uso de tabelas/graficos', description: 'Utiliza recursos visuais quando apropriado', required: false, weight: 2 },
    { id: 'results-description', label: 'Descricao sem interpretacao', description: 'Descreve sem discutir implicacoes', required: true, weight: 2 },
    { id: 'results-complete', label: 'Dados completos', description: 'Apresenta todos os dados relevantes', required: true, weight: 3 },
    { id: 'results-references', label: 'Referencias a figuras/tabelas', description: 'Menciona figuras e tabelas no texto', required: false, weight: 1 },
  ],
  discussion: [
    { id: 'disc-interpretation', label: 'Interpretacao dos resultados', description: 'Explica o significado dos achados', required: true, weight: 3 },
    { id: 'disc-literature', label: 'Comparacao com literatura', description: 'Relaciona resultados com outros estudos', required: true, weight: 3 },
    { id: 'disc-unexpected', label: 'Resultados inesperados', description: 'Explica resultados que nao eram esperados', required: false, weight: 2 },
    { id: 'disc-theoretical', label: 'Implicacoes teoricas', description: 'Discute contribuicoes teoricas', required: false, weight: 2 },
    { id: 'disc-practical', label: 'Implicacoes praticas', description: 'Apresenta aplicacoes praticas', required: false, weight: 2 },
    { id: 'disc-limitations', label: 'Limitacoes do estudo', description: 'Reconhece limitacoes da pesquisa', required: true, weight: 3 },
    { id: 'disc-future', label: 'Pesquisas futuras', description: 'Sugere estudos futuros', required: false, weight: 2 },
    { id: 'disc-answer', label: 'Resposta a pergunta', description: 'Responde a pergunta de pesquisa', required: true, weight: 3 },
  ],
  conclusion: [
    { id: 'conc-answer', label: 'Resposta clara a pergunta', description: 'Responde diretamente a pergunta de pesquisa', required: true, weight: 3 },
    { id: 'conc-synthesis', label: 'Sintese dos achados', description: 'Resume os principais resultados', required: true, weight: 3 },
    { id: 'conc-contributions', label: 'Contribuicoes do estudo', description: 'Destaca as contribuicoes da pesquisa', required: false, weight: 2 },
    { id: 'conc-recommendations', label: 'Recomendacoes', description: 'Oferece recomendacoes praticas', required: false, weight: 2 },
    { id: 'conc-no-new-info', label: 'Sem informacoes novas', description: 'Nao introduz dados ou argumentos novos', required: true, weight: 2 },
  ],
  references: [
    { id: 'ref-format', label: 'Formatacao consistente', description: 'Segue um estilo (ABNT, APA, etc)', required: true, weight: 3 },
    { id: 'ref-complete', label: 'Referencias completas', description: 'Todas as citacoes tem referencia', required: true, weight: 3 },
    { id: 'ref-recent', label: 'Referencias atualizadas', description: 'Maioria dos ultimos 10 anos', required: false, weight: 2 },
    { id: 'ref-alphabetical', label: 'Ordem alfabetica', description: 'Lista em ordem alfabetica', required: true, weight: 1 },
  ],
};

// Section labels in Portuguese
export const SECTION_LABELS: Record<SectionType, string> = {
  title: 'Titulo',
  abstract: 'Resumo',
  introduction: 'Introducao',
  'literature-review': 'Revisao de Literatura',
  methodology: 'Metodologia',
  results: 'Resultados',
  discussion: 'Discussao',
  conclusion: 'Conclusao',
  references: 'Referencias',
};

// Priority colors
export const PRIORITY_COLORS = {
  high: 'text-red-500',
  medium: 'text-yellow-500',
  low: 'text-green-500',
} as const;

// Score thresholds
export const SCORE_THRESHOLDS = {
  excellent: 90,
  good: 70,
  fair: 50,
  poor: 0,
} as const;

export function getScoreLabel(score: number): string {
  if (score >= SCORE_THRESHOLDS.excellent) return 'Excelente';
  if (score >= SCORE_THRESHOLDS.good) return 'Bom';
  if (score >= SCORE_THRESHOLDS.fair) return 'Regular';
  return 'Precisa melhorar';
}

export function getScoreColor(score: number): string {
  if (score >= SCORE_THRESHOLDS.excellent) return 'text-green-500';
  if (score >= SCORE_THRESHOLDS.good) return 'text-primary';
  if (score >= SCORE_THRESHOLDS.fair) return 'text-yellow-500';
  return 'text-red-500';
}
