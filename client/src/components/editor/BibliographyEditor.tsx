"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlusCircle, Trash2, Edit2, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { apiFetch } from "@/lib/apiFetch";

interface Citation {
  key: string;
  type: string;
  title: string;
  author: string;
  year: string;
  journal?: string;
  booktitle?: string;
  publisher?: string;
  volume?: string;
  number?: string;
  pages?: string;
  doi?: string;
  url?: string;
  abstract?: string;
  extra?: Record<string, string>;
}

const KNOWN_FIELDS = [
  "title", "author", "year", "journal", "booktitle", "publisher",
  "volume", "number", "pages", "doi", "url", "abstract",
];

function parseEntryFields(body: string): Record<string, string> {
  const fields: Record<string, string> = {};
  let i = 0;
  const n = body.length;
  while (i < n) {
    while (i < n && /[\s,]/.test(body[i])) i++;
    const start = i;
    while (i < n && /[A-Za-z0-9_+:-]/.test(body[i])) i++;
    const name = body.slice(start, i).toLowerCase();
    while (i < n && /\s/.test(body[i])) i++;
    if (!name || body[i] !== "=") {
      while (i < n && body[i] !== ",") i++;
      continue;
    }
    i++;
    while (i < n && /\s/.test(body[i])) i++;
    let value = "";
    if (body[i] === "{") {
      let depth = 0;
      while (i < n) {
        const ch = body[i];
        if (ch === "{") {
          depth++;
          if (depth > 1) value += ch;
        } else if (ch === "}") {
          depth--;
          if (depth === 0) {
            i++;
            break;
          }
          value += ch;
        } else {
          value += ch;
        }
        i++;
      }
    } else if (body[i] === '"') {
      i++;
      while (i < n && body[i] !== '"') {
        value += body[i];
        i++;
      }
      i++;
    } else {
      while (i < n && body[i] !== "," && !/\s/.test(body[i])) {
        value += body[i];
        i++;
      }
    }
    if (!(name in fields)) fields[name] = value.replace(/\s+/g, " ").trim();
  }
  return fields;
}

interface BibliographyEditorProps {
  bibContent: string;
  onSave: (content: string) => void;
  projectId: string;
}

// Reference type options with labels
const REFERENCE_TYPES = [
  { value: "article", label: "Artigo de Periódico" },
  { value: "book", label: "Livro" },
  { value: "inproceedings", label: "Artigo de Conferência" },
  { value: "incollection", label: "Capítulo de Livro" },
  { value: "phdthesis", label: "Tese de Doutorado" },
  { value: "mastersthesis", label: "Dissertação de Mestrado" },
  { value: "techreport", label: "Relatório Técnico" },
  { value: "misc", label: "Outros" },
];

// Parse BibTeX content into citations with more fields
function parseBibTeX(content: string): Citation[] {
  const citations: Citation[] = [];
  const entries = content.split(/(?=@\w+\s*\{)/);

  for (const entry of entries) {
    const match = entry.match(/@(\w+)\s*\{\s*([^,\s]+)/);
    if (!match) continue;

    const type = match[1].toLowerCase();
    const key = match[2].trim();

    if (type === "comment") continue;

    const braceIdx = entry.indexOf("{");
    const commaIdx = braceIdx === -1 ? -1 : entry.indexOf(",", braceIdx);
    const fields = commaIdx === -1 ? {} : parseEntryFields(entry.slice(commaIdx + 1));
    const extra: Record<string, string> = {};
    for (const [k, v] of Object.entries(fields)) {
      if (!KNOWN_FIELDS.includes(k)) extra[k] = v;
    }

    citations.push({
      key,
      type,
      title: fields.title || "",
      author: fields.author || "",
      year: fields.year || "",
      journal: fields.journal,
      booktitle: fields.booktitle,
      publisher: fields.publisher,
      volume: fields.volume,
      number: fields.number,
      pages: fields.pages,
      doi: fields.doi,
      url: fields.url,
      abstract: fields.abstract,
      extra: Object.keys(extra).length ? extra : undefined,
    });
  }

  return citations;
}

// Convert citations array back to BibTeX format
function toBibTeX(citations: Citation[]): string {
  return citations
    .map((c) => {
      const fields: string[] = [];

      if (c.author) fields.push(`  author = {${c.author}}`);
      if (c.title) fields.push(`  title = {${c.title}}`);
      if (c.year) fields.push(`  year = {${c.year}}`);
      if (c.journal) fields.push(`  journal = {${c.journal}}`);
      if (c.booktitle) fields.push(`  booktitle = {${c.booktitle}}`);
      if (c.publisher) fields.push(`  publisher = {${c.publisher}}`);
      if (c.volume) fields.push(`  volume = {${c.volume}}`);
      if (c.number) fields.push(`  number = {${c.number}}`);
      if (c.pages) fields.push(`  pages = {${c.pages}}`);
      if (c.doi) fields.push(`  doi = {${c.doi}}`);
      if (c.url) fields.push(`  url = {${c.url}}`);
      if (c.abstract) fields.push(`  abstract = {${c.abstract}}`);
      if (c.extra) {
        for (const [k, v] of Object.entries(c.extra)) {
          if (v) fields.push(`  ${k} = {${v}}`);
        }
      }

      return `@${c.type}{${c.key},\n${fields.join(",\n")}\n}`;
    })
    .join("\n\n");
}

// Format citation for display
function formatCitation(citation: Citation): string {
  const authors = citation.author.split(" and ")[0];
  const lastName = authors.split(",")[0] || authors.split(" ").pop() || citation.key;
  const year = citation.year || "s.d.";
  return `${lastName} (${year})`;
}

// Get type label
function getTypeLabel(type: string): string {
  return REFERENCE_TYPES.find((t) => t.value === type)?.label || type;
}

// Individual Citation Form
function CitationForm({
  citation,
  onChange,
  onDelete,
}: {
  citation: Citation;
  onChange: (updated: Citation) => void;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const updateField = (field: keyof Citation, value: string) => {
    onChange({ ...citation, [field]: value });
  };

  return (
    <div className="border border-border rounded-lg bg-card overflow-hidden">
      {/* Header - always visible */}
      <div className="p-3 bg-muted flex items-center gap-3">
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-muted-foreground hover:text-foreground"
        >
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-primary">
              @{citation.key}
            </span>
            <span className="text-xs px-2 py-0.5 bg-secondary rounded text-secondary-foreground">
              {getTypeLabel(citation.type)}
            </span>
          </div>
          <p className="text-sm font-medium truncate mt-1 text-foreground">{citation.title || "Sem título"}</p>
          <p className="text-xs text-muted-foreground truncate">{formatCitation(citation)}</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onDelete}
          className="text-destructive hover:text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Expanded form */}
      {expanded && (
        <div className="p-4 space-y-4 border-t">
          {/* Row 1: Key and Type */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">
                Chave (ID)
              </label>
              <input
                type="text"
                aria-label="Chave da referência"
                value={citation.key}
                onChange={(e) => updateField("key", e.target.value)}
                className="w-full px-3 py-2 text-sm border border-border rounded-md bg-input text-foreground"
                placeholder="ex: silva2023"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">
                Tipo de Referência
              </label>
              <select
                aria-label="Tipo de referência"
                value={citation.type}
                onChange={(e) => updateField("type", e.target.value)}
                className="w-full px-3 py-2 text-sm border border-border rounded-md bg-input text-foreground"
              >
                {REFERENCE_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 2: Title */}
          <div>
            <label className="block text-xs font-medium text-foreground mb-1">
              Título
            </label>
            <input
              type="text"
              aria-label="Título da obra"
              value={citation.title}
              onChange={(e) => updateField("title", e.target.value)}
              className="w-full px-3 py-2 text-sm border border-border rounded-md bg-input text-foreground"
              placeholder="Título da obra"
            />
          </div>

          {/* Row 3: Author and Year */}
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-foreground mb-1">
                Autor(es)
              </label>
              <input
                type="text"
                aria-label="Autores"
                value={citation.author}
                onChange={(e) => updateField("author", e.target.value)}
                className="w-full px-3 py-2 text-sm border border-border rounded-md bg-input text-foreground"
                placeholder="Sobrenome, Nome and Sobrenome, Nome"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">
                Ano
              </label>
              <input
                type="text"
                value={citation.year}
                onChange={(e) => updateField("year", e.target.value)}
                className="w-full px-3 py-2 text-sm border border-border rounded-md bg-input text-foreground"
                placeholder="2023"
              />
            </div>
          </div>

          {/* Conditional fields based on type */}
          {(citation.type === "article") && (
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-foreground mb-1">
                  Periódico
                </label>
                <input
                  type="text"
                  value={citation.journal || ""}
                  onChange={(e) => updateField("journal", e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-border rounded-md bg-input text-foreground"
                  placeholder="Nome do periódico"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  Volume
                </label>
                <input
                  type="text"
                  value={citation.volume || ""}
                  onChange={(e) => updateField("volume", e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-border rounded-md bg-input text-foreground"
                  placeholder="ex: 42"
                />
              </div>
            </div>
          )}

          {(citation.type === "inproceedings") && (
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">
                Nome da Conferência
              </label>
              <input
                type="text"
                value={citation.booktitle || ""}
                onChange={(e) => updateField("booktitle", e.target.value)}
                className="w-full px-3 py-2 text-sm border border-border rounded-md bg-input text-foreground"
                placeholder="Nome da conferência ou evento"
              />
            </div>
          )}

          {(citation.type === "book" || citation.type === "incollection") && (
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">
                Editora
              </label>
              <input
                type="text"
                value={citation.publisher || ""}
                onChange={(e) => updateField("publisher", e.target.value)}
                className="w-full px-3 py-2 text-sm border border-border rounded-md bg-input text-foreground"
                placeholder="Nome da editora"
              />
            </div>
          )}

          {/* Row: Pages and DOI */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">
                Páginas
              </label>
              <input
                type="text"
                value={citation.pages || ""}
                onChange={(e) => updateField("pages", e.target.value)}
                className="w-full px-3 py-2 text-sm border border-border rounded-md bg-input text-foreground"
                placeholder="ex: 1-15"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">
                DOI
              </label>
              <input
                type="text"
                value={citation.doi || ""}
                onChange={(e) => updateField("doi", e.target.value)}
                className="w-full px-3 py-2 text-sm border border-border rounded-md bg-input text-foreground"
                placeholder="10.xxxx/xxxxx"
              />
            </div>
          </div>

          {/* URL */}
          <div>
            <label className="block text-xs font-medium text-foreground mb-1">
              URL
            </label>
            <input
              type="text"
              value={citation.url || ""}
              onChange={(e) => updateField("url", e.target.value)}
              className="w-full px-3 py-2 text-sm border border-border rounded-md bg-input text-foreground"
              placeholder="https://..."
            />
          </div>
        </div>
      )}
    </div>
  );
}

export function BibliographyEditor({ bibContent, onSave, projectId }: BibliographyEditorProps) {
  const [citations, setCitations] = useState<Citation[]>(() => parseBibTeX(bibContent));
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("visual");
  const [rawContent, setRawContent] = useState(bibContent);
  const [doi, setDoi] = useState("");
  const [doiLoading, setDoiLoading] = useState(false);
  const [doiError, setDoiError] = useState("");
  const [risText, setRisText] = useState("");
  const [risOpen, setRisOpen] = useState(false);
  const [risLoading, setRisLoading] = useState(false);

  const handleRisImport = async () => {
    if (!risText.trim()) return;
    setRisLoading(true);
    try {
      const res = await apiFetch(`/api/projects/${projectId}/citations/ris`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ris: risText }),
      });
      if (res.ok) {
        const { bibtex } = await res.json();
        const merged = `${rawContent}\n\n${bibtex}`.trim();
        setRawContent(merged);
        setCitations(parseBibTeX(merged));
        setRisText("");
        setRisOpen(false);
      }
    } finally {
      setRisLoading(false);
    }
  };

  const handleDoiLookup = async () => {
    if (!doi.trim()) return;
    setDoiLoading(true);
    setDoiError("");
    try {
      const res = await apiFetch(`/api/projects/${projectId}/citations/doi`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doi }),
      });
      if (res.ok) {
        const { bibtex } = await res.json();
        const merged = `${rawContent}\n\n${bibtex}`.trim();
        setRawContent(merged);
        setCitations(parseBibTeX(merged));
        setDoi("");
      } else {
        setDoiError("DOI não encontrado");
      }
    } catch {
      setDoiError("Falha ao buscar DOI");
    } finally {
      setDoiLoading(false);
    }
  };

  const wasOpenRef = useRef(false);
  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      setCitations(parseBibTeX(bibContent));
      setRawContent(bibContent);
    }
    wasOpenRef.current = isOpen;
  }, [isOpen, bibContent]);

  const filteredCitations = useMemo(
    () =>
      citations.filter(
        (c) =>
          c.key.toLowerCase().includes(searchTerm.toLowerCase()) ||
          c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          c.author.toLowerCase().includes(searchTerm.toLowerCase())
      ),
    [citations, searchTerm]
  );

  const handleSave = () => {
    const content = activeTab === "visual" ? toBibTeX(citations) : rawContent;
    onSave(content);
    setIsOpen(false);
  };

  const handleAddCitation = () => {
    const newKey = `ref${Date.now().toString(36)}`;
    setCitations([
      {
        key: newKey,
        type: "article",
        title: "",
        author: "",
        year: new Date().getFullYear().toString(),
      },
      ...citations,
    ]);
  };

  const handleUpdateCitation = (index: number, updated: Citation) => {
    const newCitations = [...citations];
    newCitations[index] = updated;
    setCitations(newCitations);
  };

  const handleDeleteCitation = (index: number) => {
    setCitations(citations.filter((_, i) => i !== index));
  };

  // Sync raw content when switching tabs
  const handleTabChange = (tab: string) => {
    if (tab === "raw" && activeTab === "visual") {
      setRawContent(toBibTeX(citations));
    } else if (tab === "visual" && activeTab === "raw") {
      setCitations(parseBibTeX(rawContent));
    }
    setActiveTab(tab);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Referências ({citations.length})
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl w-[95vw] h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="flex-shrink-0 px-6 py-4 border-b">
          <DialogTitle>Gerenciar Referências Bibliográficas</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="flex-1 flex flex-col min-h-0 overflow-hidden px-6">
          <TabsList className="flex-shrink-0 mt-4">
            <TabsTrigger value="visual">Editor Visual</TabsTrigger>
            <TabsTrigger value="raw">Código BibTeX</TabsTrigger>
          </TabsList>

          <TabsContent value="visual" className="flex-1 flex flex-col min-h-0 mt-4 overflow-hidden">
            <div className="flex gap-2 mb-2 flex-shrink-0">
              <input
                type="text"
                placeholder="Colar DOI para importar (ex.: 10.2307/3586393)"
                value={doi}
                onChange={(e) => setDoi(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleDoiLookup()}
                className="flex-1 px-3 py-2 border border-border rounded-md text-sm bg-input text-foreground"
              />
              <Button onClick={handleDoiLookup} size="sm" variant="outline" disabled={doiLoading || !doi.trim()}>
                {doiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Importar DOI"}
              </Button>
            </div>
            {doiError && <p className="text-xs text-destructive mb-2 flex-shrink-0">{doiError}</p>}

            <div className="mb-2 flex-shrink-0">
              <button
                type="button"
                onClick={() => setRisOpen((v) => !v)}
                className="text-xs text-primary hover:underline"
              >
                {risOpen ? "Ocultar import RIS" : "Importar de arquivo RIS (Zotero/Mendeley)"}
              </button>
              {risOpen && (
                <div className="mt-2 space-y-2">
                  <textarea
                    value={risText}
                    onChange={(e) => setRisText(e.target.value)}
                    placeholder="Cole o conteúdo .ris aqui"
                    className="w-full h-24 px-3 py-2 border border-border rounded-md text-sm bg-input text-foreground font-mono"
                  />
                  <Button onClick={handleRisImport} size="sm" variant="outline" disabled={risLoading || !risText.trim()}>
                    {risLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Importar RIS"}
                  </Button>
                </div>
              )}
            </div>

            {/* Search and Add */}
            <div className="flex gap-2 mb-4 flex-shrink-0">
              <input
                type="text"
                aria-label="Buscar referências"
                placeholder="Buscar referências..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1 px-3 py-2 border border-border rounded-md text-sm bg-input text-foreground"
              />
              <Button onClick={handleAddCitation} size="sm">
                <PlusCircle className="h-4 w-4 mr-2" />
                Nova Referência
              </Button>
            </div>

            {/* Citations List */}
            <ScrollArea className="flex-1 -mx-2 px-2">
              <div className="space-y-3 pb-4">
                {filteredCitations.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p className="text-sm">Nenhuma referência encontrada</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-4"
                      onClick={handleAddCitation}
                    >
                      Adicionar primeira referência
                    </Button>
                  </div>
                ) : (
                  filteredCitations.map((citation, index) => (
                    <CitationForm
                      key={index}
                      citation={citation}
                      onChange={(updated) => handleUpdateCitation(citations.indexOf(citation), updated)}
                      onDelete={() => handleDeleteCitation(citations.indexOf(citation))}
                    />
                  ))
                )}
              </div>
            </ScrollArea>

            <div className="mt-4 text-xs text-muted-foreground flex-shrink-0 bg-muted p-3 rounded-md">
              <p className="font-medium mb-1">Como citar no texto:</p>
              <p>
                Use <code className="bg-secondary px-1 rounded">[@chave]</code> para inserir
                uma citação. Ex: <code className="bg-secondary px-1 rounded">[@{filteredCitations[0]?.key || "silva2023"}]</code>
              </p>
            </div>
          </TabsContent>

          <TabsContent value="raw" className="flex-1 flex flex-col min-h-0 mt-4 overflow-hidden">
            <textarea
              value={rawContent}
              onChange={(e) => setRawContent(e.target.value)}
              className="flex-1 font-mono text-xs p-4 border border-border rounded-md resize-none bg-background text-foreground"
              placeholder="Cole seu arquivo .bib aqui..."
              spellCheck={false}
            />
            <p className="mt-2 text-xs text-muted-foreground flex-shrink-0">
              Edite diretamente o código BibTeX se preferir
            </p>
          </TabsContent>
        </Tabs>

        <div className="flex justify-between items-center px-6 py-4 flex-shrink-0 border-t border-border bg-muted">
          <span className="text-sm text-muted-foreground">
            {citations.length} referencias
          </span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>Salvar Referências</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Component to insert citation in editor
interface CitationPickerProps {
  citations: Citation[];
  onInsert: (citation: string) => void;
}

export function CitationPicker({ citations, onInsert }: CitationPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const filteredCitations = citations.filter(
    (c) =>
      c.key.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.author.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelect = (key: string) => {
    onInsert(`[@${key}]`);
    setIsOpen(false);
    setSearchTerm("");
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" title="Inserir citação">
          Citar
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg w-[90vw] max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Inserir Citação</DialogTitle>
        </DialogHeader>

        <input
          type="text"
          aria-label="Buscar por autor, título ou chave"
          placeholder="Buscar por autor, título ou chave..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-3 py-2 border border-border rounded-md text-sm mb-4 bg-input text-foreground"
          autoFocus
        />

        <ScrollArea className="flex-1 min-h-0 max-h-[50vh]">
          <div className="space-y-2 pr-2">
            {filteredCitations.map((citation) => (
              <div
                key={citation.key}
                className="p-3 border border-border rounded-md cursor-pointer hover:bg-accent transition-colors"
                onClick={() => handleSelect(citation.key)}
              >
                <p className="font-mono text-xs text-primary mb-1">
                  [@{citation.key}]
                </p>
                <p className="text-sm font-medium line-clamp-2 text-foreground">{citation.title}</p>
                <p className="text-xs text-muted-foreground">{formatCitation(citation)}</p>
              </div>
            ))}
            {filteredCitations.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhuma citação encontrada
              </p>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
