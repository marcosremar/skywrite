"use client";

import { useState, useMemo } from "react";
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
import { PlusCircle, Trash2, Edit2, ChevronDown, ChevronUp } from "lucide-react";

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
}

interface BibliographyEditorProps {
  bibContent: string;
  onSave: (content: string) => void;
}

// Reference type options with labels
const REFERENCE_TYPES = [
  { value: "article", label: "Artigo de Periodico" },
  { value: "book", label: "Livro" },
  { value: "inproceedings", label: "Artigo de Conferencia" },
  { value: "incollection", label: "Capitulo de Livro" },
  { value: "phdthesis", label: "Tese de Doutorado" },
  { value: "mastersthesis", label: "Dissertacao de Mestrado" },
  { value: "techreport", label: "Relatorio Tecnico" },
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

    const getField = (name: string): string | undefined => {
      const regex = new RegExp(`${name}\\s*=\\s*\\{([^}]*)\\}`, "i");
      const altRegex = new RegExp(`${name}\\s*=\\s*"([^"]*)"`, "i");
      const numRegex = new RegExp(`${name}\\s*=\\s*(\\d+)`, "i");
      const m = entry.match(regex) || entry.match(altRegex) || entry.match(numRegex);
      return m?.[1]?.trim();
    };

    citations.push({
      key,
      type,
      title: getField("title") || "",
      author: getField("author") || "",
      year: getField("year") || "",
      journal: getField("journal"),
      booktitle: getField("booktitle"),
      publisher: getField("publisher"),
      volume: getField("volume"),
      number: getField("number"),
      pages: getField("pages"),
      doi: getField("doi"),
      url: getField("url"),
      abstract: getField("abstract"),
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

      return `@${c.type}{${c.key},\n${fields.join(",\n")}\n}`;
    })
    .join("\n\n");
}

// Format citation for display
function formatCitation(citation: Citation): string {
  const authors = citation.author.split(" and ")[0];
  const lastName = authors.split(",")[0] || authors.split(" ").pop();
  return `${lastName} (${citation.year})`;
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
          <p className="text-sm font-medium truncate mt-1 text-foreground">{citation.title || "Sem titulo"}</p>
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
                value={citation.key}
                onChange={(e) => updateField("key", e.target.value)}
                className="w-full px-3 py-2 text-sm border border-border rounded-md bg-input text-foreground"
                placeholder="ex: silva2023"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">
                Tipo de Referencia
              </label>
              <select
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
              Titulo
            </label>
            <input
              type="text"
              value={citation.title}
              onChange={(e) => updateField("title", e.target.value)}
              className="w-full px-3 py-2 text-sm border border-border rounded-md bg-input text-foreground"
              placeholder="Titulo da obra"
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
                  Periodico
                </label>
                <input
                  type="text"
                  value={citation.journal || ""}
                  onChange={(e) => updateField("journal", e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-border rounded-md bg-input text-foreground"
                  placeholder="Nome do periodico"
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
                Nome da Conferencia
              </label>
              <input
                type="text"
                value={citation.booktitle || ""}
                onChange={(e) => updateField("booktitle", e.target.value)}
                className="w-full px-3 py-2 text-sm border border-border rounded-md bg-input text-foreground"
                placeholder="Nome da conferencia ou evento"
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
                Paginas
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

export function BibliographyEditor({ bibContent, onSave }: BibliographyEditorProps) {
  const [citations, setCitations] = useState<Citation[]>(() => parseBibTeX(bibContent));
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("visual");
  const [rawContent, setRawContent] = useState(bibContent);

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
          Referencias ({citations.length})
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl w-[95vw] h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="flex-shrink-0 px-6 py-4 border-b">
          <DialogTitle>Gerenciar Referencias Bibliograficas</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="flex-1 flex flex-col min-h-0 overflow-hidden px-6">
          <TabsList className="flex-shrink-0 mt-4">
            <TabsTrigger value="visual">Editor Visual</TabsTrigger>
            <TabsTrigger value="raw">Codigo BibTeX</TabsTrigger>
          </TabsList>

          <TabsContent value="visual" className="flex-1 flex flex-col min-h-0 mt-4 overflow-hidden">
            {/* Search and Add */}
            <div className="flex gap-2 mb-4 flex-shrink-0">
              <input
                type="text"
                placeholder="Buscar referencias..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1 px-3 py-2 border border-border rounded-md text-sm bg-input text-foreground"
              />
              <Button onClick={handleAddCitation} size="sm">
                <PlusCircle className="h-4 w-4 mr-2" />
                Nova Referencia
              </Button>
            </div>

            {/* Citations List */}
            <ScrollArea className="flex-1 -mx-2 px-2">
              <div className="space-y-3 pb-4">
                {filteredCitations.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p className="text-sm">Nenhuma referencia encontrada</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-4"
                      onClick={handleAddCitation}
                    >
                      Adicionar primeira referencia
                    </Button>
                  </div>
                ) : (
                  filteredCitations.map((citation, index) => (
                    <CitationForm
                      key={citation.key + index}
                      citation={citation}
                      onChange={(updated) =>
                        handleUpdateCitation(
                          citations.findIndex((c) => c.key === citation.key),
                          updated
                        )
                      }
                      onDelete={() =>
                        handleDeleteCitation(
                          citations.findIndex((c) => c.key === citation.key)
                        )
                      }
                    />
                  ))
                )}
              </div>
            </ScrollArea>

            <div className="mt-4 text-xs text-muted-foreground flex-shrink-0 bg-muted p-3 rounded-md">
              <p className="font-medium mb-1">Como citar no texto:</p>
              <p>
                Use <code className="bg-secondary px-1 rounded">[@chave]</code> para inserir
                uma citacao. Ex: <code className="bg-secondary px-1 rounded">[@{filteredCitations[0]?.key || "silva2023"}]</code>
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
              Edite diretamente o codigo BibTeX se preferir
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
            <Button onClick={handleSave}>Salvar Referencias</Button>
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
        <Button variant="ghost" size="sm" title="Inserir citacao">
          Citar
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg w-[90vw] max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Inserir Citacao</DialogTitle>
        </DialogHeader>

        <input
          type="text"
          placeholder="Buscar por autor, titulo ou chave..."
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
                Nenhuma citacao encontrada
              </p>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
