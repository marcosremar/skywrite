"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { cn } from "@/lib/utils";
import { useRules, useReferenceFiles } from "@/hooks/useRules";
import { marked } from "marked";

// Configure marked for security
marked.setOptions({
  gfm: true,
  breaks: true,
});

// Minimal Icons
const Icons = {
  sparkles: (props: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="currentColor" className={props.className}>
      <path d="M12 0L13.59 6.41L20 8L13.59 9.59L12 16L10.41 9.59L4 8L10.41 6.41L12 0Z" />
      <path d="M6 12L6.79 14.21L9 15L6.79 15.79L6 18L5.21 15.79L3 15L5.21 14.21L6 12Z" opacity="0.7" />
      <path d="M18 14L18.53 15.47L20 16L18.53 16.53L18 18L17.47 16.53L16 16L17.47 15.47L18 14Z" opacity="0.7" />
    </svg>
  ),
  spinner: (props: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={props.className}>
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
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
  chevronDown: (props: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={props.className}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  ),
  chevronUp: (props: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={props.className}>
      <path d="m18 15-6-6-6 6" />
    </svg>
  ),
  settings: (props: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={props.className}>
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  x: (props: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={props.className}>
      <path d="M18 6 6 18" /><path d="m6 6 12 12" />
    </svg>
  ),
  chevronRight: (props: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={props.className}>
      <path d="m9 18 6-6-6-6" />
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
  trash: (props: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={props.className}>
      <path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
    </svg>
  ),
  checkCircle: (props: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={props.className}>
      <circle cx="12" cy="12" r="10" opacity="0.2" fill="currentColor" /><path d="m9 12 2 2 4-4" />
    </svg>
  ),
  layers: (props: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={props.className}>
      <path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z" /><path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65" />
    </svg>
  ),
  type: (props: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={props.className}>
      <polyline points="4 7 4 4 20 4 20 7" /><line x1="9" x2="15" y1="20" y2="20" /><line x1="12" x2="12" y1="4" y2="20" />
    </svg>
  ),
  quote: (props: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={props.className}>
      <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V21c0 1 0 1 1 1z" />
    </svg>
  ),
  pen: (props: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={props.className}>
      <path d="m12 19 7-7 3 3-7 7-3-3z" /><path d="m18 13-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
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

// Markdown Content Component
function MarkdownContent({ content, className }: { content: string; className?: string }) {
  const html = useMemo(() => {
    try {
      return marked.parse(content) as string;
    } catch {
      return content;
    }
  }, [content]);

  return (
    <div
      className={cn(
        "markdown-content max-w-none leading-relaxed",
        "[&_p]:my-1.5 [&_p]:leading-relaxed",
        "[&_ul]:my-1.5 [&_ul]:pl-4 [&_ul]:list-disc",
        "[&_ol]:my-1.5 [&_ol]:pl-4 [&_ol]:list-decimal",
        "[&_li]:my-0.5 [&_li]:leading-relaxed",
        "[&_h1]:text-base [&_h1]:font-semibold [&_h1]:my-2 [&_h1]:text-white/90",
        "[&_h2]:text-sm [&_h2]:font-semibold [&_h2]:my-2 [&_h2]:text-white/90",
        "[&_h3]:text-sm [&_h3]:font-medium [&_h3]:my-1.5 [&_h3]:text-white/85",
        "[&_strong]:text-white/90 [&_strong]:font-semibold",
        "[&_em]:italic [&_em]:text-white/70",
        "[&_code]:text-violet-300 [&_code]:bg-violet-500/10 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-[12px] [&_code]:font-mono",
        "[&_pre]:bg-white/5 [&_pre]:rounded-lg [&_pre]:p-3 [&_pre]:my-2 [&_pre]:overflow-x-auto",
        "[&_pre_code]:bg-transparent [&_pre_code]:p-0",
        "[&_a]:text-violet-400 [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:text-violet-300",
        "[&_blockquote]:border-l-2 [&_blockquote]:border-white/20 [&_blockquote]:pl-3 [&_blockquote]:my-2 [&_blockquote]:text-white/60 [&_blockquote]:italic",
        "[&>*:first-child]:mt-0 [&>*:last-child]:mb-0",
        className
      )}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

import type {
  ThesisAnalysis,
  SectionFeedback,
  SectionType,
} from "@/types/thesis-analysis";
import {
  getScoreLabel,
  SECTION_LABELS,
} from "@/types/thesis-analysis";
import { analyzeThesis } from "@/lib/thesis-analysis";

interface AIAdvisorProps {
  content: string;
  fileName?: string;
  className?: string;
}

// Category colors for the Grammarly-style issues list
const CATEGORY_COLORS: Record<string, { bg: string; border: string; text: string; dot: string }> = {
  structure: { bg: "bg-purple-500/10", border: "border-purple-500/30", text: "text-purple-300", dot: "bg-purple-400" },
  content: { bg: "bg-blue-500/10", border: "border-blue-500/30", text: "text-blue-300", dot: "bg-blue-400" },
  citation: { bg: "bg-amber-500/10", border: "border-amber-500/30", text: "text-amber-300", dot: "bg-amber-400" },
  style: { bg: "bg-emerald-500/10", border: "border-emerald-500/30", text: "text-emerald-300", dot: "bg-emerald-400" },
  methodology: { bg: "bg-rose-500/10", border: "border-rose-500/30", text: "text-rose-300", dot: "bg-rose-400" },
  default: { bg: "bg-white/5", border: "border-white/10", text: "text-white/70", dot: "bg-white/50" },
};

const CATEGORY_LABELS: Record<string, string> = {
  structure: "Estrutura",
  content: "Conteúdo",
  citation: "Citações",
  style: "Estilo",
  methodology: "Metodologia",
};

// Rule category configuration
const RULE_CATEGORY_CONFIG: Record<string, {
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  label: string;
}> = {
  STRUCTURE: {
    icon: <Icons.layers className="w-3.5 h-3.5" />,
    color: "text-purple-300",
    bgColor: "border border-purple-500/25",
    label: "Estrutura",
  },
  CONTENT: {
    icon: <Icons.type className="w-3.5 h-3.5" />,
    color: "text-blue-300",
    bgColor: "border border-blue-500/25",
    label: "Conteúdo",
  },
  CITATION: {
    icon: <Icons.quote className="w-3.5 h-3.5" />,
    color: "text-amber-300",
    bgColor: "border border-amber-500/25",
    label: "Citação",
  },
  STYLE: {
    icon: <Icons.pen className="w-3.5 h-3.5" />,
    color: "text-emerald-300",
    bgColor: "border border-emerald-500/25",
    label: "Estilo",
  },
  CUSTOM: {
    icon: <Icons.settings className="w-3.5 h-3.5" />,
    color: "text-pink-300",
    bgColor: "border border-pink-500/25",
    label: "Personalizado",
  },
};

// Rule severity configuration
const SEVERITY_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  ERROR: { label: "Obrigatório", color: "text-red-300", bgColor: "border border-red-500/25" },
  WARNING: { label: "Recomendado", color: "text-yellow-300", bgColor: "border border-yellow-500/25" },
  INFO: { label: "Sugestão", color: "text-blue-300", bgColor: "border border-blue-500/25" },
};

// Rule source icons and labels
const RULE_SOURCE_CONFIG: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  SYSTEM: { icon: <Icons.shield className="w-3 h-3" />, label: "Sistema", color: "text-violet-400" },
  USER: { icon: <Icons.user className="w-3 h-3" />, label: "Personalizada", color: "text-emerald-400" },
  REFERENCE: { icon: <Icons.link className="w-3 h-3" />, label: "De Referência", color: "text-blue-400" },
};

export function AIAdvisor({ content, fileName, className }: AIAdvisorProps) {
  const [analysis, setAnalysis] = useState<ThesisAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [pendingUpdate, setPendingUpdate] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(["content", "structure", "citation", "style", "methodology"]));
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

  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  };

  // Get primary section being analyzed
  const primarySection = analysis?.sections?.[0];
  const sectionLabel = primarySection ? SECTION_LABELS[primarySection.section] || primarySection.section : null;

  // Group all issues by category
  const groupedIssues = analysis ? groupIssuesByCategory(analysis) : {};

  return (
    <div className={cn(
      "flex flex-col h-full w-full max-w-full overflow-hidden bg-gradient-to-b from-[#16181c] to-[#0f1114]",
      className
    )}>
      {/* Header - Score + Section indicator */}
      <div className="flex-shrink-0 px-4 pt-4 pb-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          {/* Logo/Icon */}
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/25 to-indigo-500/25 flex items-center justify-center border border-violet-500/20 flex-shrink-0">
            <Icons.sparkles className="text-violet-400" />
          </div>

          {/* Title + Section */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-[15px] font-semibold text-white/95 tracking-tight">
                Orientador
              </h1>
              {pendingUpdate && (
                <div className="w-2 h-2 rounded-full bg-amber-400/80 animate-pulse" />
              )}
            </div>
            {sectionLabel && (
              <p className="text-[12px] text-white/50 truncate">
                Avaliando: <span className="text-violet-400">{sectionLabel}</span>
              </p>
            )}
            {!sectionLabel && !isAnalyzing && !analysis && (
              <p className="text-[12px] text-white/40">Comece a escrever...</p>
            )}
          </div>

          {/* Score Circle */}
          {analysis && (
            <ScoreCircle score={analysis.overallScore} />
          )}

          {isAnalyzing && !analysis && (
            <Icons.spinner className="w-6 h-6 text-white/40 animate-spin flex-shrink-0" />
          )}

          {/* Settings Button */}
          <button
            onClick={() => setShowSettings(true)}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white/40 hover:text-white/70 hover:bg-white/[0.06] transition-colors flex-shrink-0"
            title="Configurações"
          >
            <Icons.settings />
          </button>
        </div>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <SettingsPanel onClose={() => setShowSettings(false)} />
      )}

      {/* Main Content - Issues List (Grammarly-style) */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        {!analysis && isAnalyzing && <LoadingState />}
        {!analysis && !isAnalyzing && <EmptyState />}

        {analysis && (
          <div className="p-4 space-y-3">
            {/* Quick Stats */}
            <div className="flex items-center gap-3 pb-3 border-b border-white/[0.06]">
              <div className="flex-1">
                <p className="text-[11px] text-white/40 uppercase tracking-wider mb-1">Sugestões</p>
                <p className="text-[20px] font-bold text-white/90">
                  {Object.values(groupedIssues).flat().length}
                </p>
              </div>
              <div className="flex-1 text-right">
                <p className="text-[11px] text-white/40 uppercase tracking-wider mb-1">Status</p>
                <p className={cn(
                  "text-[13px] font-medium",
                  analysis.overallScore >= 70 ? "text-emerald-400" :
                  analysis.overallScore >= 50 ? "text-amber-400" : "text-rose-400"
                )}>
                  {getScoreLabel(analysis.overallScore)}
                </p>
              </div>
            </div>

            {/* Issues by Category */}
            {Object.entries(groupedIssues).map(([category, issues]) => {
              const colors = CATEGORY_COLORS[category] || CATEGORY_COLORS.default;
              const isExpanded = expandedCategories.has(category);
              const label = CATEGORY_LABELS[category] || category;

              return (
                <div key={category} className="rounded-xl overflow-hidden">
                  {/* Category Header */}
                  <button
                    onClick={() => toggleCategory(category)}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3 transition-colors",
                      colors.bg, "hover:brightness-110"
                    )}
                  >
                    <div className={cn("w-2.5 h-2.5 rounded-full flex-shrink-0", colors.dot)} />
                    <span className={cn("flex-1 text-left text-[13px] font-medium", colors.text)}>
                      {label}
                    </span>
                    <span className={cn("text-[12px] px-2 py-0.5 rounded-full", colors.bg, colors.text)}>
                      {issues.length}
                    </span>
                    {isExpanded ? (
                      <Icons.chevronUp className={colors.text} />
                    ) : (
                      <Icons.chevronDown className={colors.text} />
                    )}
                  </button>

                  {/* Issues List */}
                  {isExpanded && (
                    <div className={cn("border-t", colors.border)}>
                      {issues.map((issue, idx) => (
                        <div
                          key={idx}
                          className={cn(
                            "px-4 py-3 border-b last:border-b-0 transition-colors hover:bg-white/[0.02]",
                            colors.border
                          )}
                        >
                          <MarkdownContent
                            content={issue.text}
                            className="text-[13px] text-white/80"
                          />
                          {issue.section && (
                            <p className="text-[11px] text-white/40 mt-1.5">
                              {SECTION_LABELS[issue.section as SectionType] || issue.section}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Empty Issues State */}
            {Object.keys(groupedIssues).length === 0 && (
              <div className="text-center py-8">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-3">
                  <span className="text-lg">✓</span>
                </div>
                <p className="text-[14px] text-emerald-400 font-medium">Excelente trabalho!</p>
                <p className="text-[12px] text-white/40 mt-1">Nenhuma sugestão no momento</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Chat Toggle Button */}
      <div className="flex-shrink-0 border-t border-white/[0.06]">
        <button
          onClick={() => setShowChat(!showChat)}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 text-[13px] text-white/60 hover:text-white/80 hover:bg-white/[0.03] transition-colors"
        >
          <Icons.message className="w-4 h-4" />
          <span>{showChat ? "Esconder Chat" : "Perguntar ao Orientador"}</span>
          {showChat ? <Icons.chevronDown /> : <Icons.chevronUp />}
        </button>

        {/* Chat Panel */}
        {showChat && <ChatPanel />}
      </div>
    </div>
  );
}

// Helper: Group all issues by category
function groupIssuesByCategory(analysis: ThesisAnalysis): Record<string, Array<{ text: string; section?: string }>> {
  const grouped: Record<string, Array<{ text: string; section?: string }>> = {};

  for (const section of analysis.sections) {
    // Add weaknesses as issues
    for (const weakness of section.weaknesses) {
      const category = inferCategory(weakness);
      if (!grouped[category]) grouped[category] = [];
      grouped[category].push({ text: weakness, section: section.section });
    }

    // Add suggestions as issues
    for (const suggestion of section.suggestions) {
      const category = inferCategory(suggestion);
      if (!grouped[category]) grouped[category] = [];
      grouped[category].push({ text: suggestion, section: section.section });
    }
  }

  // Add improvement areas from summary
  for (const area of analysis.summary.improvementAreas) {
    const category = inferCategory(area);
    if (!grouped[category]) grouped[category] = [];
    grouped[category].push({ text: area });
  }

  return grouped;
}

// Helper: Infer category from issue text
function inferCategory(text: string): string {
  const lower = text.toLowerCase();

  if (lower.includes("citaç") || lower.includes("referência") || lower.includes("fonte")) {
    return "citation";
  }
  if (lower.includes("estrutura") || lower.includes("organiza") || lower.includes("seção") || lower.includes("título")) {
    return "structure";
  }
  if (lower.includes("metodolog") || lower.includes("método") || lower.includes("procedimento")) {
    return "methodology";
  }
  if (lower.includes("estilo") || lower.includes("tom") || lower.includes("linguagem") || lower.includes("formal")) {
    return "style";
  }
  return "content";
}

// Score Circle Component
function ScoreCircle({ score }: { score: number }) {
  const circumference = 2 * Math.PI * 18;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  const color = score >= 70 ? "text-emerald-400" : score >= 50 ? "text-amber-400" : "text-rose-400";
  const strokeColor = score >= 70 ? "#34d399" : score >= 50 ? "#fbbf24" : "#f87171";

  return (
    <div className="relative w-12 h-12 flex-shrink-0">
      <svg className="w-12 h-12 -rotate-90">
        {/* Background circle */}
        <circle
          cx="24"
          cy="24"
          r="18"
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth="3"
        />
        {/* Progress circle */}
        <circle
          cx="24"
          cy="24"
          r="18"
          fill="none"
          stroke={strokeColor}
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <div className={cn("absolute inset-0 flex items-center justify-center", color)}>
        <span className="text-[13px] font-bold">{score}</span>
      </div>
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
    <div className="flex flex-col items-center justify-center py-20 text-center px-6">
      <div className="w-16 h-16 rounded-2xl bg-[#1a1e22] border border-white/[0.06] flex items-center justify-center mb-5">
        <Icons.sparkles className="text-violet-400/60 w-7 h-7" />
      </div>
      <p className="text-[16px] text-white/70 mb-2 font-semibold">Orientador Virtual</p>
      <p className="text-[13px] text-white/40 max-w-[220px] leading-relaxed">
        Comece a escrever para receber sugestões inteligentes
      </p>
    </div>
  );
}

function ChatPanel() {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Array<{ role: "user" | "assistant"; content: string }>>([]);

  const handleSend = () => {
    if (!message.trim()) return;
    setMessages(prev => [...prev, { role: "user", content: message }]);
    setTimeout(() => {
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "Esta funcionalidade será implementada em breve. Use a análise automática para feedback."
      }]);
    }, 800);
    setMessage("");
  };

  return (
    <div className="border-t border-white/[0.06] bg-[#0f1114]">
      {/* Messages */}
      <div className="max-h-[200px] overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="text-center py-4">
            <p className="text-[12px] text-white/40">
              Pergunte sobre seu texto...
            </p>
          </div>
        ) : (
          messages.map((msg, i) => (
            <div
              key={i}
              className={cn(
                "max-w-[85%] p-3 rounded-2xl text-[13px] leading-relaxed",
                msg.role === "user"
                  ? "ml-auto bg-violet-500 text-white"
                  : "bg-white/[0.06] text-white/75"
              )}
            >
              {msg.role === "assistant" ? (
                <MarkdownContent content={msg.content} className="text-[13px]" />
              ) : (
                msg.content
              )}
            </div>
          ))
        )}
      </div>

      {/* Input */}
      <div className="flex gap-2 p-4 pt-0">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Pergunte algo..."
          className="flex-1 px-4 py-2.5 text-[13px] rounded-xl bg-white/[0.06] border border-white/[0.06] text-white/85 placeholder:text-white/40 focus:outline-none focus:border-white/15 transition-colors"
        />
        <button
          onClick={handleSend}
          disabled={!message.trim()}
          className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center transition-all flex-shrink-0",
            message.trim()
              ? "bg-violet-500 text-white hover:bg-violet-400"
              : "bg-white/[0.06] text-white/30"
          )}
        >
          <Icons.send />
        </button>
      </div>
    </div>
  );
}

// Settings Panel Component with detailed rule view
function SettingsPanel({ onClose }: { onClose: () => void }) {
  const { rules, loading, toggleRule, deleteRule, refetch: refetchRules } = useRules();
  const { files, uploading, uploadFile, deleteFile, refetch: refetchFiles } = useReferenceFiles();
  const [expandedRule, setExpandedRule] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string; type: "file" | "rule" } | null>(null);
  const [activeTab, setActiveTab] = useState<"system" | "reference" | "user">("system");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const systemRules = rules.filter(r => r.type === "SYSTEM");
  const userRules = rules.filter(r => r.type === "USER");
  const referenceRules = rules.filter(r => r.type === "REFERENCE");

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await uploadFile(file);
      await Promise.all([refetchRules(), refetchFiles()]);
    } catch (err) {
      console.error("Failed to upload file:", err);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      if (deleteConfirm.type === "file") {
        await deleteFile(deleteConfirm.id);
      } else {
        await deleteRule(deleteConfirm.id);
      }
      setDeleteConfirm(null);
    } catch (err) {
      console.error("Failed to delete:", err);
    }
  };

  const tabs = [
    { id: "system" as const, label: "Sistema", icon: <Icons.shield />, count: systemRules.length },
    { id: "reference" as const, label: "Referências", icon: <Icons.link />, count: referenceRules.length },
    { id: "user" as const, label: "Minhas", icon: <Icons.user />, count: userRules.length },
  ];

  const currentRules = activeTab === "system" ? systemRules : activeTab === "reference" ? referenceRules : userRules;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-[#16181c] border border-white/10 rounded-2xl w-full max-w-xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <Icons.settings className="text-white/50" />
            <h2 className="text-[16px] font-semibold text-white/90">Configurações do Orientador</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-white/40 hover:text-white/70 hover:bg-white/[0.06] transition-colors"
          >
            <Icons.x />
          </button>
        </div>

        {/* Tabs */}
        <div className="px-5 pt-4">
          <div className="flex gap-1 p-1 rounded-xl bg-white/[0.04]">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 px-3 py-2.5 text-[12px] font-medium rounded-lg transition-all",
                  activeTab === tab.id
                    ? "bg-white/[0.08] text-white"
                    : "text-white/50 hover:text-white/70 hover:bg-white/[0.04]"
                )}
              >
                <span className={activeTab === tab.id ? "text-white/80" : "text-white/40"}>{tab.icon}</span>
                <span>{tab.label}</span>
                <span className={cn(
                  "px-1.5 py-0.5 rounded-md text-[10px]",
                  activeTab === tab.id ? "bg-white/[0.10] text-white/80" : "bg-white/[0.04] text-white/40"
                )}>{tab.count}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Reference Files Upload (only on reference tab) */}
          {activeTab === "reference" && (
            <div className="space-y-3 pb-4 border-b border-white/[0.06]">
              <p className="text-[12px] text-white/50">
                Envie artigos de exemplo para extrair regras automaticamente
              </p>

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
                className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-white/[0.04] border border-dashed border-white/[0.15] hover:border-white/[0.25] hover:bg-white/[0.06] transition-all text-[13px] text-white/60 disabled:opacity-50"
              >
                {uploading ? (
                  <Icons.spinner className="w-4 h-4 animate-spin" />
                ) : (
                  <Icons.upload className="w-4 h-4" />
                )}
                <span>{uploading ? "Analisando com IA..." : "Enviar Arquivo (PDF, TXT, MD)"}</span>
              </button>

              {/* Uploaded files list */}
              {files.length > 0 && (
                <div className="space-y-2">
                  {files.map(file => (
                    <div
                      key={file.id}
                      className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]"
                    >
                      <Icons.file className="w-4 h-4 text-blue-400" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] text-white/70 truncate">{file.originalName}</p>
                        <p className="text-[11px] text-blue-400/70">
                          {file._count?.rules ?? 0} regras extraídas
                        </p>
                      </div>
                      <button
                        onClick={() => setDeleteConfirm({ id: file.id, name: file.originalName, type: "file" })}
                        className="p-1.5 rounded-lg text-red-400/60 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      >
                        <Icons.trash />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Rules List */}
          {loading ? (
            <div className="flex justify-center py-12">
              <Icons.spinner className="w-6 h-6 text-white/40 animate-spin" />
            </div>
          ) : currentRules.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center mx-auto mb-3">
                {activeTab === "system" ? <Icons.shield className="w-5 h-5 text-white/30" /> :
                 activeTab === "reference" ? <Icons.link className="w-5 h-5 text-white/30" /> :
                 <Icons.user className="w-5 h-5 text-white/30" />}
              </div>
              <p className="text-[13px] text-white/50">
                {activeTab === "system" ? "Nenhuma regra do sistema" :
                 activeTab === "reference" ? "Envie um arquivo para extrair regras" :
                 "Nenhuma regra personalizada"}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {currentRules.map(rule => {
                const isExpanded = expandedRule === rule.id;
                const categoryConfig = RULE_CATEGORY_CONFIG[rule.category] || RULE_CATEGORY_CONFIG.CUSTOM;
                const severityConfig = SEVERITY_CONFIG[rule.severity] || SEVERITY_CONFIG.INFO;
                const sourceConfig = RULE_SOURCE_CONFIG[rule.type] || RULE_SOURCE_CONFIG.SYSTEM;

                return (
                  <div
                    key={rule.id}
                    className={cn(
                      "rounded-xl overflow-hidden border transition-all",
                      rule.isEnabled ? "border-white/[0.06] bg-white/[0.02]" : "border-white/[0.03] bg-transparent opacity-60"
                    )}
                  >
                    {/* Rule Header */}
                    <div
                      className="flex items-start gap-3 p-4 cursor-pointer hover:bg-white/[0.02] transition-colors"
                      onClick={() => setExpandedRule(isExpanded ? null : rule.id)}
                    >
                      {/* Toggle */}
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleRule(rule.id); }}
                        className={cn(
                          "w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors",
                          rule.isEnabled
                            ? "bg-emerald-500/20 border border-emerald-500/40"
                            : "border border-white/20 hover:border-white/40"
                        )}
                      >
                        {rule.isEnabled && (
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-emerald-400">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                      </button>

                      {/* Category Icon */}
                      <div className={cn("p-1.5 rounded-lg flex-shrink-0", categoryConfig.bgColor)}>
                        <span className={categoryConfig.color}>{categoryConfig.icon}</span>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-[13px] text-white/85 font-medium truncate flex-1">{rule.name}</p>
                          <Icons.chevronRight className={cn(
                            "text-white/40 flex-shrink-0 w-3.5 h-3.5 transition-transform",
                            isExpanded && "rotate-90"
                          )} />
                        </div>

                        {/* Tags */}
                        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                          <span className={cn("text-[10px] px-1.5 py-0.5 rounded-md", categoryConfig.bgColor, categoryConfig.color)}>
                            {categoryConfig.label}
                          </span>
                          <span className={cn("text-[10px] px-1.5 py-0.5 rounded-md", severityConfig.bgColor, severityConfig.color)}>
                            {severityConfig.label}
                          </span>
                          {rule.section && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-md border border-white/[0.08] text-white/50">
                              {SECTION_LABELS[rule.section as SectionType] || rule.section}
                            </span>
                          )}
                        </div>

                        {/* Source file (for reference rules) */}
                        {rule.referenceFile && (
                          <div className="flex items-center gap-1.5 mt-2">
                            <Icons.file className="w-3 h-3 text-blue-400/70" />
                            <span className="text-[11px] text-blue-400/70 truncate">
                              Extraída de: {rule.referenceFile.originalName || rule.referenceFile.name}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Expanded Details */}
                    {isExpanded && (
                      <div className="px-4 pb-4 pt-0 space-y-3 border-t border-white/[0.06] mt-0">
                        {/* Description */}
                        {rule.description && (
                          <div className="pt-3">
                            <p className="text-[10px] text-white/40 uppercase tracking-wider mb-1.5">O que verifica</p>
                            <p className="text-[12px] text-white/65 leading-relaxed">{rule.description}</p>
                          </div>
                        )}

                        {/* Pattern */}
                        {rule.pattern && (
                          <div>
                            <p className="text-[10px] text-white/40 uppercase tracking-wider mb-1.5">Padrão de busca</p>
                            <code className="text-[11px] text-emerald-400/90 font-mono bg-emerald-500/[0.08] border border-emerald-500/15 px-3 py-2 rounded-lg block break-all whitespace-pre-wrap">
                              {rule.pattern}
                            </code>
                          </div>
                        )}

                        {/* Source */}
                        <div className="flex items-center gap-2 pt-1">
                          <span className="text-[10px] text-white/40">Origem:</span>
                          <span className={cn("flex items-center gap-1 text-[11px]", sourceConfig.color)}>
                            {sourceConfig.icon}
                            {sourceConfig.label}
                          </span>
                        </div>

                        {/* Actions (for non-system rules) */}
                        {rule.type !== "SYSTEM" && (
                          <div className="flex gap-2 pt-2">
                            <button
                              onClick={(e) => { e.stopPropagation(); setDeleteConfirm({ id: rule.id, name: rule.name, type: "rule" }); }}
                              className="px-4 py-2 rounded-lg border border-red-500/25 hover:border-red-500/50 hover:bg-red-500/10 text-[11px] text-red-400/70 hover:text-red-400 transition-colors"
                            >
                              Excluir Regra
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 px-5 py-3 border-t border-white/[0.06] bg-white/[0.02]">
          <div className="flex items-center justify-between text-[11px] text-white/40">
            <span>{rules.filter(r => r.isEnabled).length} regras ativas de {rules.length}</span>
            <span>{files.length} arquivos de referência</span>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setDeleteConfirm(null)} />
          <div className="relative bg-[#1a1e22] border border-white/10 rounded-xl p-5 w-[320px]">
            <h3 className="text-[15px] font-medium text-white/90 mb-2">
              Excluir {deleteConfirm.type === "file" ? "arquivo" : "regra"}?
            </h3>
            <p className="text-[13px] text-white/50 mb-4 break-words">{deleteConfirm.name}</p>
            {deleteConfirm.type === "file" && (
              <p className="text-[12px] text-white/30 mb-4">As regras extraídas também serão excluídas.</p>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-2.5 text-[13px] text-white/60 bg-white/[0.05] hover:bg-white/[0.08] rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 px-4 py-2.5 text-[13px] text-white bg-red-500/80 hover:bg-red-500 rounded-lg transition-colors"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
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
