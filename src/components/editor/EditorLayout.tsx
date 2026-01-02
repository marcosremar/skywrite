"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { SectionNav } from "./SectionNav";
import { MarkdownEditor, MarkdownEditorRef } from "./MarkdownEditor";
import { EditorToolbar } from "./EditorToolbar";
import { BibliographyEditor } from "./BibliographyEditor";
import { AIAdvisor } from "./AIAdvisor";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { usePageTitle } from "@/components/ui/page-title";
import { SECTION_LABELS, type SectionType } from "@/types/thesis-analysis";

// Inline SVG Icons (replacing Lucide)
const Icons = {
  panelLeftClose: (props: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={props.className}>
      <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
      <line x1="9" x2="9" y1="3" y2="21" />
      <path d="m16 15-3-3 3-3" />
    </svg>
  ),
  panelLeft: (props: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={props.className}>
      <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
      <line x1="9" x2="9" y1="3" y2="21" />
    </svg>
  ),
  save: (props: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={props.className}>
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
      <polyline points="17 21 17 13 7 13 7 21" />
      <polyline points="7 3 7 8 15 8" />
    </svg>
  ),
  fileDown: (props: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={props.className}>
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <polyline points="14 2 14 8 20 8" />
      <path d="M12 18v-6" />
      <path d="m9 15 3 3 3-3" />
    </svg>
  ),
  sparkles: (props: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={props.className}>
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
      <path d="M5 3v4" />
      <path d="M19 17v4" />
      <path d="M3 5h4" />
      <path d="M17 19h4" />
    </svg>
  ),
  loader2: (props: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={props.className}>
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  ),
  eye: (props: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={props.className}>
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  eyeOff: (props: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={props.className}>
      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
      <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
      <line x1="2" x2="22" y1="2" y2="22" />
    </svg>
  ),
  maximize2: (props: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={props.className}>
      <polyline points="15 3 21 3 21 9" />
      <polyline points="9 21 3 21 3 15" />
      <line x1="21" x2="14" y1="3" y2="10" />
      <line x1="3" x2="10" y1="21" y2="14" />
    </svg>
  ),
  minimize2: (props: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={props.className}>
      <polyline points="4 14 10 14 10 20" />
      <polyline points="20 10 14 10 14 4" />
      <line x1="14" x2="21" y1="10" y2="3" />
      <line x1="3" x2="10" y1="21" y2="14" />
    </svg>
  ),
  arrowLeft: (props: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={props.className}>
      <path d="m12 19-7-7 7-7" />
      <path d="M19 12H5" />
    </svg>
  ),
  folder: (props: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={props.className}>
      <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
    </svg>
  ),
  x: (props: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={props.className}>
      <path d="M18 6 6 18" /><path d="m6 6 12 12" />
    </svg>
  ),
  menu: (props: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={props.className}>
      <line x1="4" x2="20" y1="12" y2="12" /><line x1="4" x2="20" y1="6" y2="6" /><line x1="4" x2="20" y1="18" y2="18" />
    </svg>
  ),
  bot: (props: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={props.className}>
      <path d="M12 8V4H8" /><rect width="16" height="12" x="4" y="8" rx="2" /><path d="M2 14h2" /><path d="M20 14h2" /><path d="M15 13v2" /><path d="M9 13v2" />
    </svg>
  ),
};
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
  sidebarCollapsed: boolean;
  panelSizes: number[];
  focusMode: boolean;
}

// Check if window is available (client-side)
const getDefaultPreferences = (): EditorPreferences => {
  const isSmallScreen = typeof window !== "undefined" && window.innerWidth < 1024;
  return {
    showPdfPanel: !isSmallScreen,
    showAdvisorPanel: !isSmallScreen,
    showSidebar: !isSmallScreen,
    sidebarCollapsed: false,
    panelSizes: [15, 55, 30],
    focusMode: false,
  };
};

const defaultPreferences: EditorPreferences = {
  showPdfPanel: true,
  showAdvisorPanel: true,
  showSidebar: true,
  sidebarCollapsed: false,
  panelSizes: [15, 55, 30],
  focusMode: false,
};

function useEditorPreferences() {
  const [preferences, setPreferences] = useState<EditorPreferences>(defaultPreferences);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Get responsive defaults based on screen size
    const responsiveDefaults = getDefaultPreferences();

    try {
      const stored = localStorage.getItem(EDITOR_PREFS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<EditorPreferences>;
        if (parsed.panelSizes && !Array.isArray(parsed.panelSizes)) {
          const obj = parsed.panelSizes as Record<string, number>;
          parsed.panelSizes = [obj.sidebar ?? 15, obj.main ?? 55, obj.advisor ?? 30];
        }
        if (Array.isArray(parsed.panelSizes) && parsed.panelSizes.length >= 2) {
          // On small screens, override panel visibility regardless of stored prefs
          const isSmallScreen = window.innerWidth < 1024;
          setPreferences({
            ...responsiveDefaults,
            ...parsed,
            ...(isSmallScreen && {
              showSidebar: false,
              showAdvisorPanel: false,
              showPdfPanel: false,
            })
          });
        } else {
          setPreferences(responsiveDefaults);
        }
      } else {
        setPreferences(responsiveDefaults);
      }
    } catch (error) {
      console.error("Failed to load editor preferences:", error);
      setPreferences(responsiveDefaults);
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

  // Mobile sheet states
  const [mobileFilesOpen, setMobileFilesOpen] = useState(false);
  const [mobileAdvisorOpen, setMobileAdvisorOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const editorRef = useRef<MarkdownEditorRef>(null);
  const { preferences, updatePreferences, isLoaded } = useEditorPreferences();
  const { setTitle, clearTitle } = usePageTitle();

  // Set page title in header - show section label instead of filename
  useEffect(() => {
    const section = selectedFile?.section as SectionType | undefined;
    const sectionLabel = section ? SECTION_LABELS[section] : selectedFile?.name?.replace('.md', '') || '';
    setTitle(project.name, sectionLabel);
    return () => clearTitle();
  }, [project.name, selectedFile?.section, selectedFile?.name, setTitle, clearTitle]);

  // Detect mobile/tablet
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Destructure preferences
  const { showPdfPanel, showAdvisorPanel, showSidebar, sidebarCollapsed, focusMode } = preferences;

  // Handlers
  const handleUndo = useCallback(() => editorRef.current?.undo(), []);
  const handleRedo = useCallback(() => editorRef.current?.redo(), []);
  const handleScrollToLine = useCallback((lineNumber: number) => editorRef.current?.scrollToLine(lineNumber), []);

  const toggleSidebar = () => updatePreferences({ showSidebar: !showSidebar });
  const toggleSidebarCollapse = () => updatePreferences({ sidebarCollapsed: !sidebarCollapsed });
  const togglePdfPanel = () => updatePreferences({ showPdfPanel: !showPdfPanel });
  const toggleAdvisorPanel = () => updatePreferences({ showAdvisorPanel: !showAdvisorPanel });
  const toggleFocusMode = () => updatePreferences({ focusMode: !focusMode });

  const handlePanelResize = useCallback((sizes: number[]) => {
    updatePreferences({ panelSizes: sizes });
  }, [updatePreferences]);

  const bibFile = useMemo(() => files.find((f) => f.path.endsWith(".bib")), [files]);
  const bibContent = bibFile?.content || "";

  // Get current file content for analysis (updated when content changes)
  const currentFileContent = useMemo(() => {
    // Use the current content state which reflects unsaved changes
    return content;
  }, [content]);

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

  const handleExportPdf = async () => {
    setIsBuilding(true);
    setBuildError(null);
    try {
      const response = await fetch(`/api/projects/${project.id}/build`, {
        method: "POST",
      });
      const data = await response.json();
      if (response.ok && data.pdfUrl) {
        setPdfUrl(data.pdfUrl);
        // Trigger download
        const link = document.createElement("a");
        link.href = data.pdfUrl;
        link.download = `${project.name || "thesis"}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
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
      <div className="flex h-[calc(100vh-3rem)] items-center justify-center bg-background">
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
    <div className={cn(
      "h-[calc(100vh-3rem)] flex",
      focusMode && "focus-mode",
      isMobile && "pb-16" // Padding for mobile bottom nav
    )}>
      {/* Sidebar - Section Navigation (Desktop only) */}
      {showSidebar && !isMobile && (
        <div
          className={cn(
            "h-full bg-sidebar border-r border-sidebar-border/50 flex-shrink-0 transition-all duration-200 relative",
            sidebarCollapsed ? "w-14 overflow-visible" : "w-56 overflow-hidden"
          )}
        >
          <SectionNav
            projectName={project.name}
            projectUniversity={project.university || undefined}
            projectTitle={project.title || undefined}
            projectAuthor={project.author || undefined}
            files={files}
            selectedFile={selectedFile}
            onFileSelect={(file) => {
              handleFileSelect(file);
              // Auto-collapse after selecting a section
              if (!sidebarCollapsed) {
                updatePreferences({ sidebarCollapsed: true });
              }
            }}
            projectId={project.id}
            isCollapsed={sidebarCollapsed}
            onToggleCollapse={toggleSidebarCollapse}
            onFileCreated={(file) => {
              setFiles((prev) => [...prev, file]);
              // Auto-collapse after creating a section
              if (!sidebarCollapsed) {
                updatePreferences({ sidebarCollapsed: true });
              }
            }}
          />
        </div>
      )}

      {/* Main Content Area */}
      <ResizablePanelGroup
        direction="horizontal"
        className="h-full overflow-hidden flex-1"
        onLayout={handlePanelResize}
        style={{ overflow: 'hidden' }}
      >
        {/* Main Editor Area */}
        <ResizablePanel
          defaultSize={showAdvisorPanel ? (preferences.panelSizes[1] || 55) : 85}
          minSize={30}
        >
          <div className="h-full flex flex-col bg-background">
            {/* Toolbar */}
            <div className="border-b border-border/30 bg-card/50 px-2 py-1.5 flex flex-wrap items-center gap-1">
              {/* Mobile: Show menu button for files */}
              {isMobile && (
                <Button variant="ghost" size="sm" onClick={() => setMobileFilesOpen(true)} className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground flex-shrink-0" title="Seções">
                  <Icons.menu className="h-3.5 w-3.5" />
                </Button>
              )}

              {/* Editing tools - wraps when needed */}
              <EditorToolbar onInsert={(text) => setContent((prev) => prev + text)} onUndo={handleUndo} onRedo={handleRedo} />

              <div className="h-4 w-px bg-border/30 mx-1 flex-shrink-0" />
              <BibliographyEditor bibContent={bibContent} onSave={handleSaveBibliography} />

              {/* Spacer */}
              <div className="flex-1 min-w-4" />

              {/* Right: Actions */}
              <div className="flex items-center gap-0.5 flex-shrink-0">
                {/* Save button */}
                <Button variant="ghost" size="sm" onClick={handleSave} disabled={isSaving} className="h-7 px-2 gap-1.5 text-muted-foreground hover:text-foreground hidden sm:flex" title="Salvar">
                  {isSaving ? <Icons.loader2 className="h-3.5 w-3.5 animate-spin" /> : <Icons.save className="h-3.5 w-3.5" />}
                  <span className="hidden lg:inline text-xs">Salvar</span>
                </Button>

                {/* Export PDF */}
                <Button variant="default" size="sm" onClick={handleExportPdf} disabled={isBuilding} className="h-7 px-2.5 gap-1.5 hidden sm:flex" title="Exportar PDF">
                  {isBuilding ? <Icons.loader2 className="h-3.5 w-3.5 animate-spin" /> : <Icons.fileDown className="h-3.5 w-3.5" />}
                  <span className="hidden md:inline text-xs">PDF</span>
                </Button>

                <div className="h-4 w-px bg-border/30 mx-1 hidden lg:block" />

                {/* Preview toggle */}
                <Button variant="ghost" size="sm" onClick={togglePdfPanel} className={cn("h-7 w-7 p-0 text-muted-foreground hover:text-foreground hidden lg:flex", showPdfPanel && "bg-muted text-foreground")} title="Preview">
                  {showPdfPanel ? <Icons.eyeOff className="h-3.5 w-3.5" /> : <Icons.eye className="h-3.5 w-3.5" />}
                </Button>

                {/* AI Advisor toggle */}
                <Button variant="ghost" size="sm" onClick={() => isMobile ? setMobileAdvisorOpen(true) : toggleAdvisorPanel()} className={cn("h-7 w-7 p-0 text-muted-foreground hover:text-foreground hidden sm:flex", showAdvisorPanel && "bg-muted text-advisor")} title="IA">
                  <Icons.sparkles className="h-3.5 w-3.5" />
                </Button>

                {/* Focus mode */}
                <Button variant="ghost" size="sm" onClick={toggleFocusMode} className={cn("h-7 w-7 p-0 text-muted-foreground hover:text-foreground hidden lg:flex", focusMode && "bg-muted text-foreground")} title="Foco">
                  {focusMode ? <Icons.minimize2 className="h-3.5 w-3.5" /> : <Icons.maximize2 className="h-3.5 w-3.5" />}
                </Button>
              </div>
            </div>

            {/* Editor & Preview Split - Stack on mobile, side by side on desktop */}
            <div className="flex-1 flex flex-col sm:flex-row overflow-hidden">
              {/* Editor Panel */}
              <div className={cn(
                "flex-1 h-full min-h-0 flex flex-col",
                showPdfPanel && "sm:border-r border-border",
                showPdfPanel && "max-h-[60%] sm:max-h-full"
              )}>
                <MarkdownEditor
                  key={`editor-${selectedFile?.path || selectedFile?.id || "no-file"}`}
                  ref={editorRef}
                  value={content}
                  onChange={setContent}
                  filename={selectedFile?.name || ""}
                  bibContent={bibContent}
                />
              </div>

              {/* Preview Panel */}
              {showPdfPanel && (
                <div className="w-full h-[40%] sm:h-full sm:w-[45%] sm:min-w-[300px] bg-muted/30 p-2 sm:p-4 overflow-auto border-t sm:border-t-0 border-border">
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
                            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground">
                              <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                              <circle cx="12" cy="12" r="3" />
                            </svg>
                          </div>
                          <p className="font-medium mb-1">Preview do PDF</p>
                          <p className="text-sm text-muted-foreground mb-4">
                            Clique para visualizar seu documento
                          </p>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleBuild}
                          >
                            <Icons.eye className="w-4 h-4 mr-2" />
                            Atualizar Preview
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

        {/* AI Advisor Panel - Desktop only */}
        {showAdvisorPanel && !isMobile && (
          <>
            <ResizableHandle withHandle className="bg-border hover:bg-primary/50 transition-colors" />

            <ResizablePanel
              defaultSize={preferences.panelSizes[2] || 30}
              minSize={20}
              maxSize={40}
              className="min-w-0 overflow-hidden"
            >
              <div className="h-full w-full min-w-0 overflow-hidden">
                <AIAdvisor
                  key={`advisor-${selectedFile?.id || "no-file"}`}
                  content={currentFileContent}
                  fileName={selectedFile?.name || ""}
                  onScrollToLine={handleScrollToLine}
                />
              </div>
            </ResizablePanel>
          </>
        )}
      </ResizablePanelGroup>

      {/* Mobile Bottom Navigation */}
      {isMobile && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border px-2 py-2 safe-area-bottom">
          <div className="flex items-center justify-around max-w-md mx-auto">
            <button
              onClick={() => setMobileFilesOpen(true)}
              className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-muted transition-colors"
            >
              <Icons.folder className="h-5 w-5 text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground">Arquivos</span>
            </button>

            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-muted transition-colors"
            >
              {isSaving ? (
                <Icons.loader2 className="h-5 w-5 text-muted-foreground animate-spin" />
              ) : (
                <Icons.save className="h-5 w-5 text-muted-foreground" />
              )}
              <span className="text-[10px] text-muted-foreground">Salvar</span>
            </button>

            <button
              onClick={handleExportPdf}
              disabled={isBuilding}
              className="flex flex-col items-center gap-1 p-3 -mt-4 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/25"
            >
              {isBuilding ? (
                <Icons.loader2 className="h-6 w-6 animate-spin" />
              ) : (
                <Icons.fileDown className="h-6 w-6" />
              )}
            </button>

            <button
              onClick={() => updatePreferences({ showPdfPanel: !showPdfPanel })}
              className={cn(
                "flex flex-col items-center gap-1 p-2 rounded-lg transition-colors",
                showPdfPanel ? "bg-muted" : "hover:bg-muted"
              )}
            >
              <Icons.eye className="h-5 w-5 text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground">Preview</span>
            </button>

            <button
              onClick={() => setMobileAdvisorOpen(true)}
              className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-muted transition-colors relative"
            >
              <Icons.bot className="h-5 w-5 text-advisor" />
              <span className="text-[10px] text-muted-foreground">IA</span>
              <span className="absolute top-1 right-1 w-2 h-2 bg-advisor rounded-full" />
            </button>
          </div>
        </div>
      )}

      {/* Mobile Sections Sheet */}
      <Sheet open={mobileFilesOpen} onOpenChange={setMobileFilesOpen}>
        <SheetContent side="left" className="w-[85%] max-w-xs p-0">
          <SectionNav
            projectName={project.name}
            projectUniversity={project.university || undefined}
            projectTitle={project.title || undefined}
            projectAuthor={project.author || undefined}
            files={files}
            selectedFile={selectedFile}
            onFileSelect={(file) => {
              handleFileSelect(file);
              setMobileFilesOpen(false);
            }}
            projectId={project.id}
            isCollapsed={false}
            onToggleCollapse={() => setMobileFilesOpen(false)}
            onFileCreated={(file) => setFiles((prev) => [...prev, file])}
          />
        </SheetContent>
      </Sheet>

      {/* Mobile AI Advisor Sheet */}
      <Sheet open={mobileAdvisorOpen} onOpenChange={setMobileAdvisorOpen}>
        <SheetContent side="bottom" className="h-[85vh] p-0">
          <div className="h-full flex flex-col">
            {/* Handle bar for drag */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 bg-muted-foreground/30 rounded-full" />
            </div>

            {/* Close button */}
            <button
              onClick={() => setMobileAdvisorOpen(false)}
              className="absolute top-3 right-4 p-1.5 rounded-lg hover:bg-muted z-10"
            >
              <Icons.x className="h-5 w-5" />
            </button>

            {/* AI Advisor Content */}
            <div className="flex-1 overflow-hidden">
              <AIAdvisor
                key={`mobile-advisor-${selectedFile?.id || "no-file"}`}
                content={currentFileContent}
                fileName={selectedFile?.name || ""}
                onScrollToLine={(lineNumber) => {
                  setMobileAdvisorOpen(false);
                  handleScrollToLine(lineNumber);
                }}
              />
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
