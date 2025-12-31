"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { FileTree } from "./FileTree";
import { MarkdownEditor, MarkdownEditorRef } from "./MarkdownEditor";
import { EditorToolbar } from "./EditorToolbar";
import { BibliographyEditor } from "./BibliographyEditor";
import { Button } from "@/components/ui/button";
import { PanelRightClose, PanelRight } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import type { Project, ProjectFile } from "@prisma/client";

// Storage key for editor preferences
const EDITOR_PREFS_KEY = "thesis-writer-editor-prefs";

interface EditorPreferences {
  showPdfPanel: boolean;
  // Panel sizes as percentages [sidebar, main]
  panelSizes: number[];
}

const defaultPreferences: EditorPreferences = {
  showPdfPanel: true,
  panelSizes: [15, 85], // sidebar: 15%, main: 85%
};

function useEditorPreferences() {
  const [preferences, setPreferences] = useState<EditorPreferences>(defaultPreferences);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load preferences from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(EDITOR_PREFS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<EditorPreferences>;
        setPreferences({ ...defaultPreferences, ...parsed });
      }
    } catch (error) {
      console.error("Failed to load editor preferences:", error);
    }
    setIsLoaded(true);
  }, []);

  // Save preferences to localStorage whenever they change
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

  // Ref for the markdown editor to access undo/redo
  const editorRef = useRef<MarkdownEditorRef>(null);

  // Undo/redo handlers
  const handleUndo = useCallback(() => {
    editorRef.current?.undo();
  }, []);

  const handleRedo = useCallback(() => {
    editorRef.current?.redo();
  }, []);

  // Use localStorage-backed preferences
  const { preferences, updatePreferences, isLoaded } = useEditorPreferences();
  const showPdfPanel = preferences.showPdfPanel;
  const setShowPdfPanel = (show: boolean) => updatePreferences({ showPdfPanel: show });

  // Handle panel resize - save to localStorage
  const handlePanelResize = useCallback((sizes: number[]) => {
    updatePreferences({ panelSizes: sizes });
  }, [updatePreferences]);

  // Get bibliography file content
  const bibFile = useMemo(() => files.find((f) => f.path.endsWith(".bib")), [files]);
  const bibContent = bibFile?.content || "";

  const handleFileSelect = (file: ProjectFile) => {
    setSelectedFile(file);
    setContent(file.content || "");
  };

  const handleSave = async () => {
    if (!selectedFile) return;

    setIsSaving(true);
    try {
      const response = await fetch(`/api/projects/${project.id}/files/${selectedFile.path}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (!response.ok) {
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
        console.log("Build completed:", data);
      } else {
        setBuildError(data.error || data.details || "Build failed");
        console.error("Build failed:", data);
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
        // Update local state
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

  // Show loading screen until preferences are loaded from localStorage
  if (!isLoaded) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center bg-zinc-50 dark:bg-zinc-900">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-300 border-t-zinc-600" />
          <p className="text-sm text-zinc-500">Carregando editor...</p>
        </div>
      </div>
    );
  }

  return (
    <ResizablePanelGroup
      direction="horizontal"
      className="h-[calc(100vh-4rem)]"
      onLayout={handlePanelResize}
    >
      {/* Sidebar - File Tree */}
      <ResizablePanel
        id="sidebar"
        defaultSize={preferences.panelSizes[0]}
        minSize={10}
        maxSize={30}
        className="bg-white dark:bg-zinc-950"
      >
        <div className="h-full flex flex-col">
          <div className="p-4 border-b">
            <h2 className="font-semibold truncate">{project.name}</h2>
          </div>
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

      <ResizableHandle withHandle />

      {/* Main Editor Area */}
      <ResizablePanel id="main" defaultSize={preferences.panelSizes[1]}>
        <div className="h-full flex flex-col">
          {/* Toolbar */}
          <div className="border-b bg-white dark:bg-zinc-950 px-4 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <EditorToolbar
                onInsert={(text) => setContent((prev) => prev + text)}
                onUndo={handleUndo}
                onRedo={handleRedo}
              />
              <div className="h-6 w-px bg-zinc-200 mx-2" />
              <BibliographyEditor
                bibContent={bibContent}
                onSave={handleSaveBibliography}
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSave}
                disabled={isSaving}
              >
                {isSaving ? "Salvando..." : "Salvar"}
              </Button>
              <Button
                size="sm"
                onClick={handleBuild}
                disabled={isBuilding}
              >
                {isBuilding ? "Gerando..." : "Gerar PDF"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowPdfPanel(!showPdfPanel)}
                title={showPdfPanel ? "Ocultar PDF" : "Mostrar PDF"}
                disabled={!isLoaded}
              >
                {showPdfPanel ? <PanelRightClose className="h-4 w-4" /> : <PanelRight className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {/* Editor & Preview Split */}
          <div className="flex-1 flex overflow-hidden">
            {/* Editor Panel */}
            <div className={`flex-1 ${showPdfPanel ? "border-r" : ""}`}>
              <Tabs defaultValue="edit" className="h-full flex flex-col">
                <TabsList className="mx-4 mt-2">
                  <TabsTrigger value="edit">Editar</TabsTrigger>
                  <TabsTrigger value="metadata">Metadados</TabsTrigger>
                </TabsList>
                <TabsContent value="edit" className="flex-1 p-0 m-0">
                  <MarkdownEditor
                    ref={editorRef}
                    value={content}
                    onChange={setContent}
                    filename={selectedFile?.name || ""}
                    bibContent={bibContent}
                  />
                </TabsContent>
                <TabsContent value="metadata" className="p-4">
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">Titulo</label>
                      <p className="text-sm text-zinc-500">
                        {project.title || "Nao definido"}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Autor</label>
                      <p className="text-sm text-zinc-500">
                        {project.author || "Nao definido"}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Universidade</label>
                      <p className="text-sm text-zinc-500">
                        {project.university || "Nao definido"}
                      </p>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>

            {/* Preview Panel */}
            {showPdfPanel && (
              <div className="w-1/2 bg-zinc-100 dark:bg-zinc-900 p-4 overflow-auto">
                <div className="bg-white dark:bg-zinc-950 rounded-lg shadow-sm h-full flex flex-col">
                  {isBuilding ? (
                    <div className="flex-1 flex items-center justify-center text-zinc-500">
                      <div className="text-center">
                        <div className="animate-spin text-4xl mb-2">⏳</div>
                        <p>Gerando PDF...</p>
                      </div>
                    </div>
                  ) : buildError ? (
                    <div className="flex-1 flex items-center justify-center text-red-500">
                      <div className="text-center">
                        <p className="text-4xl mb-2">❌</p>
                        <p>Erro ao gerar PDF</p>
                        <p className="text-sm mt-2">{buildError}</p>
                      </div>
                    </div>
                  ) : pdfUrl ? (
                    <iframe
                      src={pdfUrl}
                      className="w-full h-full rounded-lg"
                      title="PDF Preview"
                    />
                  ) : (
                    <div className="flex-1 flex items-center justify-center text-zinc-500">
                      <div className="text-center">
                        <p className="text-4xl mb-2">📄</p>
                        <p>Preview do PDF</p>
                        <p className="text-sm">Clique em Gerar PDF para visualizar</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
