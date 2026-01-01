"use client";

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { ProgressRing, ProgressBar } from "@/components/ui/progress-ring";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";

// Inline SVG Icons (replacing Lucide)
const Icons = {
  checkCircle2: (props: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={props.className}>
      <circle cx="12" cy="12" r="10" /><path d="m9 12 2 2 4-4" />
    </svg>
  ),
  circle: (props: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={props.className}>
      <circle cx="12" cy="12" r="10" />
    </svg>
  ),
  alertCircle: (props: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={props.className}>
      <circle cx="12" cy="12" r="10" /><line x1="12" x2="12" y1="8" y2="12" /><line x1="12" x2="12.01" y1="16" y2="16" />
    </svg>
  ),
  chevronDown: (props: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={props.className}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  ),
  chevronRight: (props: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={props.className}>
      <path d="m9 18 6-6-6-6" />
    </svg>
  ),
  sparkles: (props: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={props.className}>
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
    </svg>
  ),
  info: (props: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={props.className}>
      <circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" />
    </svg>
  ),
  refreshCw: (props: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={props.className}>
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" /><path d="M21 3v5h-5" /><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" /><path d="M8 16H3v5" />
    </svg>
  ),
};
import type {
  SectionChecklist as SectionChecklistType,
  ChecklistItem,
  SectionType,
} from "@/types/thesis-analysis";
import { SECTION_LABELS } from "@/types/thesis-analysis";

interface SectionChecklistProps {
  checklists: SectionChecklistType[];
  onAnalyze?: () => void;
  isAnalyzing?: boolean;
  className?: string;
}

export function SectionChecklist({
  checklists,
  onAnalyze,
  isAnalyzing = false,
  className,
}: SectionChecklistProps) {
  const [expandedSections, setExpandedSections] = useState<Set<SectionType>>(
    new Set(["introduction"])
  );

  const overallProgress = useMemo(() => {
    if (checklists.length === 0) return 0;
    return Math.round(
      checklists.reduce((sum, c) => sum + c.score, 0) / checklists.length
    );
  }, [checklists]);

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
    <div className={cn("flex flex-col h-full", className)}>
      {/* Header */}
      <div className="p-4 border-b border-border bg-card">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <Icons.sparkles className="h-4 w-4 text-primary" />
            Checklist da Tese
          </h3>
          <ProgressRing progress={overallProgress} size={40} strokeWidth={3} />
        </div>

        <ProgressBar progress={overallProgress} height={6} className="mb-2" />

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {checklists.reduce(
              (sum, c) => sum + c.items.filter((i) => i.status === "complete").length,
              0
            )}{" "}
            de{" "}
            {checklists.reduce((sum, c) => sum + c.items.length, 0)} itens
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={onAnalyze}
            disabled={isAnalyzing}
            className="h-7 text-xs"
          >
            {isAnalyzing ? (
              <>
                <Icons.refreshCw className="h-3 w-3 animate-spin mr-1" />
                Analisando...
              </>
            ) : (
              <>
                <Icons.refreshCw className="h-3 w-3 mr-1" />
                Reanalisar
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Sections List */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {checklists.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Icons.info className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Nenhuma secao detectada</p>
              <p className="text-xs mt-1">
                Adicione secoes ao seu documento (## Introducao, ## Metodologia, etc.)
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {checklists.map((checklist) => (
                <SectionChecklistItem
                  key={checklist.section}
                  checklist={checklist}
                  isExpanded={expandedSections.has(checklist.section)}
                  onToggle={() => toggleSection(checklist.section)}
                />
              ))}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Footer with tips */}
      <div className="p-3 border-t border-border bg-muted/30">
        <p className="text-xs text-muted-foreground">
          <span className="font-medium text-primary">Dica:</span> Itens com{" "}
          <Icons.sparkles className="h-3 w-3 inline text-primary" /> foram detectados
          automaticamente no seu texto.
        </p>
      </div>
    </div>
  );
}

interface SectionChecklistItemProps {
  checklist: SectionChecklistType;
  isExpanded: boolean;
  onToggle: () => void;
}

function SectionChecklistItem({
  checklist,
  isExpanded,
  onToggle,
}: SectionChecklistItemProps) {
  const completedCount = checklist.items.filter(
    (i) => i.status === "complete"
  ).length;
  const totalCount = checklist.items.length;
  const requiredMissing = checklist.items.filter(
    (i) => i.required && i.status === "incomplete"
  ).length;

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      {/* Section Header */}
      <button
        onClick={onToggle}
        className="w-full px-3 py-2.5 flex items-center gap-2 hover:bg-muted/50 transition-colors"
      >
        {isExpanded ? (
          <Icons.chevronDown className="h-4 w-4 text-muted-foreground" />
        ) : (
          <Icons.chevronRight className="h-4 w-4 text-muted-foreground" />
        )}

        <span className="font-medium text-sm flex-1 text-left">
          {checklist.sectionLabel}
        </span>

        {requiredMissing > 0 && (
          <span className="text-xs text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded">
            {requiredMissing} pendente{requiredMissing > 1 ? "s" : ""}
          </span>
        )}

        <span
          className={cn(
            "text-xs font-medium px-1.5 py-0.5 rounded",
            checklist.score >= 70
              ? "text-green-500 bg-green-500/10"
              : checklist.score >= 50
              ? "text-yellow-500 bg-yellow-500/10"
              : "text-red-500 bg-red-500/10"
          )}
        >
          {completedCount}/{totalCount}
        </span>
      </button>

      {/* Items List */}
      {isExpanded && (
        <div className="px-3 pb-3 space-y-1 border-t border-border pt-2">
          {checklist.items.map((item) => (
            <ChecklistItemRow key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}

interface ChecklistItemRowProps {
  item: ChecklistItem;
}

function ChecklistItemRow({ item }: ChecklistItemRowProps) {
  const [showDescription, setShowDescription] = useState(false);

  const getStatusIcon = () => {
    switch (item.status) {
      case "complete":
        return <Icons.checkCircle2 className="h-4 w-4 text-green-500" />;
      case "partial":
        return <Icons.alertCircle className="h-4 w-4 text-yellow-500" />;
      case "incomplete":
        return item.required ? (
          <Icons.circle className="h-4 w-4 text-red-400" />
        ) : (
          <Icons.circle className="h-4 w-4 text-muted-foreground" />
        );
      default:
        return <Icons.circle className="h-4 w-4 text-muted-foreground/50" />;
    }
  };

  return (
    <div
      className={cn(
        "group rounded-md px-2 py-1.5 transition-colors",
        item.status === "complete"
          ? "bg-green-500/5"
          : item.status === "incomplete" && item.required
          ? "bg-red-500/5"
          : "hover:bg-muted/30"
      )}
    >
      <div className="flex items-start gap-2">
        <div className="mt-0.5">{getStatusIcon()}</div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span
              className={cn(
                "text-sm",
                item.status === "complete"
                  ? "text-muted-foreground line-through"
                  : item.required
                  ? "text-foreground"
                  : "text-muted-foreground"
              )}
            >
              {item.label}
            </span>

            {item.required && item.status === "incomplete" && (
              <span className="text-[10px] text-red-500 font-medium">
                OBRIGATORIO
              </span>
            )}

            {item.autoDetected && item.status === "complete" && (
              <Icons.sparkles className="h-3 w-3 text-primary" />
            )}

            <button
              onClick={() => setShowDescription(!showDescription)}
              className="opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Icons.info className="h-3 w-3 text-muted-foreground hover:text-foreground" />
            </button>
          </div>

          {showDescription && (
            <p className="text-xs text-muted-foreground mt-1">
              {item.description}
              {item.detectedAt && (
                <span className="text-primary ml-1">({item.detectedAt})</span>
              )}
            </p>
          )}
        </div>

        {/* Weight indicator */}
        <div className="flex gap-0.5">
          {Array.from({ length: item.weight }).map((_, i) => (
            <div
              key={i}
              className={cn(
                "w-1 h-3 rounded-full",
                item.status === "complete"
                  ? "bg-green-500"
                  : item.required
                  ? "bg-red-300"
                  : "bg-muted"
              )}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// Compact version for sidebar
interface CompactChecklistProps {
  checklists: SectionChecklistType[];
  className?: string;
}

export function CompactChecklist({
  checklists,
  className,
}: CompactChecklistProps) {
  const overallProgress = useMemo(() => {
    if (checklists.length === 0) return 0;
    return Math.round(
      checklists.reduce((sum, c) => sum + c.score, 0) / checklists.length
    );
  }, [checklists]);

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium">Progresso</span>
        <span className="text-xs text-muted-foreground">{overallProgress}%</span>
      </div>

      <ProgressBar progress={overallProgress} height={4} />

      <div className="grid grid-cols-3 gap-1">
        {checklists.slice(0, 6).map((checklist) => (
          <div
            key={checklist.section}
            className={cn(
              "px-2 py-1 rounded text-[10px] text-center truncate",
              checklist.score >= 70
                ? "bg-green-500/10 text-green-500"
                : checklist.score >= 50
                ? "bg-yellow-500/10 text-yellow-500"
                : "bg-red-500/10 text-red-500"
            )}
            title={`${checklist.sectionLabel}: ${checklist.score}%`}
          >
            {checklist.sectionLabel.slice(0, 8)}
          </div>
        ))}
      </div>
    </div>
  );
}
