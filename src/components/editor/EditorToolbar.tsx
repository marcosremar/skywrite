"use client";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

interface EditorToolbarProps {
  onInsert: (text: string) => void;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
}

// Simple SVG icons
const Icons = {
  undo: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7v6h6" /><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
    </svg>
  ),
  redo: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 7v6h-6" /><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7" />
    </svg>
  ),
  chevronDown: (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m6 9 6 6 6-6" />
    </svg>
  ),
};

export function EditorToolbar({ onInsert, onUndo, onRedo, canUndo = true, canRedo = true }: EditorToolbarProps) {
  const tools = [
    { id: "bold", label: "B", title: "Negrito", insert: "**texto**" },
    { id: "italic", label: "I", title: "Italico", insert: "*texto*" },
    { id: "h1", label: "H1", title: "Titulo", insert: "\n# " },
    { id: "h2", label: "H2", title: "Subtitulo", insert: "\n## " },
    { id: "h3", label: "H3", title: "Secao", insert: "\n### " },
  ];

  const insertions = [
    { id: "img", label: "Img", title: "Imagem", insert: "\n![Legenda](media/imagem.png){#fig:label width=60%}\n" },
    { id: "tab", label: "Tab", title: "Tabela", insert: "\n| Col1 | Col2 |\n|------|------|\n| A    | B    |\n\n: Legenda {#tbl:label}\n" },
    { id: "cit", label: "Cit", title: "Citacao", insert: "[@autor2023]" },
    { id: "ref", label: "Ref", title: "Referencia", insert: "[@fig:label]" },
    { id: "eq", label: "Eq", title: "Equacao", insert: "\n$$\nE = mc^2\n$$ {#eq:label}\n" },
  ];

  return (
    <div className="flex flex-wrap items-center gap-0.5">
      {/* Undo/Redo */}
      <Button
        variant="ghost"
        size="sm"
        className="h-7 w-7 p-0"
        title="Desfazer (Ctrl+Z)"
        onClick={onUndo}
        disabled={!canUndo || !onUndo}
      >
        {Icons.undo}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="h-7 w-7 p-0"
        title="Refazer (Ctrl+Y)"
        onClick={onRedo}
        disabled={!canRedo || !onRedo}
      >
        {Icons.redo}
      </Button>

      <Separator orientation="vertical" className="h-4 mx-1" />

      {/* Formatting tools */}
      {tools.map((tool) => (
        <Button
          key={tool.id}
          variant="ghost"
          size="sm"
          className="h-7 px-2 font-mono text-xs font-semibold"
          title={tool.title}
          onClick={() => onInsert(tool.insert)}
        >
          {tool.label}
        </Button>
      ))}

      <Separator orientation="vertical" className="h-4 mx-1" />

      {/* Insertion tools */}
      {insertions.map((item) => (
        <Button
          key={item.id}
          variant="ghost"
          size="sm"
          className="h-7 px-1.5 text-xs"
          title={item.title}
          onClick={() => onInsert(item.insert)}
        >
          {item.label}
        </Button>
      ))}
    </div>
  );
}
