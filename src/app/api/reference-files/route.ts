import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ProcessingStatus, RuleCategory, RuleType, RuleSeverity } from "@prisma/client";

// GET /api/reference-files - Get all reference files for user
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");

    const where: any = {
      userId: session.user.id,
    };

    if (projectId) {
      where.projectId = projectId;
    }

    const files = await db.referenceFile.findMany({
      where,
      include: {
        rules: {
          select: {
            id: true,
            name: true,
            isEnabled: true,
          },
        },
        _count: {
          select: {
            rules: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ files });
  } catch (error) {
    console.error("Error fetching reference files:", error);
    return NextResponse.json(
      { error: "Failed to fetch reference files" },
      { status: 500 }
    );
  }
}

// POST /api/reference-files - Upload a new reference file
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    console.log("Reference file upload - Session:", session?.user?.id ? "authenticated" : "not authenticated");

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized - Please log in" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const projectId = formData.get("projectId") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type - be more permissive with MIME types
    const allowedExtensions = [".txt", ".md", ".pdf", ".docx"];
    const hasValidExtension = allowedExtensions.some(ext => file.name.toLowerCase().endsWith(ext));

    if (!hasValidExtension) {
      return NextResponse.json(
        { error: `Invalid file type "${file.name}". Allowed: .txt, .md, .pdf, .docx` },
        { status: 400 }
      );
    }

    console.log("Reference file upload - File:", file.name, "Type:", file.type, "Size:", file.size);

    // Read file content
    const buffer = Buffer.from(await file.arrayBuffer());

    // Handle different file types
    let content = "";
    const fileExtension = file.name.toLowerCase().split('.').pop();

    if (fileExtension === "pdf") {
      // Extract text from PDF using unpdf
      try {
        console.log("Extracting text from PDF...");
        const { extractText } = await import("unpdf");
        // Convert Buffer to Uint8Array
        const uint8Array = new Uint8Array(buffer);
        const result = await extractText(uint8Array);
        console.log("PDF extraction result type:", typeof result, "keys:", Object.keys(result));
        // Handle different result formats
        const textContent = typeof result.text === 'string'
          ? result.text
          : Array.isArray(result.text)
            ? result.text.join('\n')
            : String(result.text || result);
        content = textContent.replace(/\x00/g, "").trim();
        console.log(`PDF text extracted: ${content.length} characters`);
      } catch (pdfError) {
        console.error("PDF extraction error:", pdfError);
        content = "[Erro ao extrair texto do PDF]";
      }
    } else if (fileExtension === "docx") {
      // DOCX - placeholder for now
      content = "[Arquivo DOCX - use PDF, TXT ou MD para análise automática]";
    } else {
      // For text files (.txt, .md), read as UTF-8
      content = buffer.toString("utf-8").replace(/\x00/g, "").trim();
    }

    // Generate storage key (in production, upload to S3/R2)
    const storageKey = `references/${session.user.id}/${Date.now()}-${file.name}`;

    // Create reference file record
    const referenceFile = await db.referenceFile.create({
      data: {
        userId: session.user.id,
        projectId,
        name: file.name.replace(/\.[^/.]+$/, ""), // Remove extension
        originalName: file.name,
        mimeType: file.type || "text/plain",
        sizeBytes: file.size,
        storageKey,
        status: ProcessingStatus.PROCESSING,
        extractedText: content,
      },
    });

    // Process patterns for files with extracted content
    const hasContent = content.length > 100 && !content.startsWith("[");
    let patterns: ExtractedPattern[] = [];
    const createdRules = [];

    if (hasContent) {
      // Try LLM analysis first, fall back to regex if unavailable
      try {
        if (process.env.OPENROUTER_API_KEY) {
          patterns = await analyzeWithLLM(content, file.name);
          console.log(`LLM analysis extracted ${patterns.length} patterns`);
        } else {
          console.log("No OPENROUTER_API_KEY, using regex analysis");
          patterns = extractPatternsFromText(content);
        }
      } catch (llmError) {
        console.warn("LLM analysis failed, falling back to regex:", llmError instanceof Error ? llmError.message : llmError);
        patterns = extractPatternsFromText(content);
      }

      // Update with extracted patterns
      await db.referenceFile.update({
        where: { id: referenceFile.id },
        data: {
          extractedPatterns: patterns as unknown as object,
          status: ProcessingStatus.COMPLETED,
          processedAt: new Date(),
        },
      });

      // Create rules from extracted patterns
      for (const pattern of patterns) {
        const rule = await db.rule.create({
          data: {
            userId: session.user.id,
            projectId,
            name: pattern.name,
            description: pattern.description,
            category: pattern.category as RuleCategory,
            type: RuleType.REFERENCE,
            pattern: pattern.pattern,
            section: pattern.section,
            severity: RuleSeverity.INFO,
            weight: 1,
            referenceFileId: referenceFile.id,
            isBuiltIn: false,
            isEnabled: true,
          },
        });
        createdRules.push(rule);
      }
    }

    // Fetch updated reference file with rules
    const updatedFile = await db.referenceFile.findUnique({
      where: { id: referenceFile.id },
      include: {
        rules: {
          select: {
            id: true,
            name: true,
            isEnabled: true,
          },
        },
        _count: {
          select: {
            rules: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        file: updatedFile,
        rulesCreated: createdRules.length,
        message: hasContent
          ? `${createdRules.length} regras de estilo extraídas do documento.`
          : "Arquivo enviado, mas não foi possível extrair texto.",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error uploading reference file:", error);
    const message = error instanceof Error ? error.message : "Failed to upload reference file";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

// Pattern extraction logic
interface ExtractedPattern {
  name: string;
  description: string;
  pattern: string;
  category: string;
  section?: string;
}

// LLM-based style analysis using OpenRouter with Qwen3-235B
async function analyzeWithLLM(text: string, fileName: string): Promise<ExtractedPattern[]> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  console.log("OpenRouter API key prefix:", apiKey?.slice(0, 20) + "...");
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY não configurada");
  }

  // Qwen3 supports larger context - use more text
  const truncatedText = text.slice(0, 15000);

  const systemPrompt = `Você é um especialista em metodologia científica e escrita acadêmica com 20 anos de experiência orientando teses e dissertações.

Analise este documento de referência e extraia regras de estilo ESPECÍFICAS e CONTEXTUAIS que possam ser usadas para avaliar outros trabalhos acadêmicos.

## O QUE EXTRAIR:

### 1. ESTRUTURA ARGUMENTATIVA
- Como o autor constrói argumentos (claim → evidence → warrant)
- Padrões de transição entre parágrafos e seções
- Organização lógica das ideias

### 2. PADRÕES DE CITAÇÃO
- Estilo usado (ABNT, APA, Vancouver, numérico)
- Densidade de citações por parágrafo (ex: "a cada 2-3 frases há citação")
- Padrões como "Segundo X (ano)", "De acordo com X", etc.

### 3. VOCABULÁRIO E TOM
- Registro formal/acadêmico específico da área
- Conectivos usados (porém, entretanto, dessa forma, etc.)
- Expressões típicas de cada seção
- Uso de voz passiva vs ativa

### 4. ELEMENTOS OBRIGATÓRIOS POR SEÇÃO
- O que a introdução DEVE conter
- Elementos essenciais da metodologia
- Estrutura esperada da discussão

### 5. PADRÕES DE QUALIDADE
- Proporção de citações recentes (últimos 5 anos)
- Extensão típica de cada seção
- Profundidade de análise

## REGRAS PARA OS PATTERNS:

IMPORTANTE: Os patterns devem ser CONTEXTUAIS, não apenas keywords soltas.

❌ RUIM: "objetivo"
✅ BOM: "(este|o presente)\\s+(estudo|trabalho|pesquisa)\\s+(tem como|possui|apresenta)\\s+objetivo"

❌ RUIM: "metodologia"
✅ BOM: "(optou-se|escolheu-se|adotou-se)\\s+(pela|por)\\s+(abordagem|metodologia|método)"

❌ RUIM: "resultado"
✅ BOM: "(os|estes)\\s+(resultados|dados|achados)\\s+(mostram|indicam|revelam|sugerem)"

## FORMATO DE RESPOSTA:

Retorne APENAS um JSON válido:
{
  "rules": [
    {
      "name": "Nome descritivo da regra",
      "description": "O que esta regra verifica e por que é importante",
      "pattern": "regex contextual com \\\\s+ para espaços",
      "category": "STRUCTURE|CONTENT|CITATION|STYLE",
      "section": "introduction|methodology|results|discussion|conclusion|null",
      "severity": "ERROR|WARNING|INFO",
      "example": "Exemplo de texto que satisfaz esta regra"
    }
  ],
  "documentProfile": {
    "area": "área do conhecimento detectada",
    "citationStyle": "ABNT|APA|Vancouver|outro",
    "avgCitationsPerPage": número,
    "recentCitationsPercent": número,
    "writingTone": "formal|semiformal|técnico"
  }
}

Extraia entre 10-20 regras de alta qualidade. Prefira qualidade a quantidade.`;

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.NEXTAUTH_URL || "http://localhost:3000",
      "X-Title": "SkyWrite - Thesis Writing Platform",
    },
    body: JSON.stringify({
      model: "qwen/qwen3-235b-a22b:free", // Qwen3 235B - muito mais capaz
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Analise este documento acadêmico de referência e extraia regras de estilo contextuais:\n\n---\n${truncatedText}\n---\n\nRetorne APENAS o JSON, sem explicações adicionais.` },
      ],
      max_tokens: 4096,
      temperature: 0.2, // Mais determinístico para consistência
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("OpenRouter error:", error);
    throw new Error(`OpenRouter API error: ${response.status}`);
  }

  const data = await response.json();
  let responseText = data.choices?.[0]?.message?.content || "";

  // Qwen3 pode incluir tags de thinking - remover
  responseText = responseText.replace(/<think>[\s\S]*?<\/think>/g, '').trim();

  // Parse JSON from response
  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    console.error("LLM response without JSON:", responseText);
    throw new Error("No JSON found in LLM response");
  }

  let analysisResult;
  try {
    analysisResult = JSON.parse(jsonMatch[0]);
  } catch (parseError) {
    console.error("JSON parse error:", parseError, "Raw:", jsonMatch[0]);
    throw new Error("Failed to parse LLM response as JSON");
  }

  // Log document profile for debugging
  if (analysisResult.documentProfile) {
    console.log("Document profile:", analysisResult.documentProfile);
  }

  // Validate and return patterns with enhanced data
  return (analysisResult.rules || [])
    .filter((r: any) => r.name && r.pattern)
    .map((r: any) => ({
      name: String(r.name).slice(0, 100),
      description: String(r.description || r.name).slice(0, 500) +
        (r.example ? `\n\nExemplo: "${r.example}"` : ""),
      pattern: String(r.pattern).slice(0, 300),
      category: ["STRUCTURE", "CONTENT", "CITATION", "STYLE", "CUSTOM"].includes(r.category)
        ? r.category
        : "CUSTOM",
      section: r.section || undefined,
      severity: r.severity || "INFO",
    }));
}

function extractPatternsFromText(text: string): ExtractedPattern[] {
  const patterns: ExtractedPattern[] = [];

  // Detect section headers and their typical content patterns
  const sectionPatterns = detectSectionStructure(text);
  patterns.push(...sectionPatterns);

  // Detect common academic phrases
  const phrasePatterns = detectAcademicPhrases(text);
  patterns.push(...phrasePatterns);

  // Detect citation patterns
  const citationPatterns = detectCitationPatterns(text);
  patterns.push(...citationPatterns);

  // Detect methodological terms
  const methodPatterns = detectMethodologyTerms(text);
  patterns.push(...methodPatterns);

  return patterns;
}

function detectSectionStructure(text: string): ExtractedPattern[] {
  const patterns: ExtractedPattern[] = [];

  // Look for common section headers
  const headerRegex = /^#+\s+(.+)$/gm;
  const headers: string[] = [];
  let match;

  while ((match = headerRegex.exec(text)) !== null) {
    headers.push(match[1].toLowerCase().trim());
  }

  // Map headers to standard sections
  const sectionMapping: Record<string, string> = {
    "introducao": "introduction",
    "introduction": "introduction",
    "metodologia": "methodology",
    "methodology": "methodology",
    "metodo": "methodology",
    "resultados": "results",
    "results": "results",
    "discussao": "discussion",
    "discussion": "discussion",
    "conclusao": "conclusion",
    "conclusion": "conclusion",
    "referencias": "references",
    "references": "references",
    "bibliografia": "references",
  };

  for (const header of headers) {
    for (const [keyword, section] of Object.entries(sectionMapping)) {
      if (header.includes(keyword)) {
        patterns.push({
          name: `Secao ${keyword.charAt(0).toUpperCase() + keyword.slice(1)}`,
          description: `Documento de referencia possui secao de ${keyword}`,
          pattern: keyword,
          category: "STRUCTURE",
          section: section,
        });
        break;
      }
    }
  }

  return patterns;
}

function detectAcademicPhrases(text: string): ExtractedPattern[] {
  const patterns: ExtractedPattern[] = [];
  const lowerText = text.toLowerCase();

  // Common academic phrases to detect
  const academicPhrases = [
    { phrase: "objetivo geral", section: "introduction" },
    { phrase: "objetivos especificos", section: "introduction" },
    { phrase: "hipotese", section: "introduction" },
    { phrase: "justificativa", section: "introduction" },
    { phrase: "revisao de literatura", section: "literature_review" },
    { phrase: "fundamentacao teorica", section: "literature_review" },
    { phrase: "coleta de dados", section: "methodology" },
    { phrase: "analise de dados", section: "methodology" },
    { phrase: "populacao e amostra", section: "methodology" },
    { phrase: "instrumento de pesquisa", section: "methodology" },
    { phrase: "limitacoes", section: "conclusion" },
    { phrase: "trabalhos futuros", section: "conclusion" },
    { phrase: "contribuicoes", section: "conclusion" },
  ];

  for (const { phrase, section } of academicPhrases) {
    if (lowerText.includes(phrase.normalize("NFD").replace(/[\u0300-\u036f]/g, ""))) {
      patterns.push({
        name: `Contem "${phrase}"`,
        description: `Documento de referencia menciona ${phrase}`,
        pattern: phrase,
        category: "CONTENT",
        section,
      });
    }
  }

  return patterns;
}

function detectCitationPatterns(text: string): ExtractedPattern[] {
  const patterns: ExtractedPattern[] = [];

  // Detect citation styles
  const citationStyles = [
    { name: "Citacao ABNT (autor, ano)", regex: /\([A-Z][A-Za-z]+,\s*\d{4}\)/g },
    { name: "Citacao numerica [n]", regex: /\[\d+\]/g },
    { name: "Citacao autor et al.", regex: /[A-Z][a-z]+\s+et\s+al\./g },
  ];

  for (const style of citationStyles) {
    const matches = text.match(style.regex);
    if (matches && matches.length >= 3) {
      patterns.push({
        name: style.name,
        description: `Documento usa estilo de citacao: ${style.name}`,
        pattern: style.regex.source,
        category: "CITATION",
      });
    }
  }

  return patterns;
}

function detectMethodologyTerms(text: string): ExtractedPattern[] {
  const patterns: ExtractedPattern[] = [];
  const lowerText = text.toLowerCase();

  const methodologyTerms = [
    "pesquisa qualitativa",
    "pesquisa quantitativa",
    "estudo de caso",
    "pesquisa exploratoria",
    "pesquisa descritiva",
    "analise de conteudo",
    "entrevista",
    "questionario",
    "observacao participante",
    "revisao sistematica",
  ];

  for (const term of methodologyTerms) {
    const normalizedTerm = term.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const normalizedText = lowerText.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    if (normalizedText.includes(normalizedTerm)) {
      patterns.push({
        name: `Metodologia: ${term}`,
        description: `Documento utiliza ${term}`,
        pattern: term,
        category: "CONTENT",
        section: "methodology",
      });
    }
  }

  return patterns;
}
