"use client";

import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { ProgressRing } from "@/components/ui/progress-ring";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Bot,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  ChevronDown,
  ChevronRight,
  Loader2,
  TrendingUp,
  Target,
  BookOpen,
  MessageSquare,
  Send,
} from "lucide-react";
import type {
  ThesisAnalysis,
  SectionFeedback,
  SectionType,
} from "@/types/thesis-analysis";
import {
  getScoreLabel,
  getScoreColor,
} from "@/types/thesis-analysis";
import { analyzeThesis } from "@/lib/thesis-analysis";

interface AIAdvisorProps {
  content: string;
  className?: string;
}

export function AIAdvisor({
  content,
  className,
}: AIAdvisorProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const [expandedSections, setExpandedSections] = useState<Set<SectionType>>(
    new Set()
  );
  const [analysis, setAnalysis] = useState<ThesisAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-analyze when content changes (debounced)
  useEffect(() => {
    if (!content || content.trim().length < 50) {
      return;
    }

    // Clear previous timeout
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    setIsAnalyzing(true);

    // Debounce analysis by 1 second after user stops typing
    debounceRef.current = setTimeout(() => {
      const result = analyzeThesis(content);
      setAnalysis(result);
      setIsAnalyzing(false);
    }, 1000);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [content]);

  const toggleSection = (section: SectionType) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  return (
    <div className={cn("flex flex-col h-full bg-card", className)}>
      {/* Header */}
      <div className="p-4 border-b border-border bg-gradient-to-r from-primary/5 to-transparent">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <Bot className="h-4 w-4 text-primary" />
            </div>
            Orientador Virtual
          </h3>

          {isAnalyzing ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          ) : analysis ? (
            <ProgressRing
              progress={analysis.overallScore}
              size={44}
              strokeWidth={3}
            />
          ) : null}
        </div>

        {isAnalyzing ? (
          <p className="text-sm text-muted-foreground">
            Analisando documento...
          </p>
        ) : analysis ? (
          <div className="flex items-center gap-2 text-sm">
            <span className={cn("font-medium", getScoreColor(analysis.overallScore))}>
              {getScoreLabel(analysis.overallScore)}
            </span>
            <span className="text-muted-foreground">
              - Atualizado:{" "}
              {new Date(analysis.analyzedAt).toLocaleTimeString("pt-BR", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Comece a escrever para receber feedback
          </p>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="mx-4 mt-3 grid grid-cols-3">
          <TabsTrigger value="overview" className="text-xs">
            <Target className="h-3 w-3 mr-1" />
            Visao Geral
          </TabsTrigger>
          <TabsTrigger value="sections" className="text-xs">
            <BookOpen className="h-3 w-3 mr-1" />
            Por Secao
          </TabsTrigger>
          <TabsTrigger value="chat" className="text-xs">
            <MessageSquare className="h-3 w-3 mr-1" />
            Perguntar
          </TabsTrigger>
        </TabsList>

        <ScrollArea className="flex-1">
          {/* Overview Tab */}
          <TabsContent value="overview" className="p-4 m-0">
            {isAnalyzing ? (
              <AnalyzingState />
            ) : !analysis ? (
              <WaitingState />
            ) : (
              <OverviewContent analysis={analysis} />
            )}
          </TabsContent>

          {/* Sections Tab */}
          <TabsContent value="sections" className="p-4 m-0">
            {isAnalyzing ? (
              <AnalyzingState />
            ) : !analysis ? (
              <WaitingState />
            ) : (
              <div className="space-y-2">
                {analysis.sections.map((section) => (
                  <SectionCard
                    key={section.section}
                    feedback={section}
                    isExpanded={expandedSections.has(section.section)}
                    onToggle={() => toggleSection(section.section)}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Chat Tab */}
          <TabsContent value="chat" className="p-4 m-0">
            <ChatInterface />
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </div>
  );
}

function AnalyzingState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="p-4 rounded-full bg-primary/10 mb-4">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
      </div>
      <h4 className="font-semibold mb-2">Analisando...</h4>
      <p className="text-sm text-muted-foreground max-w-[200px]">
        Avaliando estrutura e conteudo do seu documento
      </p>
    </div>
  );
}

function WaitingState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="p-4 rounded-full bg-primary/10 mb-4">
        <Bot className="h-8 w-8 text-primary" />
      </div>
      <h4 className="font-semibold mb-2">Orientador Virtual</h4>
      <p className="text-sm text-muted-foreground mb-6 max-w-[200px]">
        Comece a escrever para receber feedback automatico
      </p>

      <div className="space-y-2 text-left text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-green-500" />
          <span>Analisa estrutura por secao</span>
        </div>
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-green-500" />
          <span>Identifica elementos ausentes</span>
        </div>
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-green-500" />
          <span>Sugere melhorias especificas</span>
        </div>
      </div>
    </div>
  );
}

function OverviewContent({ analysis }: { analysis: ThesisAnalysis }) {
  return (
    <div className="space-y-6">
      {/* Score Summary */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <span className="text-xs font-medium text-green-500">Pontos Fortes</span>
          </div>
          <p className="text-2xl font-bold text-green-500">
            {analysis.summary.strongPoints.length}
          </p>
        </div>

        <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
            <span className="text-xs font-medium text-yellow-500">A Melhorar</span>
          </div>
          <p className="text-2xl font-bold text-yellow-500">
            {analysis.summary.improvementAreas.length}
          </p>
        </div>
      </div>

      {/* Strong Points */}
      {analysis.summary.strongPoints.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            O que esta bom
          </h4>
          <div className="space-y-1">
            {analysis.summary.strongPoints.map((point, i) => (
              <div
                key={i}
                className="text-sm text-muted-foreground pl-6 py-1 border-l-2 border-green-500/30"
              >
                {point}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Improvement Areas */}
      {analysis.summary.improvementAreas.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
            O que melhorar
          </h4>
          <div className="space-y-1">
            {analysis.summary.improvementAreas.map((area, i) => (
              <div
                key={i}
                className="text-sm text-muted-foreground pl-6 py-1 border-l-2 border-yellow-500/30"
              >
                {area}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Next Steps */}
      {analysis.summary.nextSteps.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-primary" />
            Proximos Passos
          </h4>
          <div className="space-y-2">
            {analysis.summary.nextSteps.map((step, i) => (
              <div
                key={i}
                className="flex items-start gap-2 text-sm p-2 rounded-lg bg-primary/5 border border-primary/10"
              >
                <TrendingUp className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <span>{step}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sections Overview */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium">Progresso por Secao</h4>
        <div className="space-y-2">
          {analysis.sections.map((section) => (
            <div
              key={section.section}
              className="flex items-center gap-3 p-2 rounded-lg bg-muted/30"
            >
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">{section.sectionLabel}</span>
                  <span
                    className={cn(
                      "text-xs font-medium",
                      getScoreColor(section.score)
                    )}
                  >
                    {section.score}%
                  </span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      section.score >= 70
                        ? "bg-green-500"
                        : section.score >= 50
                        ? "bg-yellow-500"
                        : "bg-red-500"
                    )}
                    style={{ width: `${section.score}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SectionCard({
  feedback,
  isExpanded,
  onToggle,
}: {
  feedback: SectionFeedback;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border overflow-hidden transition-all",
        feedback.priority === "high"
          ? "border-red-500/30 bg-red-500/5"
          : feedback.priority === "medium"
          ? "border-yellow-500/30 bg-yellow-500/5"
          : "border-border bg-card"
      )}
    >
      <button
        onClick={onToggle}
        className="w-full p-3 flex items-center gap-3 hover:bg-muted/30 transition-colors"
      >
        {isExpanded ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        )}

        <div className="flex-1 text-left">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">{feedback.sectionLabel}</span>
            {feedback.priority === "high" && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-500">
                PRIORIDADE
              </span>
            )}
          </div>
        </div>

        <ProgressRing
          progress={feedback.score}
          size={32}
          strokeWidth={2}
          className="shrink-0"
        />
      </button>

      {isExpanded && (
        <div className="px-3 pb-3 space-y-3 border-t border-border/50 pt-3">
          {/* Strengths */}
          {feedback.strengths.length > 0 && (
            <div>
              <p className="text-xs font-medium text-green-500 mb-1.5 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Pontos fortes
              </p>
              <ul className="space-y-1">
                {feedback.strengths.map((s, i) => (
                  <li key={i} className="text-xs text-muted-foreground pl-4">
                    • {s}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Weaknesses */}
          {feedback.weaknesses.length > 0 && (
            <div>
              <p className="text-xs font-medium text-yellow-500 mb-1.5 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                A melhorar
              </p>
              <ul className="space-y-1">
                {feedback.weaknesses.map((w, i) => (
                  <li key={i} className="text-xs text-muted-foreground pl-4">
                    • {w}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Suggestions */}
          {feedback.suggestions.length > 0 && (
            <div>
              <p className="text-xs font-medium text-primary mb-1.5 flex items-center gap-1">
                <Lightbulb className="h-3 w-3" />
                Sugestoes
              </p>
              <ul className="space-y-1.5">
                {feedback.suggestions.map((s, i) => (
                  <li
                    key={i}
                    className="text-xs p-2 rounded bg-primary/5 border border-primary/10"
                  >
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ChatInterface() {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<
    Array<{ role: "user" | "assistant"; content: string }>
  >([]);

  const handleSend = () => {
    if (!message.trim()) return;

    setMessages((prev) => [...prev, { role: "user", content: message }]);

    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Esta funcionalidade de chat com IA sera implementada em breve. Por enquanto, use a analise automatica para obter feedback sobre seu texto.",
        },
      ]);
    }, 1000);

    setMessage("");
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 space-y-3 mb-4">
        {messages.length === 0 ? (
          <div className="text-center py-8">
            <MessageSquare className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground">
              Pergunte ao orientador virtual sobre sua tese
            </p>
            <div className="mt-4 space-y-2">
              <p className="text-xs text-muted-foreground">Exemplos:</p>
              <button
                onClick={() =>
                  setMessage("Como posso melhorar minha introducao?")
                }
                className="text-xs text-primary hover:underline block mx-auto"
              >
                "Como posso melhorar minha introducao?"
              </button>
              <button
                onClick={() =>
                  setMessage("Minha revisao de literatura esta adequada?")
                }
                className="text-xs text-primary hover:underline block mx-auto"
              >
                "Minha revisao de literatura esta adequada?"
              </button>
            </div>
          </div>
        ) : (
          messages.map((msg, i) => (
            <div
              key={i}
              className={cn(
                "p-3 rounded-lg text-sm",
                msg.role === "user"
                  ? "bg-primary text-primary-foreground ml-8"
                  : "bg-muted mr-8"
              )}
            >
              {msg.content}
            </div>
          ))
        )}
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Pergunte algo sobre sua tese..."
          className="flex-1 px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
        <Button size="icon" onClick={handleSend} disabled={!message.trim()}>
          <Send className="h-4 w-4" />
        </Button>
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
        "flex items-center gap-3 p-3 rounded-lg border border-border bg-card hover:bg-muted/30 transition-colors w-full text-left",
        className
      )}
    >
      <ProgressRing progress={score} size={36} strokeWidth={3} />

      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium">Orientador Virtual</p>
        {topSuggestion && (
          <p className="text-xs text-muted-foreground truncate">
            {topSuggestion}
          </p>
        )}
      </div>

      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    </button>
  );
}
