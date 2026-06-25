"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { apiFetch, encodePath } from "@/lib/apiFetch";
import { formatTime } from "@/lib/formatTime";
import { FileTree } from "./FileTree";
import { MarkdownEditor, MarkdownEditorRef } from "./MarkdownEditor";
import { EditorToolbar } from "./EditorToolbar";
import { BibliographyEditor } from "./BibliographyEditor";
import { AIAdvisor } from "./AIAdvisor";
import { ReviewPanel } from "./ReviewPanel";
import { Button } from "@/components/ui/button";
import {
  PanelRightClose,
  PanelRight,
  PanelLeftClose,
  PanelLeft,
  Save,
  FileDown,
  Sparkles,
  Loader2,
  Eye,
  Maximize2,
  Minimize2,
  ArrowLeft,
  SpellCheck,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import { cn } from "@/lib/utils";
import type { Project, ProjectFile } from "@/types/models";

// Storage key for editor preferences
const EDITOR_PREFS_KEY = "thesis-writer-editor-prefs";

interface EditorPreferences {
  showPdfPanel: boolean;
  showAdvisorPanel: boolean;
  showSidebar: boolean;
  panelSizes: number[];
  focusMode: boolean;
}

const defaultPreferences: EditorPreferences = {
  showPdfPanel: true,
  showAdvisorPanel: true,
  showSidebar: true,
  panelSizes: [15, 55, 30],
  focusMode: false,
};

function useEditorPreferences() {
  const [preferences, setPreferences] = useState<EditorPreferences>(defaultPreferences);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(EDITOR_PREFS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<EditorPreferences>;
        if (parsed.panelSizes && !Array.isArray(parsed.panelSizes)) {
          const obj = parsed.panelSizes as Record<string, number>;
          parsed.panelSizes = [obj.sidebar ?? 15, obj.main ?? 55, obj.advisor ?? 30];
        }
        if (Array.isArray(parsed.panelSizes) && parsed.panelSizes.length >= 2) {
          setPreferences({ ...defaultPreferences, ...parsed });
        }
      }
    } catch (error) {
      console.error("Failed to load editor preferences:", error);
    }
    setIsLoaded(true);
  }, []);

  const updatePreferences = useCallback((updates: Partial<EditorPreferences>) => {
    setPreferences((prev) => {
      const newPrefs = { ...prev, ...updates };
      try {
        localStorage.setItem(EDITOR_PREFS_KEY, JSON.stringify(newPrefs));
      } catch (error) {
        console.error("Failed to save editor preferences:", error);
      }
      return newPrefs;
    });
  }, []);

  return { preferences, updatePreferences, isLoaded };
}

interface EditorLayoutProps {
  project: Project;
  files: ProjectFile[];
}

export function EditorLayout({ project, files: initialFiles }: EditorLayoutProps) {
  const [files, setFiles] = useState(initialFiles);
  const [selectedFile, setSelectedFile] = useState<ProjectFile | null>(
    files.find((f) => f.path.includes("01-")) || files[0] || null
  );
  const [content, setContent] = useState(selectedFile?.content || "");
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [isBuilding, setIsBuilding] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [rightTab, setRightTab] = useState<"preview" | "advisor" | "review">("preview");
  const [metadata, setMetadata] = useState({
    name: project.name || "",
    title: project.title || "",
    subtitle: project.subtitle || "",
    author: project.author || "",
    university: project.university || "",
    language: project.language || "pt-BR",
  });
  const [savingMetadata, setSavingMetadata] = useState(false);
  const [buildError, setBuildError] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  const editorRef = useRef<MarkdownEditorRef>(null);
  const loadedFileRef = useRef<string | null>(selectedFile?.id ?? null);
  const { preferences, updatePreferences, isLoaded } = useEditorPreferences();

  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const { focusMode } = preferences;
  const showAdvisorPanel = preferences.showAdvisorPanel && !isMobile;
  const showSidebar = preferences.showSidebar && !isMobile;

  // Handlers
  const handleUndo = useCallback(() => editorRef.current?.undo(), []);
  const handleRedo = useCallback(() => editorRef.current?.redo(), []);

  const toggleSidebar = () => updatePreferences({ showSidebar: !showSidebar });
  const toggleAdvisorPanel = () => updatePreferences({ showAdvisorPanel: !showAdvisorPanel });
  const toggleFocusMode = () => updatePreferences({ focusMode: !focusMode });

  const handlePanelResize = useCallback((sizes: number[]) => {
    if (isMobile || sizes.length < 2) return;
    updatePreferences({ panelSizes: sizes });
  }, [isMobile, updatePreferences]);

  const bibFile = useMemo(() => files.find((f) => f.path.endsWith(".bib")), [files]);
  const bibContent = bibFile?.content || "";

  // Get current file content for analysis (updated when content changes)
  const currentFileContent = useMemo(() => {
    // Use the current content state which reflects unsaved changes
    return content;
  }, [content]);

  const handleFileSelect = useCallback((file: ProjectFile) => {
    const current = latestRef.current;
    if (current.file && current.content !== current.file.content) {
      flushSave();
    }
    loadedFileRef.current = null;
    setSelectedFile(null);
    setContent("");
    setSaveError(false);
    setLastSaved(null);
    requestAnimationFrame(() => {
      const draft = localStorage.getItem(`skywrite-draft:${project.id}:${file.path}`);
      setSelectedFile(file);
      if (draft != null && draft !== (file.content || "")) {
        setContent(draft);
        toast.info("Rascunho local restaurado");
      } else {
        setContent(file.content || "");
      }
      loadedFileRef.current = file.id;
    });
  }, [project.id]);

  const draftKey = (filePath: string) => `skywrite-draft:${project.id}:${filePath}`;

  const latestRef = useRef<{ file: ProjectFile | null; content: string }>({
    file: selectedFile,
    content,
  });
  latestRef.current = { file: selectedFile, content };

  const flushSave = useCallback(() => {
    const { file, content: text } = latestRef.current;
    if (!file || loadedFileRef.current !== file.id || text === file.content) return;
    apiFetch(`/api/projects/${project.id}/files/${encodePath(file.path)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: text }),
    })
      .then((res) => {
        if (res.ok) localStorage.removeItem(draftKey(file.path));
        else localStorage.setItem(draftKey(file.path), text);
      })
      .catch(() => localStorage.setItem(draftKey(file.path), text));
  }, [project.id]);

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      const { file, content: text } = latestRef.current;
      if (file && text !== file.content) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => {
      window.removeEventListener("beforeunload", handler);
      flushSave();
    };
  }, [flushSave]);

  const handleSave = async () => {
    if (!selectedFile) return;
    const file = selectedFile;
    const snapshot = content;

    setIsSaving(true);
    try {
      const response = await apiFetch(`/api/projects/${project.id}/files/${encodePath(file.path)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: snapshot }),
      });
      if (response.ok) {
        setSaveError(false);
        setLastSaved(new Date());
        setFiles((prev) => prev.map((f) => (f.id === file.id ? { ...f, content: snapshot } : f)));
        setSelectedFile((prev) => (prev?.id === file.id ? { ...prev, content: snapshot } : prev));
        localStorage.removeItem(draftKey(file.path));
      } else {
        setSaveError(true);
        localStorage.setItem(draftKey(file.path), snapshot);
        toast.error(
          response.status === 401
            ? "Sessão expirada — rascunho salvo localmente"
            : "Erro ao salvar"
        );
      }
    } catch {
      setSaveError(true);
      localStorage.setItem(draftKey(file.path), snapshot);
      toast.error("Falha de conexão ao salvar — rascunho salvo localmente");
    } finally {
      setIsSaving(false);
    }
  };

  const handleBuild = async () => {
    setRightTab("preview");
    if (!showAdvisorPanel) updatePreferences({ showAdvisorPanel: true });
    setIsBuilding(true);
    setBuildError(null);
    try {
      const response = await apiFetch(`/api/projects/${project.id}/build`, {
        method: "POST",
      });
      const data = await response.json();
      if (response.ok && data.pdfPath) {
        setPdfUrl(`${data.pdfPath}?t=${Date.now()}`);
      } else {
        setBuildError(data.error || data.details || "Build failed");
      }
    } catch (error) {
      setBuildError("Network error");
      console.error("Error building:", error);
    } finally {
      setIsBuilding(false);
    }
  };

  const handleSaveMetadata = async () => {
    setSavingMetadata(true);
    try {
      const res = await apiFetch(`/api/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(metadata),
      });
      if (!res.ok) {
        toast.error("Não foi possível salvar os metadados");
        return;
      }
      toast.success("Metadados salvos");
    } catch {
      toast.error("Falha ao salvar metadados");
    } finally {
      setSavingMetadata(false);
    }
  };

  const handleInsertImage = async (file: File) => {
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(",")[1] || "");
        reader.onerror = () => reject(new Error("read failed"));
        reader.readAsDataURL(file);
      });
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, "_");
      const filePath = `media/${safeName}`;
      const response = await apiFetch(`/api/projects/${project.id}/files`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: filePath, content: base64, type: "IMAGE" }),
      });
      if (!response.ok) {
        toast.error("Falha ao inserir imagem");
        return;
      }
      const { file: created } = await response.json();
      setFiles((prev) => [...prev, created]);
      editorRef.current?.insertAtCursor(`\n![${file.name}](${filePath})\n`);
    } catch {
      toast.error("Falha ao inserir imagem");
    }
  };

  const handleSaveBibliography = async (newBibContent: string) => {
    if (!bibFile) return;

    try {
      const response = await apiFetch(`/api/projects/${project.id}/files/${encodePath(bibFile.path)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newBibContent }),
      });

      if (response.ok) {
        setFiles((prev) =>
          prev.map((f) =>
            f.id === bibFile.id ? { ...f, content: newBibContent } : f
          )
        );
      }
    } catch (error) {
      console.error("Error saving bibliography:", error);
    }
  };

  const handleCiteSource = useCallback(
    async (source: { title: string; url: string }) => {
      let bibtex = "";
      let resolved = false;
      try {
        const res = await apiFetch(`/api/projects/${project.id}/citations/from-source`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(source),
        });
        if (res.ok) {
          const data = await res.json();
          bibtex = data.bibtex;
          resolved = data.resolved;
        }
      } catch {
        bibtex = "";
      }
      if (!bibtex) {
        const slug = source.title.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 24) || "fonte";
        bibtex = `@online{${slug},\n  title = {${source.title}},\n  url = {${source.url}}\n}`;
      }
      const rawKey = bibtex.match(/@\w+\s*\{\s*([^,\s]+)/)?.[1] || "fonte";
      const existing = new Set([...bibContent.matchAll(/@\w+\s*\{\s*([^,\s]+)/g)].map((m) => m[1]));
      let key = rawKey;
      let n = 1;
      while (existing.has(key)) key = `${rawKey}${n++}`;
      if (key !== rawKey) bibtex = bibtex.replace(`{${rawKey},`, `{${key},`);
      handleSaveBibliography(`${bibContent}\n\n${bibtex}`.trim());
      editorRef.current?.insertAtCursor(`[@${key}]`);
      toast.success(resolved ? "Citação inserida (DOI resolvido)" : "Citação inserida");
    },
    [bibContent, project.id]
  );

  // Auto-save on content change (debounced)
  useEffect(() => {
    if (!selectedFile || loadedFileRef.current !== selectedFile.id) return;
    if (content === selectedFile.content) return;

    const timeout = setTimeout(() => {
      handleSave();
    }, 2000);

    return () => clearTimeout(timeout);
  }, [content, selectedFile]);

  const saveRef = useRef(handleSave);
  saveRef.current = handleSave;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        saveRef.current();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Loading state
  if (!isLoaded) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="h-12 w-12 rounded-full border-4 border-muted" />
            <div className="absolute inset-0 h-12 w-12 animate-spin rounded-full border-4 border-transparent border-t-primary" />
          </div>
          <p className="text-sm text-muted-foreground font-medium">
            Carregando editor...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("h-[calc(100vh-4rem)]", focusMode && "focus-mode")}>
      <ResizablePanelGroup
        direction="horizontal"
        className="h-full"
        onLayout={handlePanelResize}
      >
        {/* Sidebar - File Tree */}
        {showSidebar && (
          <>
            <ResizablePanel
              defaultSize={preferences.panelSizes[0] || 15}
              minSize={12}
              maxSize={25}
              className="sidebar-panel bg-sidebar"
            >
              <div className="h-full flex flex-col">
                {/* Project Header */}
                <div className="p-4 border-b border-sidebar-border">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                      <span className="text-primary font-semibold text-sm">T</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h2 className="font-semibold text-sm truncate text-sidebar-foreground font-[family-name:var(--font-display)]">
                        {project.name}
                      </h2>
                      <p className="text-xs text-muted-foreground truncate">
                        {project.university || "Minha Tese"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* File Tree */}
                <FileTree
                  files={files}
                  selectedFile={selectedFile}
                  onSelect={handleFileSelect}
                  projectId={project.id}
                  onFileCreated={(file) => setFiles((prev) => [...prev, file])}
                  onFileDeleted={(fileId) => {
                    setFiles((prev) => {
                      const remaining = prev.filter((f) => f.id !== fileId);
                      if (selectedFile?.id === fileId) {
                        const next = remaining[0] || null;
                        loadedFileRef.current = next?.id ?? null;
                        setSelectedFile(next);
                        setContent(next?.content || "");
                      }
                      return remaining;
                    });
                  }}
                  onFileRenamed={(updatedFile) => {
                    setFiles((prev) =>
                      prev.map((f) => (f.id === updatedFile.id ? updatedFile : f))
                    );
                    if (selectedFile?.id === updatedFile.id) {
                      setSelectedFile(updatedFile);
                    }
                  }}
                />
              </div>
            </ResizablePanel>

            <ResizableHandle withHandle className="bg-sidebar-border hover:bg-primary/50 transition-colors" />
          </>
        )}

        {/* Main Editor Area */}
        <ResizablePanel
          defaultSize={showAdvisorPanel ? (preferences.panelSizes[1] || 55) : 85}
          minSize={40}
        >
          <div className="h-full flex flex-col bg-background">
            {/* Enhanced Toolbar */}
            <div className="border-b border-border bg-card px-3 py-2">
              <div className="flex items-center justify-between">
                {/* Left: Toggle & Editor Tools */}
                <div className="flex items-center gap-1">
                  {/* Back to projects */}
                  <Link to="/projects">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      title="Voltar para projetos"
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                  </Link>

                  <div className="h-5 w-px bg-border mx-1" />

                  {/* Sidebar toggle */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleSidebar}
                    className="h-8 w-8 p-0"
                    title={showSidebar ? "Ocultar arquivos" : "Mostrar arquivos"}
                  >
                    {showSidebar ? (
                      <PanelLeftClose className="h-4 w-4" />
                    ) : (
                      <PanelLeft className="h-4 w-4" />
                    )}
                  </Button>

                  <div className="h-5 w-px bg-border mx-1" />

                  <EditorToolbar
                    onInsert={(text) => editorRef.current?.insertAtCursor(text)}
                    onInsertImage={handleInsertImage}
                    onUndo={handleUndo}
                    onRedo={handleRedo}
                  />

                  <div className="h-5 w-px bg-border mx-1" />

                  <BibliographyEditor
                    bibContent={bibContent}
                    onSave={handleSaveBibliography}
                    projectId={project.id}
                  />
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-1">
                  {/* Save status */}
                  <span className="text-xs mr-2 hidden sm:inline">
                    {isSaving ? (
                      <span className="text-muted-foreground">Salvando…</span>
                    ) : saveError ? (
                      <span className="text-destructive">Erro ao salvar</span>
                    ) : selectedFile && content !== selectedFile.content ? (
                      <span className="text-muted-foreground">Não salvo</span>
                    ) : lastSaved ? (
                      <span className="text-muted-foreground">
                        Salvo {formatTime(lastSaved, project.language)}
                      </span>
                    ) : null}
                  </span>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSave}
                    disabled={isSaving}
                    className="h-8 gap-1.5"
                  >
                    {isSaving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    <span className="hidden sm:inline">Salvar</span>
                  </Button>

                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleBuild}
                    disabled={isBuilding}
                    className="h-8 gap-1.5"
                  >
                    {isBuilding ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <FileDown className="h-4 w-4" />
                    )}
                    <span className="hidden sm:inline">Gerar PDF</span>
                  </Button>

                  <div className="h-5 w-px bg-border mx-1" />

                  {/* Right panel toggle */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleAdvisorPanel}
                    className={cn("h-8 w-8 p-0", showAdvisorPanel && "bg-muted")}
                    title={showAdvisorPanel ? "Ocultar painel" : "Mostrar painel"}
                  >
                    {showAdvisorPanel ? (
                      <PanelRightClose className="h-4 w-4" />
                    ) : (
                      <PanelRight className="h-4 w-4" />
                    )}
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleFocusMode}
                    className={cn("h-8 w-8 p-0", focusMode && "bg-muted")}
                    title={focusMode ? "Sair do modo foco" : "Modo foco"}
                  >
                    {focusMode ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </div>

            {/* Editor & Preview Split */}
            <div className="flex-1 flex overflow-hidden">
              {/* Editor Panel */}
              <div className="flex-1 h-full min-h-0 flex flex-col">
                <Tabs defaultValue="edit" className="h-full flex flex-col">
                  <TabsList className="mx-4 mt-2 w-fit">
                    <TabsTrigger value="edit" className="text-xs">Editar</TabsTrigger>
                    <TabsTrigger value="metadata" className="text-xs">Metadados</TabsTrigger>
                  </TabsList>

                  <TabsContent value="edit" className="flex-1 h-full min-h-0 p-0 m-0 overflow-hidden">
                    <MarkdownEditor
                      key={`editor-${selectedFile?.path || selectedFile?.id || "no-file"}`}
                      ref={editorRef}
                      value={content}
                      onChange={setContent}
                      filename={selectedFile?.name || ""}
                      bibContent={bibContent}
                    />
                  </TabsContent>

                  <TabsContent value="metadata" className="flex-1 p-6 overflow-auto">
                    <div className="max-w-lg space-y-6">
                      <h3 className="font-semibold font-[family-name:var(--font-display)] text-lg">
                        Informações do Projeto
                      </h3>
                      <div className="grid gap-4">
                        {([
                          ["name", "Nome do projeto"],
                          ["title", "Título"],
                          ["subtitle", "Subtítulo"],
                          ["author", "Autor"],
                          ["university", "Universidade"],
                          ["language", "Idioma"],
                        ] as const).map(([field, label]) => (
                          <div key={field} className="space-y-1.5">
                            <label htmlFor={`meta-${field}`} className="text-sm font-medium text-primary">
                              {label}
                            </label>
                            <input
                              id={`meta-${field}`}
                              value={metadata[field]}
                              onChange={(e) => setMetadata((m) => ({ ...m, [field]: e.target.value }))}
                              className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                            />
                          </div>
                        ))}
                        <Button onClick={handleSaveMetadata} disabled={savingMetadata} className="w-fit">
                          {savingMetadata ? "Salvando..." : "Salvar metadados"}
                        </Button>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>

            </div>
          </div>
        </ResizablePanel>

        {/* Right Panel: Preview / Advisor tabs */}
        {showAdvisorPanel && (
          <>
            <ResizableHandle withHandle className="bg-border hover:bg-primary/50 transition-colors" />

            <ResizablePanel
              defaultSize={preferences.panelSizes[2] || 35}
              minSize={24}
              maxSize={50}
              className="advisor-panel"
            >
              <Tabs
                value={rightTab}
                onValueChange={(v) => setRightTab(v as "preview" | "advisor" | "review")}
                className="h-full flex flex-col"
              >
                <TabsList className="mx-3 mt-2 w-fit">
                  <TabsTrigger value="preview" className="text-xs gap-1.5">
                    <Eye className="h-3.5 w-3.5" />
                    Visualizar
                  </TabsTrigger>
                  <TabsTrigger value="advisor" className="text-xs gap-1.5">
                    <Sparkles className="h-3.5 w-3.5" />
                    Orientador Virtual
                  </TabsTrigger>
                  <TabsTrigger value="review" className="text-xs gap-1.5">
                    <SpellCheck className="h-3.5 w-3.5" />
                    Revisão
                  </TabsTrigger>
                </TabsList>

                <TabsContent
                  value="preview"
                  className="flex-1 min-h-0 m-0 p-3 overflow-auto bg-muted/30"
                >
                  <div className="bg-card rounded-xl shadow-lg h-full flex flex-col border border-border overflow-hidden">
                    {isBuilding ? (
                      <div className="flex-1 flex items-center justify-center">
                        <div className="text-center">
                          <div className="relative w-16 h-16 mx-auto mb-4">
                            <div className="absolute inset-0 rounded-full border-4 border-muted" />
                            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-primary animate-spin" />
                          </div>
                          <p className="text-sm text-muted-foreground">Gerando PDF...</p>
                        </div>
                      </div>
                    ) : buildError ? (
                      <div className="flex-1 flex items-center justify-center p-6">
                        <div className="text-center max-w-xs">
                          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-destructive/10 flex items-center justify-center">
                            <span className="text-2xl">!</span>
                          </div>
                          <p className="font-medium text-destructive mb-2">Erro ao gerar PDF</p>
                          <p className="text-sm text-muted-foreground">{buildError}</p>
                          <Button variant="outline" size="sm" onClick={handleBuild} disabled={isBuilding} className="mt-4">
                            Tentar novamente
                          </Button>
                        </div>
                      </div>
                    ) : pdfUrl ? (
                      <div className="flex flex-col h-full">
                        <div className="flex justify-end px-3 py-1.5 border-b border-border">
                          <a
                            href={`${pdfUrl}&download=1`}
                            download
                            className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
                          >
                            <FileDown className="h-3.5 w-3.5" />
                            Baixar PDF
                          </a>
                        </div>
                        <iframe src={pdfUrl} className="w-full flex-1" title="PDF Preview" />
                      </div>
                    ) : (
                      <div className="flex-1 flex items-center justify-center p-6">
                        <div className="text-center max-w-xs">
                          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-muted flex items-center justify-center">
                            <FileDown className="w-8 h-8 text-muted-foreground" />
                          </div>
                          <p className="font-medium mb-1">Preview do PDF</p>
                          <p className="text-sm text-muted-foreground mb-4">
                            Clique em &ldquo;Gerar PDF&rdquo; para visualizar seu documento
                          </p>
                          <Button variant="outline" size="sm" onClick={handleBuild} disabled={isBuilding}>
                            <FileDown className="w-4 h-4 mr-2" />
                            Gerar PDF
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="advisor" className="flex-1 min-h-0 m-0 overflow-hidden">
                  <AIAdvisor
                    content={currentFileContent}
                    fileName={selectedFile?.name || ""}
                    projectId={project.id}
                    language={project.language}
                    onCite={handleCiteSource}
                  />
                </TabsContent>

                <TabsContent value="review" className="flex-1 min-h-0 m-0 overflow-hidden">
                  <ReviewPanel
                    projectId={project.id}
                    content={currentFileContent}
                    onGrammarMatches={(m) => editorRef.current?.setGrammarMatches(m)}
                  />
                </TabsContent>
              </Tabs>
            </ResizablePanel>
          </>
        )}
      </ResizablePanelGroup>
    </div>
  );
}
