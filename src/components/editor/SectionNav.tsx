"use client";

import React, { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import type { ProjectFile } from "@prisma/client";
import type { SectionType } from "@/types/thesis-analysis";
import { SECTION_LABELS } from "@/types/thesis-analysis";

// SVG Icons
const Icons = {
  abstract: (props: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={props.className}>
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" x2="8" y1="13" y2="13" />
      <line x1="16" x2="8" y1="17" y2="17" />
    </svg>
  ),
  introduction: (props: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={props.className}>
      <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
    </svg>
  ),
  literatureReview: (props: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={props.className}>
      <path d="m16 6 4 14" />
      <path d="M12 6v14" />
      <path d="M8 8v12" />
      <path d="M4 4v16" />
    </svg>
  ),
  methodology: (props: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={props.className}>
      <path d="M10 2v7.527a2 2 0 0 1-.211.896L4.72 20.55a1 1 0 0 0 .9 1.45h12.76a1 1 0 0 0 .9-1.45l-5.069-10.127A2 2 0 0 1 14 9.527V2" />
      <path d="M8.5 2h7" />
      <path d="M7 16h10" />
    </svg>
  ),
  results: (props: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={props.className}>
      <line x1="12" x2="12" y1="20" y2="10" />
      <line x1="18" x2="18" y1="20" y2="4" />
      <line x1="6" x2="6" y1="20" y2="16" />
    </svg>
  ),
  discussion: (props: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={props.className}>
      <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
    </svg>
  ),
  conclusion: (props: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={props.className}>
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  ),
  references: (props: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={props.className}>
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  ),
  menu: (props: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={props.className}>
      <line x1="4" x2="20" y1="12" y2="12" />
      <line x1="4" x2="20" y1="6" y2="6" />
      <line x1="4" x2="20" y1="18" y2="18" />
    </svg>
  ),
  panelLeftClose: (props: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={props.className}>
      <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
      <line x1="9" x2="9" y1="3" y2="21" />
      <path d="m16 15-3-3 3-3" />
    </svg>
  ),
  plus: (props: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={props.className}>
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </svg>
  ),
  loader: (props: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={cn("animate-spin", props.className)}>
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  ),
  settings: (props: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={props.className}>
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
};

// Section configuration with hex colors for dynamic styling
const SECTION_CONFIG: Record<SectionType, {
  icon: (props: { className?: string }) => React.ReactElement;
  color: string;
  hexColor: string;
  bgSelected: string;
}> = {
  title: { icon: Icons.abstract, color: "text-slate-400", hexColor: "#94a3b8", bgSelected: "bg-slate-500/20" },
  abstract: { icon: Icons.abstract, color: "text-purple-400", hexColor: "#c084fc", bgSelected: "bg-purple-500/20" },
  introduction: { icon: Icons.introduction, color: "text-blue-400", hexColor: "#60a5fa", bgSelected: "bg-blue-500/20" },
  "literature-review": { icon: Icons.literatureReview, color: "text-cyan-400", hexColor: "#22d3ee", bgSelected: "bg-cyan-500/20" },
  methodology: { icon: Icons.methodology, color: "text-emerald-400", hexColor: "#34d399", bgSelected: "bg-emerald-500/20" },
  results: { icon: Icons.results, color: "text-yellow-400", hexColor: "#facc15", bgSelected: "bg-yellow-500/20" },
  discussion: { icon: Icons.discussion, color: "text-orange-400", hexColor: "#fb923c", bgSelected: "bg-orange-500/20" },
  conclusion: { icon: Icons.conclusion, color: "text-red-400", hexColor: "#f87171", bgSelected: "bg-red-500/20" },
  references: { icon: Icons.references, color: "text-pink-400", hexColor: "#f472b6", bgSelected: "bg-pink-500/20" },
};

const SECTION_ORDER: SectionType[] = [
  "abstract",
  "introduction",
  "literature-review",
  "methodology",
  "results",
  "discussion",
  "conclusion",
  "references",
];

interface SectionNavProps {
  projectName: string;
  projectUniversity?: string;
  projectTitle?: string;
  projectAuthor?: string;
  files: ProjectFile[];
  selectedFile: ProjectFile | null;
  onFileSelect: (file: ProjectFile) => void;
  projectId: string;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onFileCreated: (file: ProjectFile) => void;
}

export function SectionNav({
  projectName,
  projectUniversity,
  projectTitle,
  projectAuthor,
  files,
  selectedFile,
  onFileSelect,
  projectId,
  isCollapsed,
  onToggleCollapse,
  onFileCreated,
}: SectionNavProps) {
  const [creatingSection, setCreatingSection] = useState<SectionType | null>(null);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showMetadata, setShowMetadata] = useState(false);

  // Map sections to files
  const sectionFiles = useMemo(() => {
    const map = new Map<SectionType, ProjectFile>();
    for (const file of files) {
      const section = file.section as SectionType;
      if (section && SECTION_ORDER.includes(section) && !map.has(section)) {
        map.set(section, file);
      }
    }
    return map;
  }, [files]);

  const selectedSection = selectedFile?.section as SectionType | null;
  const existingSections = new Set(sectionFiles.keys());
  const availableSections = SECTION_ORDER.filter(s => !existingSections.has(s));

  // Create section file
  const createSection = async (sectionType: SectionType) => {
    if (creatingSection) return;

    setCreatingSection(sectionType);
    setShowAddMenu(false);

    try {
      const label = SECTION_LABELS[sectionType];
      const fileName = `${label.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "-")}.md`;

      const templates: Record<SectionType, string> = {
        title: `# ${projectName}\n\n`,
        abstract: `# ${label}\n\nResuma aqui os principais pontos do seu trabalho...\n`,
        introduction: `# ${label}\n\n## Contexto\n\n## Problema de Pesquisa\n\n## Objetivos\n\n`,
        "literature-review": `# ${label}\n\n## Conceitos Fundamentais\n\n## Trabalhos Relacionados\n\n`,
        methodology: `# ${label}\n\n## Tipo de Pesquisa\n\n## Participantes\n\n## Instrumentos\n\n`,
        results: `# ${label}\n\n## Dados Coletados\n\n## Análise\n\n`,
        discussion: `# ${label}\n\n## Interpretação dos Resultados\n\n## Limitações\n\n`,
        conclusion: `# ${label}\n\n## Síntese\n\n## Contribuições\n\n## Trabalhos Futuros\n\n`,
        references: `# ${label}\n\nReferências gerenciadas automaticamente.\n`,
      };

      const response = await fetch(`/api/projects/${projectId}/files`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: `chapters/${fileName}`,
          name: fileName,
          content: templates[sectionType],
          section: sectionType,
          type: "MARKDOWN",
        }),
      });

      if (response.ok) {
        const { file } = await response.json();
        onFileCreated(file);
        onFileSelect(file);
      }
    } catch (error) {
      console.error("Error creating section:", error);
    } finally {
      setCreatingSection(null);
    }
  };

  // Handle section click
  const handleClick = (sectionType: SectionType) => {
    const file = sectionFiles.get(sectionType);
    if (file) {
      onFileSelect(file);
    } else {
      createSection(sectionType);
    }
  };

  // Collapsed view - just icons
  if (isCollapsed) {
    return (
      <div className="h-full flex flex-col py-2">
        {/* Toggle button */}
        <button
          type="button"
          onClick={onToggleCollapse}
          className="mx-auto mb-4 w-10 h-10 flex items-center justify-center rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-all"
        >
          <Icons.menu />
        </button>

        {/* Section icons */}
        <div className="flex-1 flex flex-col items-center gap-1">
          {SECTION_ORDER.map((sectionType) => {
            const config = SECTION_CONFIG[sectionType];
            const exists = existingSections.has(sectionType);
            const isSelected = selectedSection === sectionType;
            const isCreating = creatingSection === sectionType;
            const Icon = config.icon;

            return (
              <div key={sectionType} className="relative group">
                {/* Icon button - fixed size */}
                <button
                  type="button"
                  onClick={() => handleClick(sectionType)}
                  disabled={isCreating}
                  className={cn(
                    "w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-200",
                    isSelected ? "" : "hover:bg-white/10",
                    !exists && "opacity-40 hover:opacity-100"
                  )}
                  style={{
                    backgroundColor: isSelected ? config.hexColor : undefined,
                  }}
                >
                  {isCreating ? (
                    <Icons.loader className="text-white/60" />
                  ) : (
                    <Icon className={cn(
                      "transition-colors duration-200",
                      isSelected ? "text-white" : "text-white/40 group-hover:text-white"
                    )} />
                  )}
                </button>

                {/* Label tooltip - appears to the right */}
                <div
                  className={cn(
                    "absolute left-full top-1/2 -translate-y-1/2 ml-2 px-3 py-1.5 rounded-lg",
                    "text-sm font-medium whitespace-nowrap",
                    "bg-[#1a1a2e]/95 backdrop-blur-md border border-white/10",
                    "shadow-lg shadow-black/20",
                    "opacity-0 scale-95 pointer-events-none",
                    "group-hover:opacity-100 group-hover:scale-100",
                    "transition-all duration-200 z-50"
                  )}
                  style={{ color: config.hexColor }}
                >
                  {SECTION_LABELS[sectionType]}
                </div>
              </div>
            );
          })}
        </div>

        {/* Metadata button */}
        <div className="relative group mt-2">
          <button
            type="button"
            onClick={() => setShowMetadata(!showMetadata)}
            className={cn(
              "w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-200",
              showMetadata ? "bg-white/10 text-white" : "text-white/40 hover:text-white hover:bg-white/10"
            )}
            title="Metadados"
          >
            <Icons.settings className="w-5 h-5" />
          </button>

          {/* Tooltip */}
          <div
            className={cn(
              "absolute left-full top-1/2 -translate-y-1/2 ml-2 px-3 py-1.5 rounded-lg",
              "text-sm font-medium text-white/80 whitespace-nowrap",
              "bg-[#1a1a2e]/95 backdrop-blur-md border border-white/10",
              "shadow-lg shadow-black/20",
              "opacity-0 scale-95 pointer-events-none",
              "group-hover:opacity-100 group-hover:scale-100",
              "transition-all duration-200 z-50"
            )}
          >
            Metadados
          </div>
        </div>

        {/* Add button */}
        {availableSections.length > 0 && (
          <button
            type="button"
            onClick={onToggleCollapse}
            className="mx-auto mt-2 w-10 h-10 flex items-center justify-center rounded-lg text-white/40 hover:text-white/70 hover:bg-white/10 transition-all border border-dashed border-white/20"
          >
            <Icons.plus />
          </button>
        )}
      </div>
    );
  }

  // Expanded view
  return (
    <div className="h-full flex flex-col">
      {/* Header - just collapse button */}
      <div className="p-2 flex justify-end">
        <button
          type="button"
          onClick={onToggleCollapse}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-all"
          title="Recolher menu"
        >
          <Icons.panelLeftClose className="w-4 h-4" />
        </button>
      </div>

      {/* Section list */}
      <div className="flex-1 p-2 overflow-y-auto">
        <div className="space-y-1">
          {SECTION_ORDER.map((sectionType) => {
            const config = SECTION_CONFIG[sectionType];
            const exists = existingSections.has(sectionType);
            const isSelected = selectedSection === sectionType;
            const isCreating = creatingSection === sectionType;
            const Icon = config.icon;

            return (
              <button
                type="button"
                key={sectionType}
                onClick={() => handleClick(sectionType)}
                disabled={isCreating}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left",
                  isSelected && cn("ring-1 ring-white/20", config.bgSelected),
                  !isSelected && exists && "hover:bg-white/5",
                  !exists && "opacity-50 hover:opacity-80 hover:bg-white/5"
                )}
              >
                <div className={cn(
                  "w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0",
                  isSelected ? config.bgSelected : "bg-white/5"
                )}>
                  {isCreating ? (
                    <Icons.loader className="text-white/60" />
                  ) : (
                    <Icon className={isSelected ? config.color : "text-white/50"} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <span className={cn(
                    "text-sm font-medium block truncate",
                    isSelected ? "text-white" : "text-white/70"
                  )}>
                    {SECTION_LABELS[sectionType]}
                  </span>
                  {!exists && (
                    <span className="text-[10px] text-white/40">Clique para criar</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Metadata button */}
      <div className="px-2 py-2 border-t border-white/10">
        <button
          type="button"
          onClick={() => setShowMetadata(!showMetadata)}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left",
            showMetadata
              ? "bg-white/10 text-white"
              : "text-white/60 hover:bg-white/5 hover:text-white/80"
          )}
        >
          <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-white/5">
            <Icons.settings className="w-5 h-5 text-white/50" />
          </div>
          <span className="text-sm font-medium">Metadados</span>
        </button>
      </div>

      {/* Metadata panel */}
      {showMetadata && (
        <div className="px-3 py-3 border-t border-white/10 space-y-3 bg-white/[0.02]">
          <div className="space-y-1">
            <label className="text-[10px] uppercase tracking-wider text-white/40">Título</label>
            <p className="text-sm text-white/80 truncate">{projectTitle || "Não definido"}</p>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] uppercase tracking-wider text-white/40">Autor</label>
            <p className="text-sm text-white/80 truncate">{projectAuthor || "Não definido"}</p>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] uppercase tracking-wider text-white/40">Universidade</label>
            <p className="text-sm text-white/80 truncate">{projectUniversity || "Não definido"}</p>
          </div>
        </div>
      )}

      {/* Add section */}
      {availableSections.length > 0 && (
        <div className="p-3 border-t border-white/10 relative">
          <button
            type="button"
            onClick={() => setShowAddMenu(!showAddMenu)}
            className={cn(
              "w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all",
              showAddMenu
                ? "bg-violet-500/20 text-violet-300 ring-1 ring-violet-500/30"
                : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white/80"
            )}
          >
            <Icons.plus className="w-5 h-5" />
            Adicionar Seção
          </button>

          {/* Dropdown */}
          {showAddMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowAddMenu(false)} />
              <div className="absolute bottom-full left-3 right-3 mb-2 bg-[#1c2128] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50">
                {availableSections.map((sectionType) => {
                  const config = SECTION_CONFIG[sectionType];
                  const Icon = config.icon;
                  return (
                    <button
                      type="button"
                      key={sectionType}
                      onClick={() => createSection(sectionType)}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/5 transition-colors"
                    >
                      <Icon className={config.color} />
                      <span className="text-sm text-white/80">{SECTION_LABELS[sectionType]}</span>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
