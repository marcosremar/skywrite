"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";
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
  edit: (props: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={props.className}>
      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /><path d="m15 5 4 4" />
    </svg>
  ),
  layers: (props: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={props.className}>
      <path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z" /><path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65" /><path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65" />
    </svg>
  ),
  type: (props: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={props.className}>
      <polyline points="4 7 4 4 20 4 20 7" /><line x1="9" x2="15" y1="20" y2="20" /><line x1="12" x2="12" y1="4" y2="20" />
    </svg>
  ),
  quote: (props: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={props.className}>
      <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V21c0 1 0 1 1 1z" /><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z" />
    </svg>
  ),
  pen: (props: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={props.className}>
      <path d="m12 19 7-7 3 3-7 7-3-3z" /><path d="m18 13-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" /><path d="m2 2 7.586 7.586" /><circle cx="11" cy="11" r="2" />
    </svg>
  ),
  info: (props: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={props.className}>
      <circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" />
    </svg>
  ),
  chevronDown: (props: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={props.className}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  ),
  search: (props: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={props.className}>
      <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
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
      "flex flex-col h-full w-full max-w-full overflow-hidden advisor-panel bg-gradient-to-b from-[#16181c] to-[#0f1114]",
      className
    )}>
      {/* Header */}
      <div className="flex-shrink-0 px-4 pt-4 pb-3 w-full min-w-0">
        {/* Title row */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500/25 to-indigo-500/25 flex items-center justify-center border border-violet-500/20 flex-shrink-0">
              <Icons.sparkles className="text-violet-400" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-[15px] font-semibold text-white/95 tracking-tight truncate">
                Orientador
              </h1>
              <p className="text-[12px] text-white/50 truncate">Assistente de escrita</p>
            </div>
          </div>

          {/* Score indicator */}
          {analysis && (
            <div className="flex items-center gap-3 flex-shrink-0">
              {pendingUpdate && (
                <div className="w-2 h-2 rounded-full bg-amber-400/80 animate-pulse" />
              )}
              <div className={cn(
                "px-3 py-1.5 rounded-lg text-[13px] font-bold",
                "bg-white/[0.06] border",
                analysis.overallScore >= 70 ? "text-emerald-400 border-emerald-500/20" :
                analysis.overallScore >= 50 ? "text-amber-400 border-amber-500/20" : "text-rose-400 border-rose-500/20"
              )}>
                {analysis.overallScore}%
              </div>
            </div>
          )}

          {isAnalyzing && !analysis && (
            <Icons.spinner className="w-5 h-5 text-white/40 animate-spin flex-shrink-0" />
          )}
        </div>

        {/* Tab navigation - improved active state */}
        <div className="flex gap-1 p-1 rounded-xl bg-white/[0.04] w-full overflow-hidden">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "relative flex-1 min-w-0 px-2 py-2.5 text-[13px] font-medium rounded-lg transition-all truncate",
                activeTab === tab.id
                  ? "bg-white/[0.10] text-white shadow-sm"
                  : "text-white/50 hover:text-white/70 hover:bg-white/[0.04]"
              )}
            >
              <span className="truncate">{tab.label}</span>
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-violet-400" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 w-full min-w-0 overflow-hidden flex flex-col">
        {activeTab === "chat" ? (
          <ChatTab />
        ) : (
          <div className="flex-1 w-full min-w-0 overflow-y-auto overflow-x-hidden p-4">
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
          </div>
        )}
      </div>

      {/* Status bar */}
      {analysis && (
        <div className="flex-shrink-0 px-5 py-3 border-t border-white/[0.06] bg-[#0f1114]">
          <div className="flex items-center justify-between text-[11px] text-white/40">
            <span>{analysis.sections.length} secoes analisadas</span>
            <span className="font-medium">{getScoreLabel(analysis.overallScore)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <Icons.spinner className="w-8 h-8 text-violet-400/50 animate-spin mb-5" />
      <p className="text-[14px] text-white/50 font-medium">Analisando...</p>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-16 h-16 rounded-2xl bg-[#1a1e22] border border-white/[0.06] flex items-center justify-center mb-5">
        <Icons.sparkles className="text-violet-400/60 w-7 h-7" />
      </div>
      <p className="text-[16px] text-white/70 mb-2 font-semibold">Orientador Virtual</p>
      <p className="text-[13px] text-white/40 max-w-[220px] leading-relaxed">
        Comece a escrever para receber feedback inteligente
      </p>
    </div>
  );
}

function OverviewTab({ analysis }: { analysis: ThesisAnalysis }) {
  return (
    <div className="space-y-4 w-full min-w-0">
      {/* Score Card - elevated with better contrast */}
      <div className="p-4 rounded-2xl bg-[#1e2126] border border-white/[0.06] w-full">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[12px] font-medium text-white/50 uppercase tracking-wider truncate mr-2">
            Pontuacao Geral
          </span>
          <span className={cn(
            "text-3xl font-bold tracking-tight flex-shrink-0",
            analysis.overallScore >= 70 ? "text-emerald-400" :
            analysis.overallScore >= 50 ? "text-amber-400" : "text-rose-400"
          )}>
            {analysis.overallScore}
          </span>
        </div>

        {/* Progress bar - more visible */}
        <div className="h-2 rounded-full bg-white/[0.08] overflow-hidden w-full">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-700 ease-out",
              analysis.overallScore >= 70 ? "bg-emerald-500" :
              analysis.overallScore >= 50 ? "bg-amber-500" : "bg-rose-500"
            )}
            style={{ width: `${analysis.overallScore}%` }}
          />
        </div>
      </div>

      {/* Stats Grid - flex for better responsiveness */}
      <div className="flex flex-wrap gap-3 w-full">
        <div className="flex-1 min-w-[120px] p-3 rounded-xl bg-[#1a1e22] border border-emerald-500/15">
          <div className="flex items-center gap-2 mb-2 min-w-0">
            <Icons.checkCircle className="text-emerald-400 w-3.5 h-3.5 flex-shrink-0" />
            <span className="text-[11px] font-medium text-emerald-400/80 uppercase tracking-wider truncate">
              Fortes
            </span>
          </div>
          <p className="text-xl font-bold text-emerald-400 truncate">
            {analysis.summary.strongPoints.length}
          </p>
        </div>

        <div className="flex-1 min-w-[120px] p-3 rounded-xl bg-[#1a1e22] border border-amber-500/15">
          <div className="flex items-center gap-2 mb-2 min-w-0">
            <Icons.alertTriangle className="text-amber-400 w-3.5 h-3.5 flex-shrink-0" />
            <span className="text-[11px] font-medium text-amber-400/80 uppercase tracking-wider truncate">
              Melhorar
            </span>
          </div>
          <p className="text-xl font-bold text-amber-400 truncate">
            {analysis.summary.improvementAreas.length}
          </p>
        </div>
      </div>

      {/* Strong Points */}
      {analysis.summary.strongPoints.length > 0 && (
        <div className="space-y-3 w-full min-w-0">
          <h3 className="text-[12px] font-semibold text-white/60 uppercase tracking-wider truncate">
            Pontos Fortes
          </h3>
          <div className="space-y-2 w-full">
            {analysis.summary.strongPoints.map((point, i) => (
              <div
                key={i}
                className="flex items-start gap-3 p-3 rounded-xl bg-[#1a1e22] border border-white/[0.04] hover:border-white/[0.08] transition-colors w-full"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 flex-shrink-0" />
                <p className="text-[13px] text-white/70 leading-relaxed break-words min-w-0">{point}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Improvement Areas */}
      {analysis.summary.improvementAreas.length > 0 && (
        <div className="space-y-3 w-full min-w-0">
          <h3 className="text-[12px] font-semibold text-white/60 uppercase tracking-wider truncate">
            A Melhorar
          </h3>
          <div className="space-y-2 w-full">
            {analysis.summary.improvementAreas.map((area, i) => (
              <div
                key={i}
                className="flex items-start gap-3 p-3 rounded-xl bg-[#1a1e22] border border-white/[0.04] hover:border-white/[0.08] transition-colors w-full"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 flex-shrink-0" />
                <p className="text-[13px] text-white/70 leading-relaxed break-words min-w-0">{area}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Section Progress */}
      {analysis.sections.length > 0 && (
        <div className="space-y-3 w-full min-w-0">
          <h3 className="text-[12px] font-semibold text-white/60 uppercase tracking-wider truncate">
            Por Secao
          </h3>
          <div className="space-y-2 w-full">
            {analysis.sections.map((section) => (
              <div
                key={section.section}
                className="flex items-center gap-3 p-3 rounded-xl bg-[#1a1e22] border border-white/[0.04] hover:border-white/[0.08] transition-colors w-full min-w-0"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] text-white/80 truncate font-medium">{section.sectionLabel}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="w-16 h-1.5 rounded-full bg-white/[0.08] overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full",
                        section.score >= 70 ? "bg-emerald-500" :
                        section.score >= 50 ? "bg-amber-500" : "bg-rose-500"
                      )}
                      style={{ width: `${section.score}%` }}
                    />
                  </div>
                  <span className={cn(
                    "text-[12px] font-semibold w-8 text-right",
                    section.score >= 70 ? "text-emerald-400" :
                    section.score >= 50 ? "text-amber-400" : "text-rose-400"
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
      <div className="flex flex-col items-center justify-center py-16 text-center w-full min-w-0">
        <div className="w-14 h-14 rounded-2xl bg-[#1a1e22] border border-white/[0.06] flex items-center justify-center mb-5">
          <Icons.doc className="text-white/30 w-6 h-6" />
        </div>
        <p className="text-[15px] text-white/60 mb-2 font-medium">Nenhuma secao</p>
        <p className="text-[13px] text-white/40">Use titulos # para criar secoes</p>
      </div>
    );
  }

  return (
    <div className="space-y-2 w-full min-w-0">
      {sections.map((section) => {
        const isExpanded = expandedSections.has(section.section);

        return (
          <div
            key={section.section}
            className="rounded-xl bg-[#1a1e22] border border-white/[0.04] overflow-hidden w-full min-w-0"
          >
            <button
              onClick={() => onToggle(section.section)}
              className="w-full flex items-center gap-3 p-3 hover:bg-white/[0.03] transition-colors min-w-0"
            >
              <Icons.chevronRight className={cn(
                "text-white/40 transition-transform duration-200 w-3.5 h-3.5 flex-shrink-0",
                isExpanded && "rotate-90"
              )} />
              <span className="flex-1 text-[13px] text-white/80 text-left truncate font-medium min-w-0">
                {section.sectionLabel}
              </span>
              {section.priority === "high" && (
                <span className="px-1.5 py-0.5 rounded-md text-[10px] font-medium border border-rose-500/30 text-rose-400 bg-transparent flex-shrink-0">
                  !
                </span>
              )}
              <span className={cn(
                "text-[12px] font-bold flex-shrink-0",
                section.score >= 70 ? "text-emerald-400" :
                section.score >= 50 ? "text-amber-400" : "text-rose-400"
              )}>
                {section.score}%
              </span>
            </button>

            {isExpanded && (
              <div className="px-3 pb-3 space-y-4 w-full min-w-0">
                <div className="h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />

                {section.strengths.length > 0 && (
                  <div className="pt-1 w-full min-w-0">
                    <p className="text-[10px] font-semibold text-emerald-400/80 uppercase tracking-wider mb-2 truncate">
                      Pontos fortes
                    </p>
                    <div className="space-y-2 w-full">
                      {section.strengths.map((s, i) => (
                        <p key={i} className="text-[12px] text-white/60 leading-relaxed pl-3 border-l-2 border-emerald-500/30 break-words">
                          {s}
                        </p>
                      ))}
                    </div>
                  </div>
                )}

                {section.weaknesses.length > 0 && (
                  <div className="w-full min-w-0">
                    <p className="text-[10px] font-semibold text-amber-400/80 uppercase tracking-wider mb-2 truncate">
                      A melhorar
                    </p>
                    <div className="space-y-2 w-full">
                      {section.weaknesses.map((w, i) => (
                        <p key={i} className="text-[12px] text-white/60 leading-relaxed pl-3 border-l-2 border-amber-500/30 break-words">
                          {w}
                        </p>
                      ))}
                    </div>
                  </div>
                )}

                {section.suggestions.length > 0 && (
                  <div className="w-full min-w-0">
                    <p className="text-[10px] font-semibold text-sky-400/80 uppercase tracking-wider mb-2 truncate">
                      Sugestoes
                    </p>
                    <div className="space-y-2 w-full">
                      {section.suggestions.map((s, i) => (
                        <div key={i} className="p-3 rounded-lg bg-sky-500/[0.06] border border-sky-500/15 w-full">
                          <p className="text-[12px] text-sky-200/80 leading-relaxed break-words">{s}</p>
                        </div>
                      ))}
                    </div>
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

// Category configuration with icons, colors, and descriptions - subtle border style
const CATEGORY_CONFIG: Record<string, {
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  label: string;
  description: string;
}> = {
  STRUCTURE: {
    icon: <Icons.layers className="w-3.5 h-3.5" />,
    color: "text-purple-300",
    bgColor: "bg-transparent border border-purple-500/25",
    label: "Estrutura",
    description: "Regras sobre organizacao e formatacao do documento"
  },
  CONTENT: {
    icon: <Icons.type className="w-3.5 h-3.5" />,
    color: "text-blue-300",
    bgColor: "bg-transparent border border-blue-500/25",
    label: "Conteudo",
    description: "Regras sobre o que deve conter em cada secao"
  },
  CITATION: {
    icon: <Icons.quote className="w-3.5 h-3.5" />,
    color: "text-amber-300",
    bgColor: "bg-transparent border border-amber-500/25",
    label: "Citacao",
    description: "Regras sobre referencias e citacoes"
  },
  STYLE: {
    icon: <Icons.pen className="w-3.5 h-3.5" />,
    color: "text-emerald-300",
    bgColor: "bg-transparent border border-emerald-500/25",
    label: "Estilo",
    description: "Regras sobre tom e estilo de escrita"
  },
  CUSTOM: {
    icon: <Icons.sliders className="w-3.5 h-3.5" />,
    color: "text-pink-300",
    bgColor: "bg-transparent border border-pink-500/25",
    label: "Personalizado",
    description: "Regras personalizadas pelo usuario"
  },
};

// Severity config with subtle outline style
const SEVERITY_CONFIG: Record<string, { label: string; color: string; bgColor: string; description: string }> = {
  ERROR: { label: "Obrigatorio", color: "text-red-300", bgColor: "bg-transparent border border-red-500/25", description: "Deve ser seguida" },
  WARNING: { label: "Recomendado", color: "text-yellow-300", bgColor: "bg-transparent border border-yellow-500/25", description: "Sugere-se seguir" },
  INFO: { label: "Sugestao", color: "text-blue-300", bgColor: "bg-transparent border border-blue-500/25", description: "Opcional" },
};

interface EditingRule {
  id: string;
  name: string;
  description: string;
  pattern: string;
  category: string;
  section: string;
  severity: string;
}

function RuleFormModal({
  isOpen,
  onClose,
  onSave,
  initialData,
  mode = "create",
  isLoading = false
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
  initialData?: any;
  mode?: "create" | "edit";
  isLoading?: boolean;
}) {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    pattern: "",
    category: "CONTENT",
    section: "",
    severity: "WARNING",
    ...initialData
  });

  useEffect(() => {
    if (isOpen) {
      setFormData({
        name: "",
        description: "",
        pattern: "",
        category: "CONTENT",
        section: "",
        severity: "WARNING",
        ...initialData
      });
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    await onSave(formData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />
      <div className="relative bg-[#1a1e22] border border-white/10 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/[0.06] bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className={cn(
              "p-2.5 rounded-xl flex items-center justify-center",
              mode === "create" ? "bg-emerald-500/10 text-emerald-400" : "bg-blue-500/10 text-blue-400"
            )}>
              {mode === "create" ? <Icons.plus className="w-5 h-5" /> : <Icons.edit className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-[17px] font-semibold text-white/90 tracking-tight">
                {mode === "create" ? "Nova Regra de Escrita" : "Editar Regra"}
              </h3>
              <p className="text-[13px] text-white/40">
                {mode === "create" ? "Defina um novo padrão para o assistente verificar" : "Ajuste os parâmetros da regra existente"}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/[0.06] transition-colors"
          >
            <Icons.x className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto custom-scrollbar space-y-6">
          {/* Main Info Section */}
          <div className="space-y-4">
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-white/60 uppercase tracking-wider ml-1">Nome da Regra</label>
                <div className="relative group">
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Ex: Evitar voz passiva"
                    className="w-full px-4 py-3 rounded-xl bg-black/20 border border-white/[0.06] text-white/90 placeholder:text-white/20 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 transition-all text-[14px]"
                  />
                  <div className="absolute right-3 top-3 text-white/10 group-focus-within:text-violet-500/50 transition-colors">
                    <Icons.type className="w-4 h-4" />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-white/60 uppercase tracking-wider ml-1">Padrão (Regex)</label>
                <div className="relative group">
                  <input
                    type="text"
                    value={formData.pattern}
                    onChange={(e) => setFormData(prev => ({ ...prev, pattern: e.target.value }))}
                    placeholder="Ex: foi realizado|realizou-se"
                    className="w-full px-4 py-3 rounded-xl bg-black/20 border border-white/[0.06] text-emerald-400 placeholder:text-white/20 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all font-mono text-[13px]"
                  />
                  <div className="absolute right-3 top-3 text-white/10 group-focus-within:text-emerald-500/50 transition-colors">
                    <Icons.search className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-[11px] text-white/30 pl-1">Use <code className="bg-white/10 px-1 rounded text-white/50">|</code> para separar termos alternativos</p>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-white/60 uppercase tracking-wider ml-1">Descrição / Feedback</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Explique por que esta regra é importante e como corrigir..."
                rows={3}
                className="w-full px-4 py-3 rounded-xl bg-black/20 border border-white/[0.06] text-white/80 placeholder:text-white/20 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 transition-all text-[14px] resize-none"
              />
            </div>
          </div>

          <div className="h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />

          {/* Configuration Section */}
          <div className="grid gap-5 sm:grid-cols-3">
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-white/60 uppercase tracking-wider ml-1">Categoria</label>
              <div className="relative">
                <select
                  value={formData.category}
                  onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] text-white/80 focus:outline-none focus:border-white/20 appearance-none text-[13px] cursor-pointer hover:bg-white/[0.05] transition-colors"
                >
                  {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
                    <option key={key} value={key} className="bg-[#1a1e22]">{config.label}</option>
                  ))}
                </select>
                <div className="absolute right-3 top-3 text-white/20 pointer-events-none">
                  <Icons.chevronDown className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-white/60 uppercase tracking-wider ml-1">Seção Específica</label>
              <div className="relative">
                <select
                  value={formData.section || ""}
                  onChange={(e) => setFormData(prev => ({ ...prev, section: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] text-white/80 focus:outline-none focus:border-white/20 appearance-none text-[13px] cursor-pointer hover:bg-white/[0.05] transition-colors"
                >
                  <option value="" className="bg-[#1a1e22]">Todas as seções</option>
                  {Object.entries(SECTION_LABELS).map(([key, label]) => (
                    <option key={key} value={key} className="bg-[#1a1e22]">{label}</option>
                  ))}
                </select>
                <div className="absolute right-3 top-3 text-white/20 pointer-events-none">
                  <Icons.chevronDown className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-white/60 uppercase tracking-wider ml-1">Severidade</label>
              <div className="relative">
                <select
                  value={formData.severity}
                  onChange={(e) => setFormData(prev => ({ ...prev, severity: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] text-white/80 focus:outline-none focus:border-white/20 appearance-none text-[13px] cursor-pointer hover:bg-white/[0.05] transition-colors"
                >
                  {Object.entries(SEVERITY_CONFIG).map(([key, config]) => (
                    <option key={key} value={key} className="bg-[#1a1e22]">{config.label}</option>
                  ))}
                </select>
                <div className="absolute right-3 top-3 text-white/20 pointer-events-none">
                  <Icons.chevronDown className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-5 border-t border-white/[0.06] bg-black/20">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-[13px] font-medium text-white/60 hover:text-white hover:bg-white/[0.06] rounded-xl transition-all"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={isLoading || !formData.name || !formData.pattern}
            className={cn(
              "px-6 py-2.5 text-[13px] font-semibold text-white rounded-xl shadow-lg shadow-black/20 transition-all flex items-center gap-2",
              mode === "create" 
                ? "bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500" 
                : "bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500",
              (isLoading || !formData.name || !formData.pattern) && "opacity-50 cursor-not-allowed grayscale"
            )}
          >
            {isLoading ? <Icons.spinner className="w-4 h-4 animate-spin" /> : <Icons.checkCircle className="w-4 h-4" />}
            {mode === "create" ? "Criar Regra" : "Salvar Alterações"}
          </button>
        </div>
      </div>
    </div>
  );
}

function RulesTab() {
  const { rules, loading, toggleRule, createRule, deleteRule, updateRule, refetch: refetchRules } = useRules();
  const { files, uploading, uploadFile, deleteFile, refetch: refetchFiles, error: uploadError } = useReferenceFiles();
  const [activeSubTab, setActiveSubTab] = useState<"system" | "user" | "reference">("system");
  const [showForm, setShowForm] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);
  const [expandedRule, setExpandedRule] = useState<string | null>(null);
  const [editingRule, setEditingRule] = useState<EditingRule | null>(null);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDeleteFile = async () => {
    if (!deleteConfirm) return;
    try {
      await deleteFile(deleteConfirm.id);
      setDeleteConfirm(null);
      if (selectedFile === deleteConfirm.id) {
        setSelectedFile(null);
      }
    } catch (err) {
      console.error("Failed to delete file:", err);
    }
  };

  const systemRules = rules.filter(r => r.type === "SYSTEM");
  const userRules = rules.filter(r => r.type === "USER");
  const referenceRules = rules.filter(r => r.type === "REFERENCE");

  const handleAdd = async (data: any) => {
    setSaving(true);
    try {
      await createRule({
        name: data.name,
        description: data.description || data.name,
        category: data.category,
        pattern: data.pattern,
        section: data.section || null,
        severity: data.severity,
        weight: 1,
        isEnabled: true,
        referenceFile: null,
      });
      setShowForm(false);
    } catch (err) {
      console.error("Failed to create rule:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleStartEdit = (rule: typeof rules[0]) => {
    setEditingRule({
      id: rule.id,
      name: rule.name,
      description: rule.description || "",
      pattern: rule.pattern || "",
      category: rule.category,
      section: rule.section || "",
      severity: rule.severity,
    });
  };

  const handleSaveEdit = async (data: any) => {
    if (!editingRule) return;
    setSaving(true);
    try {
      await updateRule(editingRule.id, {
        name: data.name,
        description: data.description,
        pattern: data.pattern,
        category: data.category,
        section: data.section || null,
        severity: data.severity,
      });
      setEditingRule(null);
    } catch (err) {
      console.error("Failed to update rule:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorMessage(null);
    try {
      const result = await uploadFile(file);
      // Refresh rules and files after successful upload
      await Promise.all([refetchRules(), refetchFiles()]);
      // Auto-select the uploaded file to show its extracted rules
      if (result?.file?.id) {
        setSelectedFile(result.file.id);
      }
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
    <div className="flex flex-col gap-4 overflow-hidden w-full min-w-0">
      {/* Sub-tabs - improved styling */}
      <div className="grid grid-cols-3 gap-0.5 p-1 rounded-xl bg-[#1a1e22] border border-white/[0.04] w-full min-w-0 overflow-hidden">
        {subTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id)}
            className={cn(
              "flex items-center justify-center gap-1.5 px-1.5 py-2.5 text-[12px] font-medium rounded-lg transition-all min-w-0 overflow-hidden group w-full",
              activeSubTab === tab.id
                ? "bg-white/[0.08] text-white"
                : "text-white/50 hover:text-white/70 hover:bg-white/[0.04]"
            )}
          >
            <span className={cn(activeSubTab === tab.id ? "text-white/80" : "text-white/40", "flex-shrink-0")}>{tab.icon}</span>
            <span className="truncate min-w-0 flex-1 text-left">{tab.label}</span>
            <span className={cn(
              "px-1.5 py-0.5 rounded-md text-[10px] flex-shrink-0 ml-auto",
              activeSubTab === tab.id ? "bg-white/[0.10] text-white/80" : "bg-white/[0.04] text-white/40"
            )}>{tab.count}</span>
          </button>
        ))}
      </div>

      {/* Actions based on active tab */}
      {activeSubTab === "user" && (
        <button
          onClick={() => setShowForm(!showForm)}
          className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-[#1a1e22] border border-white/[0.06] hover:border-white/[0.12] hover:bg-[#1e2228] transition-all text-[13px] text-white/60 min-w-0"
        >
          <Icons.plus className="text-white/50 flex-shrink-0 w-4 h-4" />
          <span>Nova Regra</span>
        </button>
      )}

      {activeSubTab === "reference" && (
        <div className="space-y-3 overflow-hidden min-w-0 w-full">
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
            className="w-full flex items-center justify-center gap-2.5 p-3.5 rounded-xl bg-[#1a1e22] border border-dashed border-white/[0.10] hover:border-white/[0.20] hover:bg-[#1e2228] transition-all text-[13px] text-white/60 disabled:opacity-50 min-w-0"
          >
            {uploading ? (
              <Icons.spinner className="text-white/50 animate-spin flex-shrink-0 w-4 h-4" />
            ) : (
              <Icons.upload className="text-white/50 flex-shrink-0 w-4 h-4" />
            )}
            <span className="truncate">{uploading ? "Analisando..." : "Enviar Arquivo"}</span>
          </button>
          <p className="text-[11px] text-white/40 text-center truncate">
            PDF, TXT ou MD
          </p>

          {/* Error message */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-[13px] text-red-400 break-words w-full">
              {errorMessage}
            </div>
          )}

          {/* Reference files list - improved styling */}
          {files.length > 0 && !selectedFile && (
            <div className="space-y-2 w-full min-w-0">
              {files.map(file => (
                <div
                  key={file.id}
                  className="px-4 py-3 rounded-xl bg-[#1a1e22] border border-white/[0.04] hover:border-white/[0.08] transition-all overflow-hidden min-w-0 w-full"
                >
                  <div
                    className="flex items-start gap-3 cursor-pointer min-w-0 w-full"
                    onClick={() => setSelectedFile(file.id)}
                  >
                    <Icons.file className="text-white/40 flex-shrink-0 w-4 h-4 mt-0.5" />
                    <p className="text-[13px] text-white/70 flex-1 leading-tight truncate min-w-0 font-medium">
                      {file.originalName}
                    </p>
                  </div>
                  <div className="flex items-center justify-between mt-2 pl-7 gap-2 min-w-0 w-full">
                    <span
                      className="text-[11px] text-white/40 cursor-pointer hover:text-white/60 truncate flex-1 min-w-0"
                      onClick={() => setSelectedFile(file.id)}
                    >
                      {file._count?.rules ?? file.rules?.length ?? 0} regras extraidas
                    </span>
                    <button
                      onClick={(e) => { e.stopPropagation(); setDeleteConfirm({ id: file.id, name: file.originalName }); }}
                      className="px-2 py-1 text-[11px] text-red-400/60 hover:text-red-400 border border-red-500/20 hover:border-red-500/40 rounded-md transition-all flex-shrink-0"
                    >
                      Excluir
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Selected file rules view */}
          {selectedFile && (
            <div className="space-y-2 overflow-hidden min-w-0 w-full">
              <button
                onClick={() => setSelectedFile(null)}
                className="flex items-center gap-1 text-[11px] text-white/50 hover:text-white/80 transition-colors"
              >
                <Icons.chevronLeft />
                <span>Voltar</span>
              </button>

              {(() => {
                const file = files.find(f => f.id === selectedFile);
                const fileRules = referenceRules.filter(r => r.referenceFile?.id === selectedFile);

                return (
                  <div className="space-y-2 overflow-hidden min-w-0 w-full">
                    <div className="px-2 py-2 rounded-lg bg-white/[0.03] overflow-hidden min-w-0 w-full">
                      <p className="text-[11px] text-white/60 leading-tight truncate">
                        {file?.originalName}
                      </p>
                      <p className="text-[10px] text-white/30 mt-1">{fileRules.length} regras</p>
                    </div>

                    {fileRules.length === 0 ? (
                      <div className="text-center py-6">
                        <Icons.sliders className="w-6 h-6 text-white/20 mx-auto mb-2" />
                        <p className="text-[12px] text-white/30">
                          Nenhuma regra extraida
                        </p>
                        <p className="text-[11px] text-white/20 mt-1">
                          A IA nao encontrou padroes
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-1.5 w-full min-w-0">
                        {fileRules.map(rule => {
                          const isExpanded = expandedRule === rule.id;
                          const categoryConfig = CATEGORY_CONFIG[rule.category] || CATEGORY_CONFIG.CUSTOM;
                          const severityConfig = SEVERITY_CONFIG[rule.severity] || SEVERITY_CONFIG.INFO;

                          return (
                            <div
                              key={rule.id}
                              className={cn(
                                "rounded-lg transition-all overflow-hidden min-w-0 w-full",
                                rule.isEnabled
                                  ? "bg-white/[0.02]"
                                  : "bg-transparent opacity-50"
                              )}
                            >
                              <div
                                className="flex items-start gap-2 p-2.5 cursor-pointer hover:bg-white/[0.02] transition-colors min-w-0 w-full"
                                onClick={() => setExpandedRule(isExpanded ? null : rule.id)}
                              >
                                <button
                                  onClick={(e) => { e.stopPropagation(); toggleRule(rule.id); }}
                                  className={cn(
                                    "w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors",
                                    rule.isEnabled
                                      ? "bg-emerald-500/20 border-emerald-500/40"
                                      : "border-white/20 hover:border-white/40"
                                  )}
                                >
                                  {rule.isEnabled && (
                                    <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400">
                                      <polyline points="20 6 9 17 4 12" />
                                    </svg>
                                  )}
                                </button>

                                <div className={cn("p-1 rounded flex-shrink-0", categoryConfig.bgColor)}>
                                  <span className={cn(categoryConfig.color, "text-[10px]")}>{categoryConfig.icon}</span>
                                </div>

                                <div className="flex-1 min-w-0 overflow-hidden">
                                  <div className="flex items-start gap-1 min-w-0 w-full">
                                    <p
                                      className={cn(
                                        "text-[11px] flex-1 leading-tight truncate min-w-0",
                                        rule.isEnabled ? 'text-white/80' : 'text-white/40'
                                      )}
                                    >
                                      {rule.name}
                                    </p>
                                    <Icons.chevronRight className={cn(
                                      "text-white/30 transition-transform duration-200 flex-shrink-0 w-3 h-3",
                                      isExpanded && "rotate-90"
                                    )} />
                                  </div>
                                  <div className="flex items-center gap-1 mt-1 flex-wrap">
                                    <span className={cn("text-[9px] px-1 py-0.5 rounded flex-shrink-0", severityConfig.bgColor, severityConfig.color)}>
                                      {severityConfig.label}
                                    </span>
                                    <span className={cn("text-[9px] px-1 py-0.5 rounded flex-shrink-0", categoryConfig.bgColor, categoryConfig.color)}>
                                      {categoryConfig.label}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Expanded details */}
                              {isExpanded && (
                                <div className="px-2.5 pb-2.5 space-y-2 overflow-hidden">
                                  <div className="h-px bg-white/[0.04]" />
                                  {rule.description && (
                                    <div className="pt-1">
                                      <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1">O que verifica</p>
                                      <p className="text-[11px] text-white/60 leading-relaxed break-words">{rule.description}</p>
                                    </div>
                                  )}
                                  {rule.pattern && (
                                    <div className="overflow-hidden">
                                      <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1">Padrao</p>
                                      <code className="text-[10px] text-emerald-400/80 font-mono bg-emerald-500/[0.08] px-2 py-1 rounded block break-all overflow-x-auto">
                                        {rule.pattern}
                                      </code>
                                    </div>
                                  )}
                                  {rule.section && (
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="text-[10px] text-white/30">Secao:</span>
                                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.04] text-white/50 truncate max-w-[100px]">
                                        {SECTION_LABELS[rule.section as SectionType] || rule.section}
                                      </span>
                                    </div>
                                  )}

                                  {/* Actions */}
                                  <div className="flex gap-1.5 pt-2">
                                    <div className="h-px bg-white/[0.04] w-full absolute left-0" />
                                    <button
                                      onClick={(e) => { e.stopPropagation(); handleStartEdit(rule); }}
                                      className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded bg-white/[0.04] hover:bg-white/[0.08] text-[10px] text-white/50 hover:text-white/70 transition-colors"
                                    >
                                      <Icons.edit className="w-3 h-3" />
                                      Editar
                                    </button>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); deleteRule(rule.id); }}
                                      className="flex items-center justify-center px-2 py-1.5 rounded bg-red-500/10 hover:bg-red-500/20 text-[10px] text-red-400/60 hover:text-red-400 transition-colors"
                                    >
                                      <Icons.trash className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
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
        <div className="p-3 rounded-xl bg-white/[0.03] space-y-3 min-w-0 w-full overflow-hidden">
          <div className="flex items-center gap-2 pb-2">
            <Icons.plus className="text-white/40 flex-shrink-0" />
            <span className="text-[12px] font-medium text-white/70">Nova Regra</span>
          </div>
          <div className="h-px bg-white/[0.04]" />

          <div className="min-w-0">
            <label className="text-[10px] text-white/40 uppercase tracking-wider mb-1 block">Nome *</label>
            <input
              type="text"
              value={newRule.name}
              onChange={(e) => setNewRule(p => ({ ...p, name: e.target.value }))}
              placeholder="Ex: Usar voz passiva"
              className="w-full px-2.5 py-2 text-[12px] rounded-lg bg-white/[0.04] text-white/80 placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-white/20 min-w-0"
            />
          </div>

          <div className="min-w-0">
            <label className="text-[10px] text-white/40 uppercase tracking-wider mb-1 block">Descricao</label>
            <textarea
              value={newRule.description}
              onChange={(e) => setNewRule(p => ({ ...p, description: e.target.value }))}
              placeholder="Explique o proposito..."
              rows={2}
              className="w-full px-2.5 py-2 text-[12px] rounded-lg bg-white/[0.04] text-white/80 placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-white/20 resize-none min-w-0"
            />
          </div>

          <div className="min-w-0">
            <label className="text-[10px] text-white/40 uppercase tracking-wider mb-1 block">Padrao *</label>
            <input
              type="text"
              value={newRule.pattern}
              onChange={(e) => setNewRule(p => ({ ...p, pattern: e.target.value }))}
              placeholder="Ex: foi realizado|realizou-se"
              className="w-full px-2.5 py-2 text-[12px] rounded-lg bg-white/[0.04] text-white/80 placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-white/20 font-mono min-w-0"
            />
            <p className="text-[10px] text-white/30 mt-1">Use | para alternativas</p>
          </div>

          <div className="flex flex-col gap-3">
            <div className="min-w-0">
              <label className="text-[10px] text-white/40 uppercase tracking-wider mb-1 block">Categoria</label>
              <select
                value={newRule.category}
                onChange={(e) => setNewRule(p => ({ ...p, category: e.target.value }))}
                className="w-full px-2 py-2 text-[11px] rounded-lg bg-white/[0.04] text-white/80 focus:outline-none focus:ring-1 focus:ring-white/20 min-w-0"
              >
                {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
                  <option key={key} value={key}>{config.label}</option>
                ))}
              </select>
            </div>
            <div className="min-w-0">
              <label className="text-[10px] text-white/40 uppercase tracking-wider mb-1 block">Secao</label>
              <select
                value={newRule.section}
                onChange={(e) => setNewRule(p => ({ ...p, section: e.target.value }))}
                className="w-full px-2 py-2 text-[11px] rounded-lg bg-white/[0.04] text-white/80 focus:outline-none focus:ring-1 focus:ring-white/20 min-w-0"
              >
                <option value="">Todas</option>
                {Object.entries(SECTION_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
            <div className="min-w-0">
              <label className="text-[10px] text-white/40 uppercase tracking-wider mb-1 block">Prioridade</label>
              <select
                value={newRule.severity}
                onChange={(e) => setNewRule(p => ({ ...p, severity: e.target.value }))}
                className="w-full px-2 py-2 text-[11px] rounded-lg bg-white/[0.04] text-white/80 focus:outline-none focus:ring-1 focus:ring-white/20 min-w-0"
              >
                {Object.entries(SEVERITY_CONFIG).map(([key, config]) => (
                  <option key={key} value={key}>{config.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              onClick={handleAdd}
              disabled={!newRule.name || !newRule.pattern}
              className="flex-1 py-2 rounded-lg bg-emerald-500/20 text-[12px] font-medium text-emerald-400 hover:bg-emerald-500/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Criar
            </button>
            <button
              onClick={() => { setShowForm(false); setNewRule({ name: "", description: "", pattern: "", category: "CONTENT", section: "", severity: "WARNING" }); }}
              className="px-3 py-2 rounded-lg text-[12px] text-white/40 hover:text-white/60 hover:bg-white/[0.04] transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Icons.spinner className="w-6 h-6 text-white/40 animate-spin" />
        </div>
      )}

      {/* Rules list with improved spacing */}
      {!loading && (
        <div className="flex flex-col gap-3 w-full min-w-0">
          {currentRules.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-14 h-14 rounded-2xl bg-[#1a1e22] border border-white/[0.06] flex items-center justify-center mx-auto mb-4">
                <Icons.sliders className="text-white/35 w-6 h-6" />
              </div>
              <p className="text-[15px] text-white/50 mb-2 font-medium">
                {activeSubTab === "system" ? "Nenhuma regra do sistema" :
                 activeSubTab === "user" ? "Nenhuma regra personalizada" :
                 "Nenhuma regra de referencia"}
              </p>
              <p className="text-[13px] text-white/35">
                {activeSubTab === "user" ? "Clique em \"Nova Regra\" para criar" :
                 activeSubTab === "reference" ? "Envie um arquivo para extrair regras" : ""}
              </p>
            </div>
          ) : (
            currentRules.map(rule => {
              const isExpanded = expandedRule === rule.id;
              const categoryConfig = CATEGORY_CONFIG[rule.category] || CATEGORY_CONFIG.CUSTOM;
              const severityConfig = SEVERITY_CONFIG[rule.severity] || SEVERITY_CONFIG.INFO;

              return (
                <div
                  key={rule.id}
                  className={cn(
                    "rounded-xl overflow-hidden border border-white/[0.04] w-full min-w-0",
                    rule.isEnabled ? "bg-[#1a1e22]" : "bg-[#18191c] opacity-60"
                  )}
                >
                  {/* Rule header */}
                  <div
                    className="flex items-start gap-3 p-4 cursor-pointer hover:bg-white/[0.03] transition-colors w-full min-w-0"
                    onClick={() => setExpandedRule(isExpanded ? null : rule.id)}
                  >
                    {/* Enable toggle */}
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleRule(rule.id); }}
                      className={cn(
                        "w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5",
                        rule.isEnabled
                          ? "bg-emerald-500/20 border border-emerald-500/40"
                          : "border border-white/25 hover:border-white/40"
                      )}
                    >
                      {rule.isEnabled && (
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-emerald-400">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </button>

                    {/* Category icon */}
                    <div className={cn("p-1.5 rounded-lg flex-shrink-0", categoryConfig.bgColor)}>
                      <span className={categoryConfig.color}>{categoryConfig.icon}</span>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-hidden min-w-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <p className="text-[13px] text-white/85 font-medium truncate flex-1 min-w-0">{rule.name}</p>
                        <Icons.chevronRight className={cn(
                          "text-white/40 flex-shrink-0 w-3.5 h-3.5 transition-transform",
                          isExpanded && "rotate-90"
                        )} />
                      </div>
                      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                        <span className={cn("text-[10px] px-1.5 py-0.5 rounded-md flex-shrink-0", categoryConfig.bgColor, categoryConfig.color)}>
                          {categoryConfig.label}
                        </span>
                        <span className={cn("text-[10px] px-1.5 py-0.5 rounded-md flex-shrink-0", severityConfig.bgColor, severityConfig.color)}>
                          {severityConfig.label}
                        </span>
                        {rule.section && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-md border border-white/[0.08] text-white/50 flex-shrink-0 truncate max-w-[100px]">
                            {SECTION_LABELS[rule.section as SectionType] || rule.section}
                          </span>
                        )}
                      </div>
                      {rule.referenceFile && (
                        <div className="flex items-center gap-1.5 mt-2 overflow-hidden min-w-0">
                          <Icons.file className="w-3 h-3 text-blue-400/70 flex-shrink-0" />
                          <span className="text-[11px] text-blue-400/70 truncate">{rule.referenceFile.originalName || rule.referenceFile.name}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Expanded rule details */}
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-0 space-y-3 overflow-hidden w-full min-w-0">
                      <div className="h-px bg-white/[0.08]" />
                      {/* Description */}
                      {rule.description && (
                        <div className="pt-1">
                          <p className="text-[10px] text-white/40 uppercase tracking-wider mb-1.5">O que verifica</p>
                          <p className="text-[12px] text-white/65 leading-relaxed break-words">{rule.description}</p>
                        </div>
                      )}

                      {/* Pattern */}
                      {rule.pattern && (
                        <div className="overflow-hidden w-full">
                          <p className="text-[10px] text-white/40 uppercase tracking-wider mb-1.5">Padrao</p>
                          <code className="text-[11px] text-emerald-400/90 font-mono bg-emerald-500/[0.08] border border-emerald-500/15 px-3 py-2 rounded-lg block break-all whitespace-pre-wrap">
                            {rule.pattern}
                          </code>
                        </div>
                      )}

                      {/* Actions */}
                      {!rule.isBuiltIn && (
                        <div className="flex gap-2 pt-2">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleStartEdit(rule); }}
                            className="flex-1 py-2 rounded-lg bg-white/[0.05] hover:bg-white/[0.10] text-[11px] text-white/60 hover:text-white/80 transition-colors font-medium"
                          >
                            Editar
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); deleteRule(rule.id); }}
                            className="px-4 py-2 rounded-lg border border-red-500/25 hover:border-red-500/50 hover:bg-red-500/10 text-[11px] text-red-400/70 hover:text-red-400 transition-colors"
                          >
                            Excluir
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setDeleteConfirm(null)}
          />
          {/* Modal */}
          <div className="relative bg-[#1a1a1a] border border-white/10 rounded-xl p-5 w-[320px] shadow-2xl">
            <h3 className="text-[16px] font-medium text-white/90 mb-2">
              Excluir arquivo de referência?
            </h3>
            <p
              className="text-[14px] text-white/50 mb-4 leading-relaxed break-words"
              style={{ wordBreak: 'break-word' }}
            >
              {deleteConfirm.name}
            </p>
            <p className="text-[13px] text-white/30 mb-4">
              Todas as regras extraídas deste arquivo também serão excluídas.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-2.5 text-[14px] text-white/60 hover:text-white/80 bg-white/[0.05] hover:bg-white/[0.08] rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteFile}
                className="flex-1 px-4 py-2.5 text-[14px] text-white bg-red-500/80 hover:bg-red-500 rounded-lg transition-colors"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Rule Modal */}
      {editingRule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setEditingRule(null)}
          />
          {/* Modal */}
          <div className="relative bg-[#1a1a1a] border border-white/10 rounded-2xl w-full max-w-[380px] shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-white/[0.06]">
              <div className="p-2 rounded-lg bg-white/[0.06]">
                <Icons.edit className="w-5 h-5 text-white/60" />
              </div>
              <div>
                <h3 className="text-[16px] font-medium text-white/90">Editar Regra</h3>
                <p className="text-[13px] text-white/40">Modifique os campos abaixo</p>
              </div>
            </div>

            {/* Form */}
            <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
              <div>
                <label className="text-[11px] text-white/40 uppercase tracking-wider mb-2 block">Nome da regra</label>
                <input
                  type="text"
                  value={editingRule.name}
                  onChange={(e) => setEditingRule(prev => prev ? { ...prev, name: e.target.value } : null)}
                  className="w-full px-3 py-3 text-[14px] rounded-lg bg-white/[0.04] border border-white/[0.08] text-white/90 placeholder:text-white/30 focus:outline-none focus:border-white/20 transition-colors"
                />
              </div>

              <div>
                <label className="text-[11px] text-white/40 uppercase tracking-wider mb-2 block">Descricao</label>
                <textarea
                  value={editingRule.description}
                  onChange={(e) => setEditingRule(prev => prev ? { ...prev, description: e.target.value } : null)}
                  placeholder="Explique o que esta regra verifica..."
                  rows={3}
                  className="w-full px-3 py-3 text-[14px] rounded-lg bg-white/[0.04] border border-white/[0.08] text-white/90 placeholder:text-white/30 focus:outline-none focus:border-white/20 transition-colors resize-none"
                />
              </div>

              <div>
                <label className="text-[11px] text-white/40 uppercase tracking-wider mb-2 block">Padrao de busca</label>
                <input
                  type="text"
                  value={editingRule.pattern}
                  onChange={(e) => setEditingRule(prev => prev ? { ...prev, pattern: e.target.value } : null)}
                  placeholder="Ex: palavra1|palavra2|palavra3"
                  className="w-full px-3 py-3 text-[14px] rounded-lg bg-white/[0.04] border border-white/[0.08] text-white/90 placeholder:text-white/30 focus:outline-none focus:border-white/20 transition-colors font-mono"
                />
                <p className="text-[12px] text-white/30 mt-1.5">Use | para separar palavras ou expressoes</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-white/40 uppercase tracking-wider mb-2 block">Categoria</label>
                  <select
                    value={editingRule.category}
                    onChange={(e) => setEditingRule(prev => prev ? { ...prev, category: e.target.value } : null)}
                    className="w-full px-3 py-3 text-[14px] rounded-lg bg-white/[0.04] border border-white/[0.08] text-white/90 focus:outline-none focus:border-white/20 transition-colors"
                  >
                    {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
                      <option key={key} value={key}>{config.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] text-white/40 uppercase tracking-wider mb-2 block">Prioridade</label>
                  <select
                    value={editingRule.severity}
                    onChange={(e) => setEditingRule(prev => prev ? { ...prev, severity: e.target.value } : null)}
                    className="w-full px-3 py-3 text-[14px] rounded-lg bg-white/[0.04] border border-white/[0.08] text-white/90 focus:outline-none focus:border-white/20 transition-colors"
                  >
                    {Object.entries(SEVERITY_CONFIG).map(([key, config]) => (
                      <option key={key} value={key}>{config.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] text-white/40 uppercase tracking-wider mb-2 block">Secao especifica</label>
                <select
                  value={editingRule.section}
                  onChange={(e) => setEditingRule(prev => prev ? { ...prev, section: e.target.value } : null)}
                  className="w-full px-3 py-3 text-[14px] rounded-lg bg-white/[0.04] border border-white/[0.08] text-white/90 focus:outline-none focus:border-white/20 transition-colors"
                >
                  <option value="">Aplicar em todas as secoes</option>
                  {Object.entries(SECTION_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-3 px-5 py-4 border-t border-white/[0.06] bg-white/[0.02]">
              <button
                onClick={() => setEditingRule(null)}
                className="flex-1 px-4 py-3 text-[14px] text-white/60 hover:text-white/80 bg-white/[0.04] hover:bg-white/[0.08] rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={saving || !editingRule.name}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 text-[14px] font-medium text-white bg-emerald-500/80 hover:bg-emerald-500 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <Icons.spinner className="w-4 h-4 animate-spin" />
                ) : (
                  <Icons.checkCircle className="w-4 h-4" />
                )}
                Salvar Alteracoes
              </button>
            </div>
          </div>
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
    <div className="flex flex-col h-full w-full min-w-0 gap-4 p-4">
      {/* Messages */}
      <div className="flex-1 space-y-3 w-full min-w-0 overflow-y-auto overflow-x-hidden pr-1">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center min-h-full">
            <div className="w-14 h-14 rounded-2xl bg-[#1a1e22] border border-white/[0.06] flex items-center justify-center mb-4">
              <Icons.message className="text-violet-400/60 w-5 h-5" />
            </div>
            <p className="text-[15px] text-white/60 mb-3 font-medium">Chat com IA</p>
            <div className="space-y-2 max-w-full w-full px-4">
              {["Como melhorar a introducao?", "A metodologia esta adequada?"].map((q) => (
                <button
                  key={q}
                  onClick={() => setMessage(q)}
                  className="block w-full text-[12px] text-white/40 hover:text-white/60 transition-colors px-3 py-1.5 rounded-lg hover:bg-white/[0.04] truncate"
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
                "max-w-[90%] p-3.5 rounded-2xl text-[13px] leading-relaxed break-words",
                msg.role === "user"
                  ? "ml-auto bg-violet-500 text-white"
                  : "bg-[#1a1e22] border border-white/[0.04] text-white/75"
              )}
            >
              {msg.content}
            </div>
          ))
        )}
      </div>

      {/* Input */}
      <div className="flex gap-2.5 w-full min-w-0 mt-auto pt-2">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Pergunte algo..."
          className="flex-1 px-4 py-3 text-[13px] rounded-xl bg-[#1a1e22] border border-white/[0.06] text-white/85 placeholder:text-white/40 focus:outline-none focus:border-white/15 transition-colors min-w-0"
        />
        <button
          onClick={handleSend}
          disabled={!message.trim()}
          className={cn(
            "w-11 h-11 rounded-xl flex items-center justify-center transition-all flex-shrink-0",
            message.trim()
              ? "bg-violet-500 text-white hover:bg-violet-400"
              : "bg-[#1a1e22] border border-white/[0.06] text-white/30"
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
        "flex items-center gap-4 p-4 rounded-2xl",
        "bg-[#1a1e22] backdrop-blur-xl border border-white/[0.06]",
        "hover:border-white/[0.12] hover:bg-[#1e2228] transition-all w-full text-left min-w-0",
        className
      )}
    >
      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/25 to-indigo-500/25 border border-violet-500/20 flex items-center justify-center flex-shrink-0">
        <Icons.sparkles className="text-violet-400" />
      </div>
      <div className="flex-1 min-w-0 overflow-hidden">
        <p className="text-[14px] font-semibold text-white/85 truncate">Orientador</p>
        {topSuggestion && (
          <p className="text-[12px] text-white/50 truncate mt-0.5">{topSuggestion}</p>
        )}
      </div>
      <div className={cn(
        "text-[15px] font-bold px-3 py-1.5 rounded-lg flex-shrink-0",
        score >= 70 ? "text-emerald-400 bg-emerald-500/10" :
        score >= 50 ? "text-amber-400 bg-amber-500/10" :
        "text-rose-400 bg-rose-500/10"
      )}>
        {score}%
      </div>
    </button>
  );
}
