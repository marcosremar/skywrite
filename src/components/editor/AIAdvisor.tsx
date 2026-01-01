"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useRules, useReferenceFiles, type Rule as DbRule } from "@/hooks/useRules";

// Minimal SF-style Icons
const Icons = {
  sparkles: (props: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="currentColor" className={props.className}>
      <path d="M12 0L13.59 6.41L20 8L13.59 9.59L12 16L10.41 9.59L4 8L10.41 6.41L12 0Z" />
      <path d="M6 12L6.79 14.21L9 15L6.79 15.79L6 18L5.21 15.79L3 15L5.21 14.21L6 12Z" opacity="0.7" />
      <path d="M18 14L18.53 15.47L20 16L18.53 16.53L18 18L17.47 16.53L16 16L17.47 15.47L18 14Z" opacity="0.7" />
    </svg>
  ),
  checkCircle: (props: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={props.className}>
      <circle cx="12" cy="12" r="10" opacity="0.2" fill="currentColor" /><path d="m9 12 2 2 4-4" />
    </svg>
  ),
  alertTriangle: (props: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={props.className}>
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" opacity="0.2" fill="currentColor" /><path d="M12 9v4" /><path d="M12 17h.01" />
    </svg>
  ),
  chevronRight: (props: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={props.className}>
      <path d="m9 18 6-6-6-6" />
    </svg>
  ),
  chevronLeft: (props: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={props.className}>
      <path d="m15 18-6-6 6-6" />
    </svg>
  ),
  spinner: (props: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={props.className}>
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  ),
  doc: (props: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={props.className}>
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" /><polyline points="14 2 14 8 20 8" />
    </svg>
  ),
  sliders: (props: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={props.className}>
      <line x1="4" x2="4" y1="21" y2="14" /><line x1="4" x2="4" y1="10" y2="3" /><line x1="12" x2="12" y1="21" y2="12" /><line x1="12" x2="12" y1="8" y2="3" /><line x1="20" x2="20" y1="21" y2="16" /><line x1="20" x2="20" y1="12" y2="3" /><line x1="2" x2="6" y1="14" y2="14" /><line x1="10" x2="14" y1="8" y2="8" /><line x1="18" x2="22" y1="16" y2="16" />
    </svg>
  ),
  message: (props: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={props.className}>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  ),
  send: (props: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className={props.className}>
      <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
    </svg>
  ),
  plus: (props: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={props.className}>
      <path d="M5 12h14" /><path d="M12 5v14" />
    </svg>
  ),
  trash: (props: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={props.className}>
      <path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
    </svg>
  ),
  upload: (props: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={props.className}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" x2="12" y1="3" y2="15" />
    </svg>
  ),
  file: (props: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={props.className}>
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" /><polyline points="14 2 14 8 20 8" />
    </svg>
  ),
  shield: (props: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={props.className}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
    </svg>
  ),
  user: (props: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={props.className}>
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
    </svg>
  ),
  link: (props: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={props.className}>
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  ),
};

import type {
  ThesisAnalysis,
  SectionFeedback,
  SectionType,
  Rule,
} from "@/types/thesis-analysis";
import {
  getScoreLabel,
  getScoreColor,
  SECTION_LABELS,
} from "@/types/thesis-analysis";
import { analyzeThesis } from "@/lib/thesis-analysis";

interface AIAdvisorProps {
  content: string;
  fileName?: string;
  className?: string;
}

type TabType = "overview" | "sections" | "rules" | "chat";

export function AIAdvisor({ content, fileName, className }: AIAdvisorProps) {
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [expandedSections, setExpandedSections] = useState<Set<SectionType>>(new Set());
  const [analysis, setAnalysis] = useState<ThesisAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [pendingUpdate, setPendingUpdate] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const lastContentRef = useRef<string>("");

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!content || content.trim().length < 50) {
      setAnalysis(null);
      setIsAnalyzing(false);
      setPendingUpdate(false);
      return;
    }

    if (content === lastContentRef.current) return;

    setPendingUpdate(true);

    debounceRef.current = setTimeout(() => {
      setIsAnalyzing(true);
      setPendingUpdate(false);

      requestAnimationFrame(() => {
        const result = analyzeThesis(content);
        lastContentRef.current = content;
        setAnalysis(result);
        setIsAnalyzing(false);
      });
    }, 3000);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [content]);

  useEffect(() => {
    if (content && content.trim().length >= 50 && !analysis) {
      const result = analyzeThesis(content);
      lastContentRef.current = content;
      setAnalysis(result);
    }
  }, []);

  const toggleSection = (section: SectionType) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
  };

  const tabs: { id: TabType; label: string }[] = [
    { id: "overview", label: "Visao Geral" },
    { id: "sections", label: "Secoes" },
    { id: "rules", label: "Regras" },
    { id: "chat", label: "Chat" },
  ];

  return (
    <div className={cn(
      "flex flex-col h-full",
      "bg-[#1a1a1a]/95 backdrop-blur-xl",
      "border-l border-white/[0.06]",
      className
    )}>
      {/* macOS-style Titlebar */}
      <div className="flex-shrink-0 px-4 pt-3 pb-2">
        {/* Title row */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-gradient-to-b from-[#6366f1] to-[#4f46e5] flex items-center justify-center shadow-sm">
              <Icons.sparkles className="text-white" />
            </div>
            <div>
              <h1 className="text-[13px] font-semibold text-white/90 tracking-[-0.01em]">
                Orientador
              </h1>
            </div>
          </div>

          {/* Score indicator */}
          {analysis && (
            <div className="flex items-center gap-2">
              {pendingUpdate && (
                <div className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
              )}
              <div className={cn(
                "px-2 py-0.5 rounded-md text-[11px] font-medium",
                "bg-white/[0.06] backdrop-blur",
                analysis.overallScore >= 70 ? "text-green-400" :
                analysis.overallScore >= 50 ? "text-yellow-400" : "text-red-400"
              )}>
                {analysis.overallScore}%
              </div>
            </div>
          )}

          {isAnalyzing && !analysis && (
            <Icons.spinner className="w-4 h-4 text-white/40 animate-spin" />
          )}
        </div>

        {/* Segmented Control - macOS style */}
        <div className="flex p-0.5 rounded-lg bg-white/[0.06] backdrop-blur">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex-1 px-2 py-1.5 text-[11px] font-medium rounded-md transition-all duration-150",
                activeTab === tab.id
                  ? "bg-white/[0.12] text-white shadow-sm"
                  : "text-white/50 hover:text-white/70"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="px-4 py-3">
          {activeTab === "overview" && (
            !analysis && isAnalyzing ? <LoadingState /> :
            !analysis ? <EmptyState /> :
            <OverviewTab analysis={analysis} />
          )}
          {activeTab === "sections" && (
            !analysis && isAnalyzing ? <LoadingState /> :
            !analysis ? <EmptyState /> :
            <SectionsTab
              sections={analysis.sections}
              expandedSections={expandedSections}
              onToggle={toggleSection}
            />
          )}
          {activeTab === "rules" && <RulesTab />}
          {activeTab === "chat" && <ChatTab />}
        </div>
      </ScrollArea>

      {/* Status bar */}
      {analysis && (
        <div className="flex-shrink-0 px-4 py-2 border-t border-white/[0.06]">
          <div className="flex items-center justify-between text-[10px] text-white/30">
            <span>{analysis.sections.length} secoes analisadas</span>
            <span>{getScoreLabel(analysis.overallScore)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <Icons.spinner className="w-6 h-6 text-white/30 animate-spin mb-3" />
      <p className="text-[12px] text-white/40">Analisando...</p>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="w-10 h-10 rounded-xl bg-white/[0.04] flex items-center justify-center mb-3">
        <Icons.sparkles className="text-white/30" />
      </div>
      <p className="text-[12px] text-white/50 mb-1">Orientador Virtual</p>
      <p className="text-[11px] text-white/30 max-w-[180px]">
        Comece a escrever para receber feedback
      </p>
    </div>
  );
}

function OverviewTab({ analysis }: { analysis: ThesisAnalysis }) {
  return (
    <div className="space-y-4">
      {/* Score Card */}
      <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.04]">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-medium text-white/50 uppercase tracking-wider">
            Pontuacao
          </span>
          <span className={cn(
            "text-[22px] font-semibold tracking-tight",
            analysis.overallScore >= 70 ? "text-green-400" :
            analysis.overallScore >= 50 ? "text-yellow-400" : "text-red-400"
          )}>
            {analysis.overallScore}
          </span>
        </div>

        {/* Progress bar */}
        <div className="h-1 rounded-full bg-white/[0.06] overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-700 ease-out",
              analysis.overallScore >= 70 ? "bg-green-500" :
              analysis.overallScore >= 50 ? "bg-yellow-500" : "bg-red-500"
            )}
            style={{ width: `${analysis.overallScore}%` }}
          />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-2">
        <div className="p-3 rounded-xl bg-green-500/[0.08] border border-green-500/10">
          <div className="flex items-center gap-1.5 mb-1">
            <Icons.checkCircle className="text-green-400" />
            <span className="text-[10px] font-medium text-green-400/80 uppercase tracking-wider">
              Fortes
            </span>
          </div>
          <p className="text-[18px] font-semibold text-green-400">
            {analysis.summary.strongPoints.length}
          </p>
        </div>

        <div className="p-3 rounded-xl bg-yellow-500/[0.08] border border-yellow-500/10">
          <div className="flex items-center gap-1.5 mb-1">
            <Icons.alertTriangle className="text-yellow-400" />
            <span className="text-[10px] font-medium text-yellow-400/80 uppercase tracking-wider">
              Melhorar
            </span>
          </div>
          <p className="text-[18px] font-semibold text-yellow-400">
            {analysis.summary.improvementAreas.length}
          </p>
        </div>
      </div>

      {/* Strong Points */}
      {analysis.summary.strongPoints.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-[11px] font-medium text-white/40 uppercase tracking-wider px-1">
            Pontos Fortes
          </h3>
          <div className="space-y-1">
            {analysis.summary.strongPoints.map((point, i) => (
              <div
                key={i}
                className="flex items-start gap-2 p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.04]"
              >
                <div className="w-1 h-1 rounded-full bg-green-400 mt-1.5 flex-shrink-0" />
                <p className="text-[12px] text-white/60 leading-relaxed">{point}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Improvement Areas */}
      {analysis.summary.improvementAreas.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-[11px] font-medium text-white/40 uppercase tracking-wider px-1">
            A Melhorar
          </h3>
          <div className="space-y-1">
            {analysis.summary.improvementAreas.map((area, i) => (
              <div
                key={i}
                className="flex items-start gap-2 p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.04]"
              >
                <div className="w-1 h-1 rounded-full bg-yellow-400 mt-1.5 flex-shrink-0" />
                <p className="text-[12px] text-white/60 leading-relaxed">{area}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Section Progress */}
      {analysis.sections.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-[11px] font-medium text-white/40 uppercase tracking-wider px-1">
            Por Secao
          </h3>
          <div className="space-y-1">
            {analysis.sections.map((section) => (
              <div
                key={section.section}
                className="flex items-center gap-3 p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.04]"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] text-white/70 truncate">{section.sectionLabel}</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-16 h-1 rounded-full bg-white/[0.06] overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full",
                        section.score >= 70 ? "bg-green-500" :
                        section.score >= 50 ? "bg-yellow-500" : "bg-red-500"
                      )}
                      style={{ width: `${section.score}%` }}
                    />
                  </div>
                  <span className={cn(
                    "text-[11px] font-medium w-8 text-right",
                    section.score >= 70 ? "text-green-400" :
                    section.score >= 50 ? "text-yellow-400" : "text-red-400"
                  )}>
                    {section.score}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SectionsTab({
  sections,
  expandedSections,
  onToggle
}: {
  sections: SectionFeedback[];
  expandedSections: Set<SectionType>;
  onToggle: (section: SectionType) => void;
}) {
  if (sections.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-10 h-10 rounded-xl bg-white/[0.04] flex items-center justify-center mb-3">
          <Icons.doc className="text-white/30" />
        </div>
        <p className="text-[12px] text-white/50 mb-1">Nenhuma secao</p>
        <p className="text-[11px] text-white/30">Use titulos # para criar secoes</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {sections.map((section) => {
        const isExpanded = expandedSections.has(section.section);

        return (
          <div
            key={section.section}
            className="rounded-lg bg-white/[0.02] border border-white/[0.04] overflow-hidden"
          >
            <button
              onClick={() => onToggle(section.section)}
              className="w-full flex items-center gap-2 p-3 hover:bg-white/[0.02] transition-colors"
            >
              <Icons.chevronRight className={cn(
                "text-white/30 transition-transform duration-200",
                isExpanded && "rotate-90"
              )} />
              <span className="flex-1 text-[12px] text-white/70 text-left truncate">
                {section.sectionLabel}
              </span>
              {section.priority === "high" && (
                <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-red-500/20 text-red-400">
                  !
                </span>
              )}
              <span className={cn(
                "text-[11px] font-medium",
                section.score >= 70 ? "text-green-400" :
                section.score >= 50 ? "text-yellow-400" : "text-red-400"
              )}>
                {section.score}%
              </span>
            </button>

            {isExpanded && (
              <div className="px-3 pb-3 space-y-3 border-t border-white/[0.04]">
                {section.strengths.length > 0 && (
                  <div className="pt-2">
                    <p className="text-[10px] font-medium text-green-400/70 uppercase tracking-wider mb-1.5">
                      Pontos fortes
                    </p>
                    {section.strengths.map((s, i) => (
                      <p key={i} className="text-[11px] text-white/50 leading-relaxed py-0.5">
                        • {s}
                      </p>
                    ))}
                  </div>
                )}

                {section.weaknesses.length > 0 && (
                  <div>
                    <p className="text-[10px] font-medium text-yellow-400/70 uppercase tracking-wider mb-1.5">
                      A melhorar
                    </p>
                    {section.weaknesses.map((w, i) => (
                      <p key={i} className="text-[11px] text-white/50 leading-relaxed py-0.5">
                        • {w}
                      </p>
                    ))}
                  </div>
                )}

                {section.suggestions.length > 0 && (
                  <div>
                    <p className="text-[10px] font-medium text-blue-400/70 uppercase tracking-wider mb-1.5">
                      Sugestoes
                    </p>
                    {section.suggestions.map((s, i) => (
                      <div key={i} className="p-2 rounded-md bg-blue-500/[0.06] border border-blue-500/10 mb-1">
                        <p className="text-[11px] text-blue-300/80 leading-relaxed">{s}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function RulesTab() {
  const { rules, loading, toggleRule, createRule, deleteRule } = useRules();
  const { files, uploading, uploadFile, deleteFile, error: uploadError } = useReferenceFiles();
  const [activeSubTab, setActiveSubTab] = useState<"system" | "user" | "reference">("system");
  const [showForm, setShowForm] = useState(false);
  const [newRule, setNewRule] = useState({ name: "", pattern: "", category: "CONTENT", section: "" });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const systemRules = rules.filter(r => r.type === "SYSTEM");
  const userRules = rules.filter(r => r.type === "USER");
  const referenceRules = rules.filter(r => r.type === "REFERENCE");

  const handleAdd = async () => {
    if (!newRule.name || !newRule.pattern) return;
    try {
      await createRule({
        name: newRule.name,
        description: newRule.name,
        category: newRule.category,
        pattern: newRule.pattern,
        section: newRule.section || null,
        severity: "WARNING",
        weight: 1,
        isEnabled: true,
        referenceFile: null,
      });
      setNewRule({ name: "", pattern: "", category: "CONTENT", section: "" });
      setShowForm(false);
    } catch (err) {
      console.error("Failed to create rule:", err);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorMessage(null);
    try {
      await uploadFile(file);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to upload file";
      setErrorMessage(message);
      console.error("Failed to upload file:", message);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const subTabs = [
    { id: "system" as const, label: "Sistema", icon: <Icons.shield />, count: systemRules.length },
    { id: "user" as const, label: "Minhas", icon: <Icons.user />, count: userRules.length },
    { id: "reference" as const, label: "Referencia", icon: <Icons.link />, count: referenceRules.length },
  ];

  const currentRules = activeSubTab === "system" ? systemRules :
                       activeSubTab === "user" ? userRules : referenceRules;

  return (
    <div className="space-y-3">
      {/* Sub-tabs */}
      <div className="flex p-0.5 rounded-md bg-white/[0.04]">
        {subTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id)}
            className={cn(
              "flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-[10px] font-medium rounded transition-all",
              activeSubTab === tab.id
                ? "bg-white/[0.08] text-white"
                : "text-white/40 hover:text-white/60"
            )}
          >
            {tab.icon}
            <span>{tab.label}</span>
            <span className="ml-1 px-1 rounded bg-white/[0.06] text-[9px]">{tab.count}</span>
          </button>
        ))}
      </div>

      {/* Actions based on active tab */}
      {activeSubTab === "user" && (
        <button
          onClick={() => setShowForm(!showForm)}
          className="w-full flex items-center justify-center gap-1.5 p-2 rounded-lg bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.06] transition-colors text-[11px] text-white/50"
        >
          <Icons.plus className="text-white/40" />
          Nova Regra
        </button>
      )}

      {activeSubTab === "reference" && (
        <div className="space-y-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.md,.pdf,.docx"
            onChange={handleFileUpload}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="w-full flex items-center justify-center gap-1.5 p-2 rounded-lg bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.06] transition-colors text-[11px] text-white/50 disabled:opacity-50"
          >
            {uploading ? (
              <Icons.spinner className="text-white/40 animate-spin" />
            ) : (
              <Icons.upload className="text-white/40" />
            )}
            {uploading ? "Processando..." : "Enviar Arquivo de Referencia"}
          </button>

          {/* Error message */}
          {errorMessage && (
            <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-[11px] text-red-400">
              {errorMessage}
            </div>
          )}

          {/* Reference files list - compact */}
          {files.length > 0 && !selectedFile && (
            <div className="space-y-1">
              {files.map(file => (
                <div
                  key={file.id}
                  onClick={() => setSelectedFile(file.id)}
                  className="px-2 py-2 rounded bg-white/[0.02] hover:bg-white/[0.05] cursor-pointer group transition-colors"
                >
                  <div className="flex items-start gap-1.5">
                    <Icons.file className="text-white/30 flex-shrink-0 w-3 h-3 mt-0.5" />
                    <p
                      className="text-[10px] text-white/60 flex-1 leading-tight break-words"
                      style={{ wordBreak: 'break-word' }}
                    >
                      {file.originalName}
                    </p>
                  </div>
                  <div className="flex items-center justify-between mt-1 pl-4">
                    <span className="text-[9px] text-white/30">
                      {file._count?.rules ?? file.rules?.length ?? 0} regras
                    </span>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteFile(file.id); }}
                      className="opacity-0 group-hover:opacity-100 p-0.5 text-white/20 hover:text-red-400 transition-all"
                    >
                      <Icons.trash />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Selected file rules view */}
          {selectedFile && (
            <div className="space-y-2 overflow-hidden">
              <button
                onClick={() => setSelectedFile(null)}
                className="flex items-center gap-1 text-[10px] text-white/50 hover:text-white/80 transition-colors"
              >
                <Icons.chevronLeft />
                <span>Voltar</span>
              </button>

              {(() => {
                const file = files.find(f => f.id === selectedFile);
                const fileRules = referenceRules.filter(r => r.referenceFile?.id === selectedFile);

                return (
                  <div className="space-y-2">
                    <div className="px-2 py-2 rounded bg-white/[0.03] border border-white/[0.06]">
                      <p
                        className="text-[10px] text-white/60 leading-tight break-words"
                        style={{ wordBreak: 'break-word' }}
                      >
                        {file?.originalName}
                      </p>
                      <p className="text-[9px] text-white/30 mt-1">{fileRules.length} regras</p>
                    </div>

                    {fileRules.length === 0 ? (
                      <p className="text-[10px] text-white/30 text-center py-4">
                        Nenhuma regra extraida
                      </p>
                    ) : (
                      <div className="space-y-1 max-h-[200px] overflow-y-auto">
                        {fileRules.map(rule => (
                          <div
                            key={rule.id}
                            className="px-2 py-1.5 rounded bg-white/[0.02] group"
                          >
                            <div className="flex items-start gap-1.5">
                              <button
                                onClick={() => toggleRule(rule.id)}
                                className={`w-3 h-3 rounded-sm border flex-shrink-0 mt-0.5 transition-colors ${
                                  rule.isEnabled
                                    ? 'bg-emerald-500/80 border-emerald-400'
                                    : 'border-white/20 hover:border-white/40'
                                }`}
                              />
                              <p
                                className={`text-[10px] flex-1 leading-tight break-words ${
                                  rule.isEnabled ? 'text-white/70' : 'text-white/30'
                                }`}
                                style={{ wordBreak: 'break-word' }}
                              >
                                {rule.name}
                              </p>
                              <button
                                onClick={() => deleteRule(rule.id)}
                                className="opacity-0 group-hover:opacity-100 p-0.5 text-white/20 hover:text-red-400 transition-all flex-shrink-0"
                              >
                                <Icons.trash />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}

      {/* Add rule form */}
      {showForm && activeSubTab === "user" && (
        <div className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.06] space-y-2">
          <input
            type="text"
            value={newRule.name}
            onChange={(e) => setNewRule(p => ({ ...p, name: e.target.value }))}
            placeholder="Nome da regra"
            className="w-full px-2.5 py-1.5 text-[11px] rounded-md bg-white/[0.04] border border-white/[0.06] text-white/80 placeholder:text-white/30 focus:outline-none focus:border-white/20"
          />
          <input
            type="text"
            value={newRule.pattern}
            onChange={(e) => setNewRule(p => ({ ...p, pattern: e.target.value }))}
            placeholder="Palavras-chave (separadas por |)"
            className="w-full px-2.5 py-1.5 text-[11px] rounded-md bg-white/[0.04] border border-white/[0.06] text-white/80 placeholder:text-white/30 focus:outline-none focus:border-white/20"
          />
          <div className="grid grid-cols-2 gap-2">
            <select
              value={newRule.category}
              onChange={(e) => setNewRule(p => ({ ...p, category: e.target.value }))}
              className="w-full px-2.5 py-1.5 text-[11px] rounded-md bg-white/[0.04] border border-white/[0.06] text-white/80 focus:outline-none focus:border-white/20"
            >
              <option value="STRUCTURE">Estrutura</option>
              <option value="CONTENT">Conteudo</option>
              <option value="CITATION">Citacao</option>
              <option value="STYLE">Estilo</option>
              <option value="CUSTOM">Personalizado</option>
            </select>
            <select
              value={newRule.section}
              onChange={(e) => setNewRule(p => ({ ...p, section: e.target.value }))}
              className="w-full px-2.5 py-1.5 text-[11px] rounded-md bg-white/[0.04] border border-white/[0.06] text-white/80 focus:outline-none focus:border-white/20"
            >
              <option value="">Todas as secoes</option>
              {Object.entries(SECTION_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2 pt-1">
            <button
              onClick={handleAdd}
              className="flex-1 py-1.5 rounded-md bg-white/[0.08] text-[11px] font-medium text-white/70 hover:bg-white/[0.12] transition-colors"
            >
              Adicionar
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="px-3 py-1.5 rounded-md text-[11px] text-white/40 hover:text-white/60 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-8">
          <Icons.spinner className="w-5 h-5 text-white/30 animate-spin" />
        </div>
      )}

      {/* Rules list */}
      {!loading && (
        <div className="space-y-1">
          {currentRules.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-[11px] text-white/30">
                {activeSubTab === "system" ? "Nenhuma regra do sistema" :
                 activeSubTab === "user" ? "Nenhuma regra personalizada" :
                 "Nenhuma regra de referencia"}
              </p>
            </div>
          ) : (
            currentRules.map(rule => (
              <div
                key={rule.id}
                className={cn(
                  "flex items-center gap-2 p-2.5 rounded-lg border transition-colors",
                  rule.isEnabled
                    ? "bg-white/[0.02] border-white/[0.04]"
                    : "bg-transparent border-white/[0.02] opacity-50"
                )}
              >
                <button
                  onClick={() => toggleRule(rule.id)}
                  className={cn(
                    "w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors",
                    rule.isEnabled
                      ? "bg-green-500/20 border-green-500/40"
                      : "bg-transparent border-white/20"
                  )}
                >
                  {rule.isEnabled && (
                    <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-green-400">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </button>

                <div className="flex-1 min-w-0">
                  <p className="text-[11px] text-white/60 truncate">{rule.name}</p>
                  <div className="flex items-center gap-1.5">
                    {rule.section && (
                      <span className="text-[9px] text-white/30">{SECTION_LABELS[rule.section as SectionType] || rule.section}</span>
                    )}
                    {rule.referenceFile && (
                      <span className="text-[9px] text-blue-400/60">• {rule.referenceFile.name}</span>
                    )}
                  </div>
                </div>

                <span className={cn(
                  "text-[9px] px-1.5 py-0.5 rounded",
                  rule.severity === "ERROR" ? "bg-red-500/20 text-red-400" :
                  rule.severity === "WARNING" ? "bg-yellow-500/20 text-yellow-400" :
                  "bg-blue-500/20 text-blue-400"
                )}>
                  {rule.severity === "ERROR" ? "!" : rule.severity === "WARNING" ? "?" : "i"}
                </span>

                {rule.isBuiltIn ? (
                  <span className="text-[9px] text-white/20">Sistema</span>
                ) : (
                  <button
                    onClick={() => deleteRule(rule.id)}
                    className="p-1 rounded hover:bg-red-500/10 text-white/20 hover:text-red-400 transition-colors"
                  >
                    <Icons.trash />
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function ChatTab() {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Array<{ role: "user" | "assistant"; content: string }>>([]);

  const handleSend = () => {
    if (!message.trim()) return;
    setMessages(prev => [...prev, { role: "user", content: message }]);
    setTimeout(() => {
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "Esta funcionalidade sera implementada em breve. Use a analise automatica para feedback."
      }]);
    }, 800);
    setMessage("");
  };

  return (
    <div className="flex flex-col h-[350px]">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-2 mb-3">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-10 h-10 rounded-xl bg-white/[0.04] flex items-center justify-center mb-3">
              <Icons.message className="text-white/30" />
            </div>
            <p className="text-[12px] text-white/50 mb-2">Chat com IA</p>
            <div className="space-y-1">
              {["Como melhorar a introducao?", "A metodologia esta adequada?"].map((q) => (
                <button
                  key={q}
                  onClick={() => setMessage(q)}
                  className="block text-[11px] text-white/30 hover:text-white/50 transition-colors"
                >
                  "{q}"
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg, i) => (
            <div
              key={i}
              className={cn(
                "max-w-[85%] p-2.5 rounded-xl text-[12px]",
                msg.role === "user"
                  ? "ml-auto bg-[#6366f1] text-white"
                  : "bg-white/[0.04] text-white/70"
              )}
            >
              {msg.content}
            </div>
          ))
        )}
      </div>

      {/* Input */}
      <div className="flex gap-2">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Pergunte algo..."
          className="flex-1 px-3 py-2 text-[12px] rounded-lg bg-white/[0.04] border border-white/[0.06] text-white/80 placeholder:text-white/30 focus:outline-none focus:border-white/20"
        />
        <button
          onClick={handleSend}
          disabled={!message.trim()}
          className={cn(
            "w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
            message.trim()
              ? "bg-[#6366f1] text-white"
              : "bg-white/[0.04] text-white/20"
          )}
        >
          <Icons.send />
        </button>
      </div>
    </div>
  );
}

export function CompactAdvisor({
  score,
  topSuggestion,
  onExpand,
  className,
}: {
  score: number;
  topSuggestion?: string;
  onExpand?: () => void;
  className?: string;
}) {
  return (
    <button
      onClick={onExpand}
      className={cn(
        "flex items-center gap-3 p-3 rounded-xl",
        "bg-[#1a1a1a]/80 backdrop-blur-xl border border-white/[0.06]",
        "hover:bg-[#1a1a1a] transition-colors w-full text-left",
        className
      )}
    >
      <div className="w-8 h-8 rounded-lg bg-gradient-to-b from-[#6366f1] to-[#4f46e5] flex items-center justify-center">
        <Icons.sparkles className="text-white text-xs" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-medium text-white/80">Orientador</p>
        {topSuggestion && (
          <p className="text-[11px] text-white/40 truncate">{topSuggestion}</p>
        )}
      </div>
      <div className={cn(
        "text-[13px] font-semibold",
        score >= 70 ? "text-green-400" : score >= 50 ? "text-yellow-400" : "text-red-400"
      )}>
        {score}%
      </div>
    </button>
  );
}
