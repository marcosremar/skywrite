"use client";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Undo2, Redo2 } from "lucide-react";

interface EditorToolbarProps {
  onInsert: (text: string) => void;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
}

export function EditorToolbar({ onInsert, onUndo, onRedo, canUndo = true, canRedo = true }: EditorToolbarProps) {
  const tools = [
    { label: "B", title: "Negrito", insert: "**texto**" },
    { label: "I", title: "Italico", insert: "*texto*" },
    { label: "H1", title: "Titulo", insert: "\n# " },
    { label: "H2", title: "Subtitulo", insert: "\n## " },
    { label: "H3", title: "Secao", insert: "\n### " },
  ];

  const insertions = [
    { label: "📷", title: "Imagem", insert: "\n![Legenda](media/imagem.png){#fig:label width=60%}\n" },
    { label: "📊", title: "Tabela", insert: "\n| Col1 | Col2 |\n|------|------|\n| A    | B    |\n\n: Legenda {#tbl:label}\n" },
    { label: "📝", title: "Citacao", insert: "[@autor2023]" },
    { label: "🔗", title: "Referencia", insert: "[@fig:label]" },
    { label: "∑", title: "Equacao", insert: "\n$$\nE = mc^2\n$$ {#eq:label}\n" },
  ];

  return (
    <div className="flex items-center gap-1">
      {/* Undo/Redo buttons */}
      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0"
        title="Desfazer (Ctrl+Z)"
        onClick={onUndo}
        disabled={!canUndo || !onUndo}
      >
        <Undo2 className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0"
        title="Refazer (Ctrl+Y)"
        onClick={onRedo}
        disabled={!canRedo || !onRedo}
      >
        <Redo2 className="h-4 w-4" />
      </Button>

      <Separator orientation="vertical" className="h-6 mx-1" />

      {tools.map((tool) => (
        <Button
          key={tool.label}
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 font-mono"
          title={tool.title}
          onClick={() => onInsert(tool.insert)}
        >
          {tool.label}
        </Button>
      ))}

      <Separator orientation="vertical" className="h-6 mx-1" />

      {insertions.map((item) => (
        <Button
          key={item.label}
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          title={item.title}
          onClick={() => onInsert(item.insert)}
        >
          {item.label}
        </Button>
      ))}
    </div>
  );
}
