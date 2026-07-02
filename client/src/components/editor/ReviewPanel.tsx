"use client";

import { useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/apiFetch";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, SpellCheck, ListChecks, Gauge, Sparkles, RefreshCw, ClipboardCheck, ShieldCheck } from "lucide-react";

interface ReviewPanelProps {
  projectId: string;
  content: string;
  onGrammarMatches?: (matches: { offset: number; length: number }[]) => void;
  onApplyFix?: (fix: { offset: number; length: number; text: string; replacement: string }) => boolean;
}

interface GrammarMatch {
  message: string;
  replacements: string[];
  category: string;
  offset: number;
  length: number;
  text?: string;
}

interface SubmissionCheck {
  id: string;
  label: string;
  passed: boolean;
  detail?: string;
}

interface Originality {
  configured: boolean;
  aiScore?: number | null;
  plagiarismScore?: number | null;
}

interface IncompleteEntry {
  key: string;
  type: string;
  missing: string[];
}

interface Integrity {
  orphans: string[];
  unused: string[];
  incomplete: IncompleteEntry[];
}

interface Metrics {
  avgSentenceLength: number;
  longSentences: number;
  passiveCount: number;
  hedgingCount: number;
  nominalizations: number;
  fleschReadingEase: number;
}

interface Consistency {
  undefinedAcronyms: { acronym: string; count: number }[];
  spellingVariants: { forms: string[] }[];
  numberFormatIssues: string[];
}

function Section({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <div className="rounded-lg border border-border p-3">
      <div className="flex items-center gap-1.5 text-sm font-medium mb-2">
        {icon}
        {title}
      </div>
      {children}
    </div>
  );
}

export function ReviewPanel({ projectId, content, onGrammarMatches, onApplyFix }: ReviewPanelProps) {
  const [loading, setLoading] = useState(false);
  const [ran, setRan] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [grammar, setGrammar] = useState<GrammarMatch[] | null>(null);
  const [integrity, setIntegrity] = useState<Integrity | null>(null);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [consistency, setConsistency] = useState<Consistency | null>(null);
  const [submission, setSubmission] = useState<SubmissionCheck[] | null>(null);
  const [originality, setOriginality] = useState<Originality | null>(null);
  const [titles, setTitles] = useState<string[] | null>(null);
  const [abstract, setAbstract] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const runIdRef = useRef(0);

  const run = async () => {
    const runId = ++runIdRef.current;
    setLoading(true);
    setError(null);
    try {
      const [g, i, a, s, o] = await Promise.all([
        apiFetch(`/api/projects/${projectId}/grammar`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: content }),
        }),
        apiFetch(`/api/projects/${projectId}/citations/integrity`, { method: "POST" }),
        apiFetch(`/api/projects/${projectId}/analyze`, { method: "POST" }),
        apiFetch(`/api/projects/${projectId}/citations/submission`, { method: "POST" }),
        apiFetch(`/api/projects/${projectId}/originality`, { method: "POST" }),
      ]);
      const rawMatches: GrammarMatch[] = g.ok ? (await g.json()).matches ?? [] : [];
      const matches = rawMatches.map((m) => ({ ...m, text: content.slice(m.offset, m.offset + m.length) }));
      if (runIdRef.current !== runId) return;
      setGrammar(matches);
      onGrammarMatches?.(matches.map((m) => ({ offset: m.offset, length: m.length })));
      if (i.ok) setIntegrity(await i.json());
      if (a.ok) {
        const data = await a.json();
        setMetrics(data.metrics);
        setConsistency(data.consistency);
      }
      if (s.ok) setSubmission((await s.json()).checks);
      if (o.ok) setOriginality(await o.json());
      setRan(true);
    } catch {
      setError("Falha ao analisar");
    } finally {
      if (runIdRef.current === runId) setLoading(false);
    }
  };

  const applyFix = (index: number, replacement: string) => {
    if (!grammar || !onApplyFix) return;
    const m = grammar[index];
    const ok = onApplyFix({ offset: m.offset, length: m.length, text: m.text ?? "", replacement });
    if (!ok) {
      toast.error("O texto mudou desde a análise. Clique em Analisar novamente.");
      return;
    }
    const delta = replacement.length - m.length;
    const updated = grammar
      .filter((_, i) => i !== index)
      .map((g) => (g.offset > m.offset ? { ...g, offset: g.offset + delta } : g));
    setGrammar(updated);
    onGrammarMatches?.(updated.map((g) => ({ offset: g.offset, length: g.length })));
  };

  const callWriting = async (kind: "titles" | "abstract") => {
    setBusy(kind);
    try {
      const res = await apiFetch(`/api/projects/${projectId}/writing/${kind}`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        if (kind === "titles") setTitles(data.titles);
        else setAbstract(data.abstract);
      } else {
        toast.error("Assistente indisponível");
      }
    } catch {
      toast.error("Falha ao gerar");
    } finally {
      setBusy(null);
    }
  };

  const hasRun = ran;

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <span className="text-sm font-semibold">Revisão</span>
        <Button size="sm" variant="outline" onClick={run} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          <span className="ml-1.5">Analisar</span>
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-3">
          {error && <p className="text-sm text-destructive">{error}</p>}
          {!hasRun && !loading && (
            <p className="text-sm text-muted-foreground">
              Clique em Analisar para verificar gramática, citações e métricas do texto.
            </p>
          )}

          {grammar && (
            <Section icon={<SpellCheck className="h-4 w-4" />} title={`Gramática (${grammar.length})`}>
              {grammar.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum problema encontrado.</p>
              ) : (
                <ul className="space-y-2">
                  {grammar.slice(0, 50).map((m, i) => (
                    <li key={`${m.offset}-${i}`} className="text-sm">
                      <span className="text-muted-foreground">[{m.category}]</span> {m.message}
                      {m.text && <span className="text-muted-foreground"> — “{m.text.slice(0, 60)}”</span>}
                      {m.replacements.length > 0 && (
                        <span className="ml-1 inline-flex flex-wrap gap-1 align-middle">
                          {m.replacements.slice(0, 3).map((r) => (
                            <button
                              key={r}
                              type="button"
                              onClick={() => applyFix(i, r)}
                              disabled={!onApplyFix}
                              title="Aplicar correção"
                              className="text-xs px-1.5 py-0.5 rounded border border-primary/40 text-primary hover:bg-primary/10 disabled:opacity-50"
                            >
                              {r}
                            </button>
                          ))}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </Section>
          )}

          {integrity && (
            <Section icon={<ListChecks className="h-4 w-4" />} title="Citações">
              <div className="space-y-1.5 text-sm">
                <p>
                  Citadas sem referência:{" "}
                  <span className={integrity.orphans.length ? "text-destructive" : "text-muted-foreground"}>
                    {integrity.orphans.length ? integrity.orphans.join(", ") : "nenhuma"}
                  </span>
                </p>
                <p>
                  Referências não citadas:{" "}
                  <span className={integrity.unused.length ? "text-yellow-600" : "text-muted-foreground"}>
                    {integrity.unused.length ? integrity.unused.join(", ") : "nenhuma"}
                  </span>
                </p>
                {integrity.incomplete.length > 0 && (
                  <div>
                    <p className="text-muted-foreground">Campos ABNT faltando:</p>
                    <ul className="ml-3 list-disc">
                      {integrity.incomplete.map((e) => (
                        <li key={e.key}>
                          {e.key}: {e.missing.join(", ")}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </Section>
          )}

          {metrics && (
            <Section icon={<Gauge className="h-4 w-4" />} title="Métricas de escrita">
              <ul className="text-sm space-y-1">
                <li>Comprimento médio de frase: {metrics.avgSentenceLength} palavras</li>
                <li>Frases longas (&gt;40): {metrics.longSentences}</li>
                <li>Voz passiva: {metrics.passiveCount}</li>
                <li>Nominalizações: {metrics.nominalizations}</li>
                <li>Expressões vagas (hedging): {metrics.hedgingCount}</li>
                <li>Legibilidade (Flesch PT): {metrics.fleschReadingEase}</li>
                {consistency && consistency.undefinedAcronyms.length > 0 && (
                  <li className="text-yellow-600">
                    Siglas não definidas: {consistency.undefinedAcronyms.map((a) => a.acronym).join(", ")}
                  </li>
                )}
                {consistency && consistency.spellingVariants.length > 0 && (
                  <li className="text-yellow-600">
                    Grafias inconsistentes: {consistency.spellingVariants.map((v) => v.forms.join("/")).join("; ")}
                  </li>
                )}
                {consistency && consistency.numberFormatIssues.length > 0 && (
                  <li className="text-yellow-600">{consistency.numberFormatIssues.join("; ")}</li>
                )}
              </ul>
            </Section>
          )}

          {submission && (
            <Section icon={<ClipboardCheck className="h-4 w-4" />} title="Prontidão para submissão">
              <ul className="text-sm space-y-1">
                {submission.map((c) => (
                  <li key={c.id} className="flex items-start gap-1.5">
                    <span className={c.passed ? "text-green-600" : "text-destructive"} aria-label={c.passed ? "passou" : "falhou"}>{c.passed ? "✓" : "✗"}</span>
                    <span>
                      {c.label}
                      {c.detail && <span className="text-muted-foreground"> — {c.detail}</span>}
                    </span>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {originality && (
            <Section icon={<ShieldCheck className="h-4 w-4" />} title="Originalidade">
              {!originality.configured ? (
                <p className="text-sm text-muted-foreground">
                  Provedor não configurado (defina ORIGINALITY_API_URL/KEY no servidor).
                </p>
              ) : (
                <ul className="text-sm space-y-1">
                  <li>Conteúdo gerado por IA: {originality.aiScore == null ? "—" : `${Math.round(originality.aiScore * 100)}%`}</li>
                  <li>Plágio: {originality.plagiarismScore == null ? "—" : `${Math.round(originality.plagiarismScore * 100)}%`}</li>
                </ul>
              )}
            </Section>
          )}

          <Section icon={<Sparkles className="h-4 w-4" />} title="Assistente">
            <div className="flex gap-2 mb-2">
              <Button size="sm" variant="outline" onClick={() => callWriting("titles")} disabled={busy === "titles"}>
                {busy === "titles" && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
                Sugerir títulos
              </Button>
              <Button size="sm" variant="outline" onClick={() => callWriting("abstract")} disabled={busy === "abstract"}>
                {busy === "abstract" && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
                Gerar resumo
              </Button>
            </div>
            {titles && (
              <ul className="text-sm list-disc ml-4 mb-2">
                {titles.map((t, i) => (
                  <li key={i}>{t}</li>
                ))}
              </ul>
            )}
            {abstract && <p className="text-sm whitespace-pre-wrap">{abstract}</p>}
          </Section>
        </div>
      </ScrollArea>
    </div>
  );
}
