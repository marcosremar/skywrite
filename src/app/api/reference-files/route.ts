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
      // For PDF files, we can't extract text directly in Node.js without a library
      // For now, store a placeholder and mark for manual processing
      content = "[Arquivo PDF - extração de texto pendente]";
    } else if (fileExtension === "docx") {
      // DOCX files are also binary (ZIP archives)
      content = "[Arquivo DOCX - extração de texto pendente]";
    } else {
      // For text files (.txt, .md), read as UTF-8
      // Remove null bytes and other invalid characters
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
        status: fileExtension === "pdf" || fileExtension === "docx"
          ? ProcessingStatus.PENDING
          : ProcessingStatus.PROCESSING,
        extractedText: content,
      },
    });

    // Only process patterns for text files
    const isBinaryFile = fileExtension === "pdf" || fileExtension === "docx";
    let patterns: ExtractedPattern[] = [];
    const createdRules = [];

    if (!isBinaryFile && content.length > 0) {
      // Process the file and extract patterns
      patterns = extractPatternsFromText(content);

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
        message: isBinaryFile
          ? "Arquivo enviado. Arquivos PDF/DOCX requerem processamento manual."
          : `${createdRules.length} regras extraídas do arquivo.`,
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
