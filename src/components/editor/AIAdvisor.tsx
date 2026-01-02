"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";

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
};

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

export function AIAdvisor({ content, fileName, className }: AIAdvisorProps) {
  const [analysis, setAnalysis] = useState<ThesisAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [pendingUpdate, setPendingUpdate] = useState(false);
  const [showChat, setShowChat] = useState(false);
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
        </div>
      </div>

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
                          <p className="text-[13px] text-white/80 leading-relaxed">
                            {issue.text}
                          </p>
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
              {msg.content}
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
