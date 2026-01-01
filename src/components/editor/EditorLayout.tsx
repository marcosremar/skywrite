"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { FileTree } from "./FileTree";
import { MarkdownEditor, MarkdownEditorRef } from "./MarkdownEditor";
import { EditorToolbar } from "./EditorToolbar";
import { BibliographyEditor } from "./BibliographyEditor";
import { AIAdvisor } from "./AIAdvisor";
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
  EyeOff,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import { cn } from "@/lib/utils";
import type { Project, ProjectFile } from "@prisma/client";

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
  const [isBuilding, setIsBuilding] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [buildError, setBuildError] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  const editorRef = useRef<MarkdownEditorRef>(null);
  const { preferences, updatePreferences, isLoaded } = useEditorPreferences();

  // Destructure preferences
  const { showPdfPanel, showAdvisorPanel, showSidebar, focusMode } = preferences;

  // Handlers
  const handleUndo = useCallback(() => editorRef.current?.undo(), []);
  const handleRedo = useCallback(() => editorRef.current?.redo(), []);

  const toggleSidebar = () => updatePreferences({ showSidebar: !showSidebar });
  const togglePdfPanel = () => updatePreferences({ showPdfPanel: !showPdfPanel });
  const toggleAdvisorPanel = () => updatePreferences({ showAdvisorPanel: !showAdvisorPanel });
  const toggleFocusMode = () => updatePreferences({ focusMode: !focusMode });

  const handlePanelResize = useCallback((sizes: number[]) => {
    updatePreferences({ panelSizes: sizes });
  }, [updatePreferences]);

  const bibFile = useMemo(() => files.find((f) => f.path.endsWith(".bib")), [files]);
  const bibContent = bibFile?.content || "";

  // Get all markdown content for analysis
  const allContent = useMemo(() => {
    return files
      .filter(f => f.type === "MARKDOWN")
      .map(f => f.content || "")
      .join("\n\n");
  }, [files]);

  const handleFileSelect = useCallback((file: ProjectFile) => {
    // Force complete unmount by clearing first, then set new file
    setSelectedFile(null);
    setContent("");
    // Use requestAnimationFrame to ensure unmount happens before remount
    requestAnimationFrame(() => {
      setSelectedFile(file);
      setContent(file.content || "");
    });
  }, []);

  const handleSave = async () => {
    if (!selectedFile) return;

    setIsSaving(true);
    try {
      const response = await fetch(`/api/projects/${project.id}/files/${selectedFile.path}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (response.ok) {
        setLastSaved(new Date());
        // Update local file state
        setFiles(prev => prev.map(f =>
          f.id === selectedFile.id ? { ...f, content } : f
        ));
      } else {
        console.error("Save failed:", response.status);
      }
    } catch (error) {
      console.error("Error saving:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleBuild = async () => {
    setIsBuilding(true);
    setBuildError(null);
    try {
      const response = await fetch(`/api/projects/${project.id}/build`, {
        method: "POST",
      });
      const data = await response.json();
      if (response.ok && data.pdfUrl) {
        setPdfUrl(data.pdfUrl);
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

  const handleSaveBibliography = async (newBibContent: string) => {
    if (!bibFile) return;

    try {
      const response = await fetch(`/api/projects/${project.id}/files/${bibFile.path}`, {
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

  // Auto-save on content change (debounced)
  useEffect(() => {
    if (!selectedFile || content === selectedFile.content) return;

    const timeout = setTimeout(() => {
      handleSave();
    }, 2000);

    return () => clearTimeout(timeout);
  }, [content, selectedFile]);

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
                    setFiles((prev) => prev.filter((f) => f.id !== fileId));
                    if (selectedFile?.id === fileId) {
                      const remaining = files.filter((f) => f.id !== fileId);
                      setSelectedFile(remaining[0] || null);
                      setContent(remaining[0]?.content || "");
                    }
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
                    onInsert={(text) => setContent((prev) => prev + text)}
                    onUndo={handleUndo}
                    onRedo={handleRedo}
                  />

                  <div className="h-5 w-px bg-border mx-1" />

                  <BibliographyEditor
                    bibContent={bibContent}
                    onSave={handleSaveBibliography}
                  />
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-1">
                  {/* Save status */}
                  {lastSaved && (
                    <span className="text-xs text-muted-foreground mr-2 hidden sm:inline">
                      Salvo {lastSaved.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  )}

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

                  {/* View toggles */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={togglePdfPanel}
                    className={cn("h-8 w-8 p-0", showPdfPanel && "bg-muted")}
                    title={showPdfPanel ? "Ocultar preview" : "Mostrar preview"}
                  >
                    {showPdfPanel ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleAdvisorPanel}
                    className={cn("h-8 w-8 p-0", showAdvisorPanel && "bg-muted")}
                    title={showAdvisorPanel ? "Ocultar orientador" : "Mostrar orientador"}
                  >
                    <Sparkles className={cn("h-4 w-4", showAdvisorPanel && "text-[oklch(0.65_0.18_280)]")} />
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
              <div className={cn("flex-1 h-full min-h-0 flex flex-col", showPdfPanel && "border-r border-border")}>
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
                        <div className="space-y-1.5">
                          <label className="text-sm font-medium text-primary">Título</label>
                          <p className="text-sm text-foreground bg-muted p-3 rounded-lg">
                            {project.title || "Não definido"}
                          </p>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-sm font-medium text-primary">Autor</label>
                          <p className="text-sm text-foreground bg-muted p-3 rounded-lg">
                            {project.author || "Não definido"}
                          </p>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-sm font-medium text-primary">Universidade</label>
                          <p className="text-sm text-foreground bg-muted p-3 rounded-lg">
                            {project.university || "Não definido"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>

              {/* Preview Panel */}
              {showPdfPanel && (
                <div className="w-[45%] min-w-[300px] bg-muted/30 p-4 overflow-auto">
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
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleBuild}
                            className="mt-4"
                          >
                            Tentar novamente
                          </Button>
                        </div>
                      </div>
                    ) : pdfUrl ? (
                      <iframe
                        src={pdfUrl}
                        className="w-full h-full"
                        title="PDF Preview"
                      />
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
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleBuild}
                          >
                            <FileDown className="w-4 h-4 mr-2" />
                            Gerar PDF
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </ResizablePanel>

        {/* AI Advisor Panel */}
        {showAdvisorPanel && (
          <>
            <ResizableHandle withHandle className="bg-border hover:bg-primary/50 transition-colors" />

            <ResizablePanel
              defaultSize={preferences.panelSizes[2] || 30}
              minSize={20}
              maxSize={40}
              className="advisor-panel"
            >
              <AIAdvisor content={allContent} />
            </ResizablePanel>
          </>
        )}
      </ResizablePanelGroup>
    </div>
  );
}
