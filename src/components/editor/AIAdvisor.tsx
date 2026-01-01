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
  Target,
  BookOpen,
  MessageSquare,
  Send,
  XCircle,
  Plus,
  Settings2,
  Trash2,
  Shield,
  User,
} from "lucide-react";
import type {
  ThesisAnalysis,
  SectionFeedback,
  SectionType,
  Rule,
  RuleResult,
} from "@/types/thesis-analysis";
import {
  getScoreLabel,
  getScoreColor,
  SYSTEM_RULES,
  SECTION_LABELS,
} from "@/types/thesis-analysis";
import { analyzeThesis, getAllRules, saveUserRules } from "@/lib/thesis-analysis";

interface AIAdvisorProps {
  content: string;
  fileName?: string;
  className?: string;
}

export function AIAdvisor({
  content,
  fileName,
  className,
}: AIAdvisorProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const [expandedSections, setExpandedSections] = useState<Set<SectionType>>(
    new Set()
  );
  const [analysis, setAnalysis] = useState<ThesisAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [pendingUpdate, setPendingUpdate] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const lastContentRef = useRef<string>("");

  // Auto-analyze when content changes (debounced - waits 3 seconds after user stops typing)
  useEffect(() => {
    // Clear previous timeout
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Reset analysis if content is empty or too short
    if (!content || content.trim().length < 50) {
      setAnalysis(null);
      setIsAnalyzing(false);
      setPendingUpdate(false);
      return;
    }

    // Skip if content hasn't actually changed
    if (content === lastContentRef.current) {
      return;
    }

    // Show subtle indicator that update is pending (not the loading spinner)
    setPendingUpdate(true);

    // Wait 3 seconds after user stops typing before analyzing
    debounceRef.current = setTimeout(() => {
      setIsAnalyzing(true);
      setPendingUpdate(false);

      // Small delay to show analyzing state, then compute
      requestAnimationFrame(() => {
        const result = analyzeThesis(content);
        lastContentRef.current = content;
        setAnalysis(result);
        setIsAnalyzing(false);
      });
    }, 3000);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [content]);

  // Initial analysis when component mounts (no delay)
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
          <div>
            <h3 className="font-semibold flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-primary/10">
                <Bot className="h-4 w-4 text-primary" />
              </div>
              Orientador Virtual
            </h3>
            {fileName && (
              <p className="text-xs text-muted-foreground mt-1 ml-8">
                Analisando: {fileName}
              </p>
            )}
          </div>

          {analysis ? (
            <div className="relative">
              <ProgressRing
                progress={analysis.overallScore}
                size={44}
                strokeWidth={3}
              />
              {/* Subtle dot indicator when update is pending */}
              {pendingUpdate && (
                <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-primary rounded-full animate-pulse" />
              )}
            </div>
          ) : isAnalyzing ? (
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          ) : null}
        </div>

        {isAnalyzing && !analysis ? (
          <p className="text-sm text-muted-foreground">
            Analisando documento...
          </p>
        ) : analysis ? (
          <div className="flex items-center gap-2 text-sm">
            <span className={cn("font-medium", getScoreColor(analysis.overallScore))}>
              {getScoreLabel(analysis.overallScore)}
            </span>
            {pendingUpdate ? (
              <span className="text-muted-foreground text-xs">
                - Atualizando em breve...
              </span>
            ) : (
              <span className="text-muted-foreground">
                - Atualizado:{" "}
                {new Date(analysis.analyzedAt).toLocaleTimeString("pt-BR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Comece a escrever para receber feedback
          </p>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="mx-4 mt-3 grid grid-cols-4">
          <TabsTrigger value="overview" className="text-xs">
            <Target className="h-3 w-3 mr-1" />
            Geral
          </TabsTrigger>
          <TabsTrigger value="sections" className="text-xs">
            <BookOpen className="h-3 w-3 mr-1" />
            Secao
          </TabsTrigger>
          <TabsTrigger value="rules" className="text-xs">
            <Settings2 className="h-3 w-3 mr-1" />
            Regras
          </TabsTrigger>
          <TabsTrigger value="chat" className="text-xs">
            <MessageSquare className="h-3 w-3 mr-1" />
            Chat
          </TabsTrigger>
        </TabsList>

        <ScrollArea className="flex-1">
          {/* Overview Tab */}
          <TabsContent value="overview" className="p-4 m-0">
            {!analysis && isAnalyzing ? (
              <AnalyzingState />
            ) : !analysis ? (
              <WaitingState />
            ) : (
              <OverviewContent analysis={analysis} />
            )}
          </TabsContent>

          {/* Sections Tab */}
          <TabsContent value="sections" className="p-4 m-0">
            {!analysis && isAnalyzing ? (
              <AnalyzingState />
            ) : !analysis ? (
              <WaitingState />
            ) : analysis.sections.length === 0 ? (
              <div className="text-center py-8">
                <BookOpen className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">
                  Nenhuma secao identificada neste documento.
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Adicione um titulo como &ldquo;# Introducao&rdquo; para comecar.
                </p>
              </div>
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

          {/* Rules Tab */}
          <TabsContent value="rules" className="p-4 m-0">
            <RulesManager />
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

      {/* Rules */}
      {analysis.rules.results.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              Regras ({analysis.rules.passedCount}/{analysis.rules.totalCount})
            </h4>
          </div>
          <div className="space-y-1.5">
            {analysis.rules.results.map((result, i) => (
              <div
                key={result.rule.id}
                className={cn(
                  "flex items-start gap-2 text-sm p-2 rounded-lg border",
                  result.passed
                    ? "bg-green-500/5 border-green-500/20"
                    : "bg-red-500/5 border-red-500/20"
                )}
              >
                {result.passed ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={result.passed ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"}>
                      {result.rule.label}
                    </span>
                    {result.rule.isSystemRule ? (
                      <Shield className="h-3 w-3 text-muted-foreground" />
                    ) : (
                      <User className="h-3 w-3 text-muted-foreground" />
                    )}
                  </div>
                  {!result.passed && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {result.rule.description}
                    </p>
                  )}
                  {result.passed && result.matchedAt && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Encontrado: {result.matchedAt}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Uncited Assertions */}
      {analysis.citations.uncitedAssertions.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              Afirmacoes sem Citacao ({analysis.citations.uncitedAssertions.length})
            </h4>
            <span className="text-xs text-muted-foreground">
              {analysis.citations.citedAssertions}/{analysis.citations.totalAssertions} citadas
            </span>
          </div>
          <div className="space-y-1.5">
            {analysis.citations.uncitedAssertions.map((assertion, i) => (
              <div
                key={i}
                className="p-2 rounded-lg bg-orange-500/5 border border-orange-500/20 text-sm"
              >
                <div className="flex items-start gap-2">
                  <XCircle className="h-4 w-4 text-orange-500 mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-orange-600 dark:text-orange-400 font-medium mb-0.5">
                      {assertion.assertionType} - Linha {assertion.lineNumber}
                    </p>
                    <p className="text-xs text-muted-foreground break-words">
                      &ldquo;{assertion.text}&rdquo;
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground italic">
            Adicione referencias para dar credibilidade as afirmacoes.
          </p>
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

function RulesManager() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newRule, setNewRule] = useState({
    label: "",
    description: "",
    pattern: "",
    section: null as SectionType | null,
  });

  // Load rules on mount
  useEffect(() => {
    setRules(getAllRules());
  }, []);

  const handleAddRule = () => {
    if (!newRule.label || !newRule.pattern) return;

    const rule: Rule = {
      id: `user-${Date.now()}`,
      label: newRule.label,
      description: newRule.description || newRule.label,
      pattern: newRule.pattern,
      section: newRule.section,
      isSystemRule: false,
      isEnabled: true,
    };

    const updatedRules = [...rules, rule];
    setRules(updatedRules);
    saveUserRules(updatedRules.filter(r => !r.isSystemRule));

    // Reset form
    setNewRule({ label: "", description: "", pattern: "", section: null });
    setShowAddForm(false);
  };

  const handleDeleteRule = (ruleId: string) => {
    const updatedRules = rules.filter(r => r.id !== ruleId);
    setRules(updatedRules);
    saveUserRules(updatedRules.filter(r => !r.isSystemRule));
  };

  const handleToggleRule = (ruleId: string) => {
    const updatedRules = rules.map(r =>
      r.id === ruleId ? { ...r, isEnabled: !r.isEnabled } : r
    );
    setRules(updatedRules);
    // Save all rules state (including system rule toggles)
    if (typeof window !== 'undefined') {
      localStorage.setItem('thesis-writer-rules-state', JSON.stringify(
        updatedRules.map(r => ({ id: r.id, isEnabled: r.isEnabled }))
      ));
    }
    saveUserRules(updatedRules.filter(r => !r.isSystemRule));
  };

  // Group rules by section
  const generalRules = rules.filter(r => r.section === null);
  const sectionRules = rules.filter(r => r.section !== null);

  return (
    <div className="space-y-4">
      {/* Add Rule Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowAddForm(!showAddForm)}
        className="w-full gap-2"
      >
        <Plus className="h-4 w-4" />
        Nova Regra
      </Button>

      {/* Add Rule Form */}
      {showAddForm && (
        <div className="p-3 rounded-lg border border-border bg-muted/30 space-y-3">
          <div>
            <label className="text-xs font-medium mb-1 block">Nome da Regra</label>
            <input
              type="text"
              value={newRule.label}
              onChange={(e) => setNewRule(prev => ({ ...prev, label: e.target.value }))}
              placeholder="Ex: Possui metodologia clara"
              className="w-full px-2 py-1.5 text-sm rounded border border-border bg-background"
            />
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block">Palavras-chave (separadas por |)</label>
            <input
              type="text"
              value={newRule.pattern}
              onChange={(e) => setNewRule(prev => ({ ...prev, pattern: e.target.value }))}
              placeholder="Ex: metodologia|metodo|procedimento"
              className="w-full px-2 py-1.5 text-sm rounded border border-border bg-background"
            />
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block">Secao (opcional)</label>
            <select
              value={newRule.section || ""}
              onChange={(e) => setNewRule(prev => ({
                ...prev,
                section: e.target.value ? e.target.value as SectionType : null
              }))}
              className="w-full px-2 py-1.5 text-sm rounded border border-border bg-background"
            >
              <option value="">Geral (todas as secoes)</option>
              <option value="introduction">Introducao</option>
              <option value="literature-review">Revisao de Literatura</option>
              <option value="methodology">Metodologia</option>
              <option value="results">Resultados</option>
              <option value="discussion">Discussao</option>
              <option value="conclusion">Conclusao</option>
            </select>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleAddRule} className="flex-1">
              Adicionar
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowAddForm(false)}>
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {/* General Rules */}
      {generalRules.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Regras Gerais
          </h4>
          <div className="space-y-1">
            {generalRules.map(rule => (
              <RuleItem
                key={rule.id}
                rule={rule}
                onToggle={() => handleToggleRule(rule.id)}
                onDelete={() => handleDeleteRule(rule.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Section Rules */}
      {sectionRules.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Regras por Secao
          </h4>
          <div className="space-y-1">
            {sectionRules.map(rule => (
              <RuleItem
                key={rule.id}
                rule={rule}
                onToggle={() => handleToggleRule(rule.id)}
                onDelete={() => handleDeleteRule(rule.id)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function RuleItem({
  rule,
  onToggle,
  onDelete,
}: {
  rule: Rule;
  onToggle: () => void;
  onDelete: () => void;
}) {
  return (
    <div className={cn(
      "flex items-center gap-2 p-2 rounded-lg border text-sm",
      rule.isEnabled ? "bg-card border-border" : "bg-muted/30 border-border/50 opacity-60"
    )}>
      <button
        onClick={onToggle}
        className="shrink-0"
      >
        {rule.isEnabled ? (
          <CheckCircle2 className="h-4 w-4 text-green-500" />
        ) : (
          <XCircle className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="font-medium truncate">{rule.label}</span>
          {rule.isSystemRule ? (
            <Shield className="h-3 w-3 text-muted-foreground shrink-0" />
          ) : (
            <User className="h-3 w-3 text-primary shrink-0" />
          )}
        </div>
        {rule.section && (
          <span className="text-xs text-muted-foreground">
            {SECTION_LABELS[rule.section]}
          </span>
        )}
      </div>

      {!rule.isSystemRule && (
        <button
          onClick={onDelete}
          className="p-1 hover:bg-destructive/10 rounded text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
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
