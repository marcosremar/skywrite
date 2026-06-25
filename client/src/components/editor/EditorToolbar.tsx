"use client";

import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Undo2, Redo2, ImagePlus } from "lucide-react";

interface EditorToolbarProps {
  onInsert: (text: string) => void;
  onInsertImage?: (file: File) => void;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
}

export function EditorToolbar({ onInsert, onInsertImage, onUndo, onRedo, canUndo = true, canRedo = true }: EditorToolbarProps) {
  const imageInputRef = useRef<HTMLInputElement>(null);

  const tools = [
    { label: "B", title: "Negrito", insert: "**texto**" },
    { label: "I", title: "Itálico", insert: "*texto*" },
    { label: "H1", title: "Título", insert: "\n# " },
    { label: "H2", title: "Subtítulo", insert: "\n## " },
    { label: "H3", title: "Seção", insert: "\n### " },
  ];

  const insertions = [
    { label: "📊", title: "Tabela", insert: "\n| Col1 | Col2 |\n|------|------|\n| A    | B    |\n\n: Legenda {#tbl:label}\n" },
    { label: "📝", title: "Citação", insert: "[@autor2023]" },
    { label: "🔗", title: "Referência", insert: "[@fig:label]" },
    { label: "∑", title: "Equação", insert: "\n$$\nE = mc^2\n$$ {#eq:label}\n" },
  ];

  return (
    <div className="flex flex-wrap items-center gap-1">
      {/* Undo/Redo buttons */}
      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0"
        title="Desfazer (Ctrl+Z)"
        aria-label="Desfazer"
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
        aria-label="Refazer"
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
          aria-label={tool.title}
          onClick={() => onInsert(tool.insert)}
        >
          {tool.label}
        </Button>
      ))}

      <Separator orientation="vertical" className="h-6 mx-1" />

      {onInsertImage && (
        <>
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onInsertImage(file);
              e.target.value = "";
            }}
          />
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            title="Inserir imagem"
            aria-label="Inserir imagem"
            onClick={() => imageInputRef.current?.click()}
          >
            <ImagePlus className="h-4 w-4" />
          </Button>
        </>
      )}

      {insertions.map((item) => (
        <Button
          key={item.label}
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          title={item.title}
          aria-label={item.title}
          onClick={() => onInsert(item.insert)}
        >
          {item.label}
        </Button>
      ))}
    </div>
  );
}
