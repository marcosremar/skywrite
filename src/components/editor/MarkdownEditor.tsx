"use client";

import { useCallback, useMemo, useState, useEffect, useRef, useImperativeHandle, forwardRef } from "react";
import CodeMirror, { ReactCodeMirrorRef } from "@uiw/react-codemirror";
import { undo, redo } from "@codemirror/commands";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { languages } from "@codemirror/language-data";
import { EditorView, Decoration, DecorationSet, ViewPlugin, ViewUpdate, WidgetType } from "@codemirror/view";
import { Extension } from "@codemirror/state";
import { autocompletion, CompletionContext, CompletionResult, startCompletion } from "@codemirror/autocomplete";

// Citation widget that shows formatted citation with clickable individual citations
class CitationWidget extends WidgetType {
  constructor(readonly citations: string[], readonly raw: string) {
    super();
  }

  toDOM() {
    const container = document.createElement("span");
    container.className = "cm-citation-widget-container";
    container.title = this.raw;
    container.dataset.citation = this.raw;

    // Opening parenthesis
    const openParen = document.createElement("span");
    openParen.textContent = "(";
    openParen.className = "cm-citation-paren";
    container.appendChild(openParen);

    // Format each citation as clickable span
    this.citations.forEach((cite, index) => {
      // Extract author and year from cite key like "crystal2006" or "crystalLanguageInternet2006"
      const match = cite.match(/^([a-zA-Z]+?)([A-Z][a-zA-Z]*)?(\d{4})$/);
      let formatted: string;
      if (match) {
        const author = match[1].charAt(0).toUpperCase() + match[1].slice(1);
        const year = match[3];
        formatted = `${author}, ${year}`;
      } else {
        formatted = cite;
      }

      const citeSpan = document.createElement("span");
      citeSpan.className = "cm-citation-item";
      citeSpan.textContent = formatted;
      citeSpan.dataset.citeKey = cite;
      citeSpan.dataset.citeIndex = String(index);
      citeSpan.title = `@${cite} - clique para trocar`;
      container.appendChild(citeSpan);

      // Add separator between citations
      if (index < this.citations.length - 1) {
        const separator = document.createElement("span");
        separator.textContent = "; ";
        separator.className = "cm-citation-separator";
        container.appendChild(separator);
      }
    });

    // Closing parenthesis
    const closeParen = document.createElement("span");
    closeParen.textContent = ")";
    closeParen.className = "cm-citation-paren";
    container.appendChild(closeParen);

    return container;
  }

  eq(other: CitationWidget) {
    return this.raw === other.raw;
  }

  ignoreEvent() {
    return false; // Allow events to pass through
  }
}

// Image widget that shows inline image preview
class ImageWidget extends WidgetType {
  constructor(readonly src: string, readonly alt: string, readonly raw: string) {
    super();
  }

  toDOM() {
    const container = document.createElement("div");
    container.className = "cm-image-widget";
    container.title = this.raw; // Show raw on hover

    const img = document.createElement("img");
    img.src = this.src;
    img.alt = this.alt || "Image";
    img.className = "cm-image-preview";

    // Handle load error
    img.onerror = () => {
      container.innerHTML = `<div class="cm-image-error">Image not found: ${this.src}</div>`;
    };

    // Add alt text caption if present
    if (this.alt) {
      const caption = document.createElement("div");
      caption.className = "cm-image-caption";
      caption.textContent = this.alt;
      container.appendChild(img);
      container.appendChild(caption);
    } else {
      container.appendChild(img);
    }

    return container;
  }

  eq(other: ImageWidget) {
    return this.src === other.src && this.alt === other.alt;
  }

  ignoreEvent() {
    return false;
  }
}
import { syntaxTree, syntaxHighlighting, HighlightStyle } from "@codemirror/language";
import { tags } from "@lezer/highlight";

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  filename: string;
  bibContent?: string;
}

// Exported ref type for parent components
export interface MarkdownEditorRef {
  undo: () => void;
  redo: () => void;
}

// Parse BibTeX content to extract citation entries
interface BibEntry {
  key: string;
  type: string;
  author?: string;
  title?: string;
  year?: string;
}

function parseBibTeX(bibContent: string): BibEntry[] {
  const entries: BibEntry[] = [];
  // Match @type{key, ... }
  const entryRegex = /@(\w+)\s*\{\s*([^,]+)\s*,([^@]*)/g;
  let match;

  while ((match = entryRegex.exec(bibContent)) !== null) {
    const type = match[1].toLowerCase();
    const key = match[2].trim();
    const content = match[3];

    // Extract fields
    const getField = (name: string): string | undefined => {
      const fieldRegex = new RegExp(`${name}\\s*=\\s*[{"]([^}"]+)[}"]`, "i");
      const fieldMatch = content.match(fieldRegex);
      return fieldMatch ? fieldMatch[1].trim() : undefined;
    };

    entries.push({
      key,
      type,
      author: getField("author"),
      title: getField("title"),
      year: getField("year"),
    });
  }

  return entries;
}

// Create citation autocomplete function
function createCitationAutocomplete(bibEntries: BibEntry[]) {
  return (context: CompletionContext): CompletionResult | null => {
    // Check if we're inside a citation context [@...]
    const before = context.matchBefore(/\[@[^\]]*$/);
    if (!before) return null;

    // Get the text after [@
    const afterBracket = before.text.slice(2); // Remove [@
    const lastSemicolon = afterBracket.lastIndexOf(";");
    const searchText = lastSemicolon >= 0
      ? afterBracket.slice(lastSemicolon + 1).trim().replace(/^@/, "")
      : afterBracket.replace(/^@/, "");

    // Check if there's already a closing bracket after the cursor
    const docText = context.state.doc.toString();
    const hasClosingBracket = docText.charAt(context.pos) === ']';

    // Calculate where to start the replacement
    // For new citation: replace from after [@
    // For adding to existing: replace from after the last semicolon
    const from = lastSemicolon >= 0
      ? before.from + 2 + lastSemicolon + 1 + (afterBracket.slice(lastSemicolon + 1).match(/^\s*/)?.[0].length || 0)
      : before.from + 2;

    const options = bibEntries
      .filter(entry => {
        if (!searchText) return true;
        const searchLower = searchText.toLowerCase();
        return (
          entry.key.toLowerCase().includes(searchLower) ||
          (entry.author?.toLowerCase().includes(searchLower)) ||
          (entry.title?.toLowerCase().includes(searchLower))
        );
      })
      .map(entry => {
        const authorShort = entry.author?.split(",")[0]?.split(" and ")[0] || "Unknown";

        // Build the apply text - add closing bracket if not present
        const applyText = hasClosingBracket ? `@${entry.key}` : `@${entry.key}]`;

        return {
          label: `@${entry.key}`,
          detail: `${authorShort}, ${entry.year || "n.d."}`,
          info: entry.title,
          type: "variable" as const,
          apply: applyText,
        };
      });

    return {
      from,
      options,
      validFor: /^@?[\w-]*$/,
    };
  };
}

// Dark theme with green accents and dark gray background
const obsidianTheme = EditorView.theme({
  "&": {
    color: "#e5e5e5",
    backgroundColor: "#0a0a0a",
    fontSize: "16px",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif",
  },
  "& .cm-line span:not(.cm-lp-link)": {
    textDecoration: "none !important",
  },
  ".cm-content": {
    caretColor: "#4ade80",
    lineHeight: "1.8",
    padding: "20px 32px",
  },
  ".cm-cursor, .cm-dropCursor": {
    borderLeftColor: "#4ade80",
    borderLeftWidth: "2px",
    visibility: "visible",
  },
  "&.cm-focused .cm-cursor": {
    animation: "cm-blink 1s step-end infinite",
  },
  "@keyframes cm-blink": {
    "0%, 100%": { visibility: "visible" },
    "50%": { visibility: "hidden" },
  },
  "&.cm-focused .cm-selectionBackground, .cm-selectionBackground": {
    backgroundColor: "rgba(74, 222, 128, 0.15)",
  },
  ".cm-content ::selection": {
    backgroundColor: "rgba(74, 222, 128, 0.25)",
  },
  ".cm-selectionMatch": {
    backgroundColor: "rgba(74, 222, 128, 0.1)",
  },
  ".cm-activeLine": {
    backgroundColor: "transparent",
  },
  ".cm-gutters": {
    display: "none",
  },
  ".cm-scroller": {
    overflow: "auto",
  },
  ".cm-header, .cm-header-1, .cm-header-2, .cm-header-3, .cm-header-4, .cm-header-5, .cm-header-6": {
    textDecoration: "none !important",
  },
  ".tok-heading, .tok-heading1, .tok-heading2, .tok-heading3": {
    textDecoration: "none !important",
  },
  ".cmt-heading, .cmt-heading1, .cmt-heading2, .cmt-heading3, .cmt-heading4, .cmt-heading5, .cmt-heading6": {
    textDecoration: "none !important",
  },
  '[class*="ͼ"]': {
    textDecoration: "none !important",
  },
  ".cm-lp-h1": {
    fontSize: "2em",
    fontWeight: "700",
    color: "#4ade80",
    lineHeight: "1.3",
    textDecoration: "none",
  },
  ".cm-lp-h2": {
    fontSize: "1.6em",
    fontWeight: "600",
    color: "#86efac",
    lineHeight: "1.3",
    textDecoration: "none",
  },
  ".cm-lp-h3": {
    fontSize: "1.3em",
    fontWeight: "600",
    color: "#a7f3d0",
    lineHeight: "1.3",
    textDecoration: "none",
  },
  ".cm-lp-h4, .cm-lp-h5, .cm-lp-h6": {
    fontSize: "1.1em",
    fontWeight: "600",
    color: "#bbf7d0",
    textDecoration: "none",
  },
  ".cm-lp-strong": {
    fontWeight: "bold",
    color: "#fbbf24",
  },
  ".cm-lp-emphasis": {
    fontStyle: "italic",
    color: "#34d399",
  },
  ".cm-lp-code": {
    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
    backgroundColor: "#1a1a1a",
    padding: "2px 6px",
    borderRadius: "4px",
    color: "#4ade80",
  },
  ".cm-lp-link": {
    color: "#22d3ee",
  },
  ".cm-lp-hidden": {
    fontSize: "0",
    width: "0",
    display: "inline-block",
    overflow: "hidden",
    color: "transparent",
  },
  // Blockquote styling
  ".cm-quote": {
    borderLeft: "3px solid #22c55e",
    paddingLeft: "16px",
    color: "#a7f3d0",
    fontStyle: "italic",
  },
  // List styling
  ".cm-list": {
    color: "#4ade80",
  },
  // Citation widget styling - container
  ".cm-citation-widget-container": {
    color: "#4ade80",
    backgroundColor: "#1a1a1a",
    padding: "2px 4px",
    borderRadius: "4px",
    fontSize: "inherit",
    fontFamily: "inherit",
    display: "inline-flex",
    alignItems: "center",
    gap: "0",
    whiteSpace: "nowrap",
  },
  ".cm-citation-paren": {
    color: "#4ade80",
    padding: "0",
    margin: "0",
    lineHeight: "1",
  },
  ".cm-citation-separator": {
    color: "#86efac",
    padding: "0",
    margin: "0",
    lineHeight: "1",
  },
  ".cm-citation-item": {
    color: "#4ade80",
    cursor: "pointer",
    padding: "0 1px",
    borderRadius: "3px",
    transition: "background-color 0.15s",
    lineHeight: "1",
  },
  ".cm-citation-item:hover": {
    backgroundColor: "#262626",
  },
  // Legacy support for old class name
  ".cm-citation-widget": {
    color: "#4ade80",
    backgroundColor: "#1a1a1a",
    padding: "2px 6px",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "inherit",
    fontFamily: "inherit",
  },
  ".cm-citation-widget:hover": {
    backgroundColor: "#262626",
  },
  // Autocomplete dropdown styling - dark theme with green accents
  ".cm-tooltip": {
    backgroundColor: "#141414 !important",
    border: "1px solid #262626 !important",
    borderRadius: "8px !important",
    boxShadow: "0 8px 24px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(74, 222, 128, 0.1) !important",
    overflow: "hidden !important",
    zIndex: "1000 !important",
  },
  ".cm-tooltip-autocomplete": {
    backgroundColor: "#141414 !important",
    border: "none !important",
    minWidth: "280px !important",
    maxWidth: "400px !important",
    position: "absolute !important",
    marginTop: "2px !important",
    left: "0 !important",
  },
  ".cm-tooltip-autocomplete > ul": {
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif !important",
    padding: "4px !important",
    maxHeight: "300px !important",
  },
  ".cm-tooltip-autocomplete > ul > li": {
    padding: "8px 12px !important",
    borderRadius: "6px !important",
    margin: "2px 0 !important",
    display: "flex !important",
    flexDirection: "column !important",
    gap: "2px !important",
    cursor: "pointer !important",
    transition: "background-color 0.15s ease !important",
  },
  ".cm-tooltip-autocomplete > ul > li:hover": {
    backgroundColor: "#1f1f1f !important",
  },
  ".cm-tooltip-autocomplete > ul > li[aria-selected]": {
    backgroundColor: "rgba(74, 222, 128, 0.15) !important",
    color: "#ffffff !important",
  },
  ".cm-tooltip-autocomplete > ul > li[aria-selected] .cm-completionLabel": {
    color: "#4ade80 !important",
  },
  ".cm-completionLabel": {
    color: "#4ade80 !important",
    fontWeight: "500 !important",
    fontSize: "14px !important",
  },
  ".cm-completionDetail": {
    color: "#a1a1aa !important",
    marginLeft: "auto !important",
    fontSize: "12px !important",
    fontStyle: "normal !important",
    opacity: "0.8 !important",
  },
  ".cm-completionInfo": {
    backgroundColor: "#1a1a1a !important",
    color: "#a1a1aa !important",
    border: "1px solid #262626 !important",
    borderRadius: "6px !important",
    padding: "8px 12px !important",
    fontSize: "12px !important",
    maxWidth: "300px !important",
    marginLeft: "4px !important",
  },
  ".cm-completionIcon": {
    display: "none !important",
  },
  ".cm-completionMatchedText": {
    color: "#22c55e !important",
    fontWeight: "600 !important",
    textDecoration: "none !important",
  },
  // Custom citation option styling
  ".cm-citation-option": {
    display: "flex !important",
    alignItems: "center !important",
    justifyContent: "space-between !important",
  },
  // Tooltip positioning - let CodeMirror calculate the position
  ".cm-tooltip.cm-tooltip-autocomplete": {
    // Position is calculated by CodeMirror based on cursor position
  },
  // Citation in raw markdown - make it clickable
  ".cm-citation-raw": {
    color: "#4ade80",
    cursor: "pointer",
    backgroundColor: "#1a1a1a",
    borderRadius: "3px",
    padding: "0 2px",
  },
  ".cm-citation-raw:hover": {
    backgroundColor: "#262626",
  },
  // Image widget styles
  ".cm-image-widget": {
    display: "block",
    margin: "12px 0",
    padding: "8px",
    backgroundColor: "#141414",
    borderRadius: "8px",
    border: "1px solid #262626",
    textAlign: "center",
  },
  ".cm-image-preview": {
    maxWidth: "100%",
    maxHeight: "400px",
    objectFit: "contain",
    borderRadius: "4px",
    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.4)",
  },
  ".cm-image-caption": {
    marginTop: "8px",
    fontSize: "12px",
    color: "#86efac",
    fontStyle: "italic",
  },
  ".cm-image-error": {
    padding: "20px",
    color: "#f87171",
    fontSize: "12px",
    backgroundColor: "rgba(248, 113, 113, 0.1)",
    borderRadius: "4px",
  },
});

// Custom highlight style with green theme
const customHighlightStyle = HighlightStyle.define([
  { tag: tags.heading, textDecoration: "none", fontWeight: "bold", color: "#4ade80" },
  { tag: tags.heading1, textDecoration: "none", fontWeight: "bold", color: "#4ade80" },
  { tag: tags.heading2, textDecoration: "none", fontWeight: "bold", color: "#86efac" },
  { tag: tags.heading3, textDecoration: "none", fontWeight: "bold", color: "#a7f3d0" },
  { tag: tags.heading4, textDecoration: "none", fontWeight: "bold", color: "#bbf7d0" },
  { tag: tags.heading5, textDecoration: "none", fontWeight: "bold", color: "#bbf7d0" },
  { tag: tags.heading6, textDecoration: "none", fontWeight: "bold", color: "#bbf7d0" },
  { tag: tags.link, color: "#22d3ee", textDecoration: "none" },
  { tag: tags.emphasis, fontStyle: "italic", color: "#34d399" },
  { tag: tags.strong, fontWeight: "bold", color: "#fbbf24" },
  { tag: tags.monospace, fontFamily: "'JetBrains Mono', 'Fira Code', monospace", color: "#4ade80" },
]);

// Decoration marks
const hiddenMark = Decoration.mark({ class: "cm-lp-hidden" });
const h1Mark = Decoration.mark({ class: "cm-lp-h1" });
const h2Mark = Decoration.mark({ class: "cm-lp-h2" });
const h3Mark = Decoration.mark({ class: "cm-lp-h3" });
const strongMark = Decoration.mark({ class: "cm-lp-strong" });
const emphasisMark = Decoration.mark({ class: "cm-lp-emphasis" });
const codeMark = Decoration.mark({ class: "cm-lp-code" });
const linkMark = Decoration.mark({ class: "cm-lp-link" });
const citationRawMark = Decoration.mark({ class: "cm-citation-raw" });

// Citation modal state (global for simplicity)
interface CitationModalState {
  isOpen: boolean;
  position: { x: number; y: number };
  citationRange: { from: number; to: number } | null;
  onSelect: ((key: string) => void) | null;
  // For individual citation replacement
  replaceMode?: {
    rawCitation: string;  // The full citation like "[@cite1; @cite2]"
    citeKey: string;      // The specific key to replace like "cite1"
    citeIndex: number;    // Index of the citation in the array
  };
}

let globalCitationModalState: CitationModalState = {
  isOpen: false,
  position: { x: 0, y: 0 },
  citationRange: null,
  onSelect: null,
};

let globalSetCitationModal: ((state: CitationModalState) => void) | null = null;

// Expose to window for widget access
if (typeof window !== "undefined") {
  (window as unknown as { __citationModalSetter?: typeof globalSetCitationModal }).__citationModalSetter = null;
}

// Get all lines that contain the cursor or selection
// Only returns active lines when editor is focused - otherwise all lines show rendered preview
function getActiveLines(view: EditorView): Set<number> {
  const activeLines = new Set<number>();

  // If editor is not focused, return empty set so all lines show rendered preview
  if (!view.hasFocus) {
    return activeLines;
  }

  for (const range of view.state.selection.ranges) {
    const startLine = view.state.doc.lineAt(range.from).number;
    const endLine = view.state.doc.lineAt(range.to).number;
    for (let line = startLine; line <= endLine; line++) {
      activeLines.add(line);
    }
  }
  return activeLines;
}

// Create Live Preview decorations
function createLivePreviewDecorations(view: EditorView): DecorationSet {
  const decorations: { from: number; to: number; decoration: Decoration }[] = [];
  const activeLines = getActiveLines(view);
  const doc = view.state.doc;

  syntaxTree(view.state).iterate({
    enter(node) {
      const line = doc.lineAt(node.from).number;
      const isActive = activeLines.has(line);
      const nodeType = node.name;

      // On active lines, show raw markdown - don't add any decorations
      if (isActive) return;

      // ATXHeading1, ATXHeading2, etc.
      if (nodeType.startsWith("ATXHeading")) {
        const level = parseInt(nodeType.replace("ATXHeading", "")) || 1;
        const lineContent = doc.lineAt(node.from);
        const text = lineContent.text;

        // Find where # symbols end
        const match = text.match(/^(#{1,6})\s*/);
        if (match) {
          const hashEnd = lineContent.from + match[0].length;

          // Hide the # symbols and space
          decorations.push({
            from: lineContent.from,
            to: hashEnd,
            decoration: hiddenMark,
          });

          // Check for {#id} at the end and hide it
          const idMatch = text.match(/\s*\{#[^}]+\}\s*$/);
          if (idMatch) {
            const idStart = lineContent.from + text.indexOf(idMatch[0]);
            decorations.push({
              from: idStart,
              to: lineContent.to,
              decoration: hiddenMark,
            });
          }

          // Apply heading style to the content
          const headingMark = level === 1 ? h1Mark : level === 2 ? h2Mark : h3Mark;
          const contentEnd = idMatch ? lineContent.from + text.indexOf(idMatch[0]) : lineContent.to;
          if (hashEnd < contentEnd) {
            decorations.push({
              from: hashEnd,
              to: contentEnd,
              decoration: headingMark,
            });
          }
        }
      }

      // StrongEmphasis (**bold** or __bold__)
      if (nodeType === "StrongEmphasis") {
        const text = doc.sliceString(node.from, node.to);
        const marker = text.startsWith("**") ? "**" : "__";
        const markerLen = marker.length;

        // Hide opening marker
        decorations.push({
          from: node.from,
          to: node.from + markerLen,
          decoration: hiddenMark,
        });

        // Style the content
        decorations.push({
          from: node.from + markerLen,
          to: node.to - markerLen,
          decoration: strongMark,
        });

        // Hide closing marker
        decorations.push({
          from: node.to - markerLen,
          to: node.to,
          decoration: hiddenMark,
        });
      }

      // Emphasis (*italic* or _italic_)
      if (nodeType === "Emphasis") {
        // Hide opening marker
        decorations.push({
          from: node.from,
          to: node.from + 1,
          decoration: hiddenMark,
        });

        // Style the content
        decorations.push({
          from: node.from + 1,
          to: node.to - 1,
          decoration: emphasisMark,
        });

        // Hide closing marker
        decorations.push({
          from: node.to - 1,
          to: node.to,
          decoration: hiddenMark,
        });
      }

      // InlineCode (`code`)
      if (nodeType === "InlineCode") {
        // Hide opening backtick
        decorations.push({
          from: node.from,
          to: node.from + 1,
          decoration: hiddenMark,
        });

        // Style the content
        decorations.push({
          from: node.from + 1,
          to: node.to - 1,
          decoration: codeMark,
        });

        // Hide closing backtick
        decorations.push({
          from: node.to - 1,
          to: node.to,
          decoration: hiddenMark,
        });
      }

      // Links [text](url)
      if (nodeType === "Link") {
        const text = doc.sliceString(node.from, node.to);
        const linkMatch = text.match(/^\[([^\]]*)\]\(([^)]*)\)$/);
        if (linkMatch) {
          const textStart = node.from + 1;
          const textEnd = node.from + 1 + linkMatch[1].length;
          const urlStart = textEnd + 2; // ](
          const urlEnd = node.to;

          // Hide [
          decorations.push({
            from: node.from,
            to: node.from + 1,
            decoration: hiddenMark,
          });

          // Style link text
          decorations.push({
            from: textStart,
            to: textEnd,
            decoration: linkMark,
          });

          // Hide ](url)
          decorations.push({
            from: textEnd,
            to: urlEnd,
            decoration: hiddenMark,
          });
        }
      }
    },
  });

  // Handle citations separately (not part of syntax tree)
  // Pattern: [@author2006] or [@author2006; @author2007]
  const citationRegex = /\[@([^\]]+)\]/g;
  const docText = doc.toString();
  let match;

  while ((match = citationRegex.exec(docText)) !== null) {
    const from = match.index;
    const to = from + match[0].length;
    const line = doc.lineAt(from).number;

    // Parse citations (separated by ;)
    const citationKeys = match[1].split(";").map(c => c.trim().replace(/^@/, ""));

    if (activeLines.has(line)) {
      // On active line, mark as raw citation (clickable)
      decorations.push({
        from,
        to,
        decoration: citationRawMark,
      });
    } else {
      // Replace with widget on non-active lines
      decorations.push({
        from,
        to,
        decoration: Decoration.replace({
          widget: new CitationWidget(citationKeys, match[0]),
        }),
      });
    }
  }

  // Handle images separately - show preview on non-active lines
  // Pattern: ![alt text](url) or ![alt text](url "title")
  const imageRegex = /!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
  let imgMatch;

  while ((imgMatch = imageRegex.exec(docText)) !== null) {
    const from = imgMatch.index;
    const to = from + imgMatch[0].length;
    const line = doc.lineAt(from).number;
    const alt = imgMatch[1];
    const src = imgMatch[2];

    // Only show widget on non-active lines
    // Note: We don't use block: true as block decorations cannot be specified via plugins
    if (!activeLines.has(line)) {
      decorations.push({
        from,
        to,
        decoration: Decoration.replace({
          widget: new ImageWidget(src, alt, imgMatch[0]),
        }),
      });
    }
  }

  // Filter valid decorations and create ranges
  // IMPORTANT: Filter out any decorations that span multiple lines to avoid
  // "Decorations that replace line breaks may not be specified via plugins" error
  const ranges = decorations
    .filter(({ from, to }) => {
      if (from >= to) return false;
      // Ensure decoration doesn't span multiple lines
      try {
        const startLine = doc.lineAt(from).number;
        const endLine = doc.lineAt(to).number;
        return startLine === endLine;
      } catch {
        return false;
      }
    })
    .map(({ from, to, decoration }) => decoration.range(from, to));

  // Use Decoration.set with sort=true to handle ordering automatically
  return Decoration.set(ranges, true);
}

// Factory function to create live preview plugin
function createLivePreviewPlugin() {
  return ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;

      constructor(view: EditorView) {
        try {
          this.decorations = createLivePreviewDecorations(view);
        } catch (e) {
          console.error("Error creating decorations:", e);
          this.decorations = Decoration.none;
        }
      }

      update(update: ViewUpdate) {
        // Always recompute decorations to handle:
        // - Document changes
        // - Selection changes (active line detection)
        // - Viewport changes
        // - Focus changes (show/hide raw markdown)
        // - Async syntax tree parsing completion
        try {
          this.decorations = createLivePreviewDecorations(update.view);
        } catch (e) {
          console.error("Error updating decorations:", e);
          this.decorations = Decoration.none;
        }
      }
    },
    {
      decorations: (v) => v.decorations,
    }
  );
}

// Line wrapping
const lineWrapping = EditorView.lineWrapping;

// Click handler for citation widgets and raw citations - opens modal
const citationClickHandler = EditorView.domEventHandlers({
  click: (event, view) => {
    const target = event.target as HTMLElement;

    // Check if clicked on a citation widget
    if (target.classList.contains("cm-citation-widget")) {
      event.preventDefault();
      event.stopPropagation();

      // Get click position for modal
      const rect = target.getBoundingClientRect();

      // Get the raw citation text from the title attribute
      const rawCitation = target.getAttribute("title");
      if (!rawCitation) return false;

      // Find this citation in the document
      const doc = view.state.doc;
      const docText = doc.toString();
      const citationIndex = docText.indexOf(rawCitation);

      if (citationIndex >= 0 && globalSetCitationModal) {
        globalSetCitationModal({
          isOpen: true,
          position: { x: rect.left, y: rect.bottom + 4 },
          citationRange: { from: citationIndex, to: citationIndex + rawCitation.length },
          onSelect: (key: string) => {
            // Replace or add to the citation
            const insideBrackets = rawCitation.slice(1, -1); // Remove [ and ]
            const newContent = insideBrackets.includes(";")
              ? `[${insideBrackets}; @${key}]`
              : `[@${key}]`;

            view.dispatch({
              changes: { from: citationIndex, to: citationIndex + rawCitation.length, insert: newContent },
            });
          },
        });
        return true;
      }
    }

    // Check if clicked on raw citation (on active line)
    if (target.classList.contains("cm-citation-raw")) {
      event.preventDefault();
      event.stopPropagation();

      const rect = target.getBoundingClientRect();
      const pos = view.posAtDOM(target);
      const doc = view.state.doc;
      const docText = doc.toString();

      // Find the citation at this position
      const citationRegex = /\[@[^\]]+\]/g;
      let match;
      while ((match = citationRegex.exec(docText)) !== null) {
        if (match.index <= pos && pos <= match.index + match[0].length) {
          if (globalSetCitationModal) {
            globalSetCitationModal({
              isOpen: true,
              position: { x: rect.left, y: rect.bottom + 4 },
              citationRange: { from: match.index, to: match.index + match[0].length },
              onSelect: (key: string) => {
                const currentContent = match![0];
                const insideBrackets = currentContent.slice(1, -1);
                const newContent = insideBrackets.includes(";")
                  ? `[${insideBrackets}; @${key}]`
                  : `[@${key}]`;

                view.dispatch({
                  changes: { from: match!.index, to: match!.index + match![0].length, insert: newContent },
                });
              },
            });
          }
          return true;
        }
      }
    }
    return false;
  },
});

// Placeholder text
const placeholderText = `# Comece a escrever sua tese...

Use Markdown para formatar:
- **negrito** para ênfase
- *itálico* para termos
- [@autor2023] para citações

## Exemplo de Seção {#sec:exemplo}

Seu texto aqui...`;

// Citation Modal Component
function CitationModal({
  isOpen,
  position,
  bibEntries,
  onSelect,
  onClose,
}: {
  isOpen: boolean;
  position: { x: number; y: number };
  bibEntries: BibEntry[];
  onSelect: (key: string) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState("");
  const [adjustedPosition, setAdjustedPosition] = useState(position);
  const modalRef = useRef<HTMLDivElement>(null);

  // Modal dimensions
  const MODAL_HEIGHT = 320; // max-h-80 = 20rem = 320px
  const MODAL_WIDTH = 320;  // w-80 = 20rem = 320px

  useEffect(() => {
    if (isOpen) {
      setSearch("");

      // Calculate if modal would overflow viewport
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;

      let newY = position.y;
      let newX = position.x;

      // Check if modal would overflow bottom of viewport
      if (position.y + MODAL_HEIGHT > viewportHeight - 20) {
        // Position above the click point instead (subtract modal height + some offset)
        newY = position.y - MODAL_HEIGHT - 30;
        // Make sure it doesn't go above viewport
        if (newY < 10) newY = 10;
      }

      // Check if modal would overflow right of viewport
      if (position.x + MODAL_WIDTH > viewportWidth - 20) {
        newX = viewportWidth - MODAL_WIDTH - 20;
      }

      // Make sure it doesn't go off left side
      if (newX < 10) newX = 10;

      setAdjustedPosition({ x: newX, y: newY });
    }
  }, [isOpen, position]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filteredEntries = bibEntries.filter((entry) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      entry.key.toLowerCase().includes(searchLower) ||
      entry.author?.toLowerCase().includes(searchLower) ||
      entry.title?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div
      ref={modalRef}
      className="fixed z-50 bg-card border border-primary/30 rounded-lg shadow-xl max-h-80 w-80 overflow-hidden"
      style={{ left: adjustedPosition.x, top: adjustedPosition.y }}
    >
      {/* Search input */}
      <div className="p-2 border-b border-border">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar referencia..."
          className="w-full px-3 py-2 bg-background border border-border rounded text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary"
          autoFocus
        />
      </div>

      {/* Results list */}
      <div className="overflow-y-auto max-h-60">
        {filteredEntries.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground text-sm">
            Nenhuma referencia encontrada
          </div>
        ) : (
          filteredEntries.map((entry, index) => {
            const authorShort = entry.author?.split(",")[0]?.split(" and ")[0] || "Unknown";
            return (
              <button
                key={`${entry.key}-${index}`}
                onClick={() => {
                  onSelect(entry.key);
                  onClose();
                }}
                className="w-full px-3 py-2 text-left hover:bg-accent flex flex-col gap-0.5 border-b border-border/50 last:border-b-0"
              >
                <div className="flex items-center gap-2">
                  <span className="text-primary font-mono text-sm">@{entry.key}</span>
                  <span className="text-muted-foreground text-xs">
                    {authorShort}, {entry.year || "n.d."}
                  </span>
                </div>
                {entry.title && (
                  <span className="text-foreground/80 text-xs truncate">{entry.title}</span>
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

export const MarkdownEditor = forwardRef<MarkdownEditorRef, MarkdownEditorProps>(
  function MarkdownEditor({ value, onChange, filename, bibContent = "" }, ref) {
  const editorRef = useRef<ReactCodeMirrorRef>(null);

  const handleChange = useCallback(
    (val: string) => {
      onChange(val);
    },
    [onChange]
  );

  // Expose undo/redo functions via ref
  useImperativeHandle(ref, () => ({
    undo: () => {
      const view = editorRef.current?.view;
      if (view) {
        undo(view);
      }
    },
    redo: () => {
      const view = editorRef.current?.view;
      if (view) {
        redo(view);
      }
    },
  }), []);

  // Citation modal state
  const [citationModal, setCitationModal] = useState<CitationModalState>({
    isOpen: false,
    position: { x: 0, y: 0 },
    citationRange: null,
    onSelect: null,
  });

  // Register global setter for the click handler
  useEffect(() => {
    globalSetCitationModal = setCitationModal;
    // Also expose to window for widget access
    if (typeof window !== "undefined") {
      (window as unknown as { __citationModalSetter: typeof globalSetCitationModal }).__citationModalSetter = setCitationModal;
    }
    return () => {
      globalSetCitationModal = null;
      if (typeof window !== "undefined") {
        (window as unknown as { __citationModalSetter: typeof globalSetCitationModal }).__citationModalSetter = null;
      }
    };
  }, []);

  // Global mousedown handler for citation widgets (captures before CodeMirror processes)
  useEffect(() => {
    const handleGlobalMouseDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement;

      // Check if clicked on an individual citation item within a widget
      const citationItem = target.classList.contains("cm-citation-item")
        ? target
        : target.closest(".cm-citation-item") as HTMLElement | null;

      if (citationItem) {
        e.preventDefault();
        e.stopPropagation();

        const rect = citationItem.getBoundingClientRect();
        const citeKey = citationItem.dataset.citeKey || "";
        const citeIndex = parseInt(citationItem.dataset.citeIndex || "0", 10);

        // Get the parent container to find the raw citation
        const container = citationItem.closest(".cm-citation-widget-container");
        const rawCitation = container?.getAttribute("data-citation") || container?.getAttribute("title") || "";

        if (rawCitation && citeKey) {
          setCitationModal({
            isOpen: true,
            position: { x: rect.left, y: rect.bottom + 4 },
            citationRange: null,
            onSelect: null,
            replaceMode: {
              rawCitation,
              citeKey,
              citeIndex,
            },
          });
        }
        return;
      }

      // Check if clicked on a citation widget container itself (not on individual item)
      if (target.classList.contains("cm-citation-widget-container") ||
          target.classList.contains("cm-citation-paren") ||
          target.classList.contains("cm-citation-separator")) {
        // Don't intercept clicks on container parts - let individual items handle it
        return;
      }

      // Legacy: Check if clicked on old-style citation widget
      if (target.classList.contains("cm-citation-widget")) {
        e.preventDefault();
        e.stopPropagation();

        const rect = target.getBoundingClientRect();
        const rawCitation = target.dataset.citation || target.getAttribute("title");

        if (rawCitation) {
          // For old-style widgets, just open modal without replace mode
          setCitationModal({
            isOpen: true,
            position: { x: rect.left, y: rect.bottom + 4 },
            citationRange: null,
            onSelect: null,
          });
          (window as unknown as Record<string, string>).__pendingCitation = rawCitation;
        }
        return;
      }

      // Check if clicked on raw citation (on active line) - look for parent with class too
      const citationRaw = target.classList.contains("cm-citation-raw")
        ? target
        : target.closest(".cm-citation-raw") as HTMLElement | null;

      if (citationRaw) {
        e.preventDefault();
        e.stopPropagation();

        const rect = citationRaw.getBoundingClientRect();
        const rawText = citationRaw.textContent || "";

        // For raw citations, we need to determine which citation was clicked
        // Parse the raw text to get citation keys
        const citationsInRaw = rawText.slice(1, -1).split(";").map(c => c.trim().replace(/^@/, ""));

        // If there's only one citation, open replace mode for it
        if (citationsInRaw.length === 1) {
          setCitationModal({
            isOpen: true,
            position: { x: rect.left, y: rect.bottom + 4 },
            citationRange: null,
            onSelect: null,
            replaceMode: {
              rawCitation: rawText,
              citeKey: citationsInRaw[0],
              citeIndex: 0,
            },
          });
        } else {
          // For multiple citations in raw mode, open without replace mode (add mode)
          setCitationModal({
            isOpen: true,
            position: { x: rect.left, y: rect.bottom + 4 },
            citationRange: null,
            onSelect: null,
          });
          (window as unknown as Record<string, string>).__pendingCitation = rawText;
        }
        return;
      }
    };

    // Use mousedown in capture phase - this fires before CodeMirror can intercept
    document.addEventListener("mousedown", handleGlobalMouseDown, true);

    return () => {
      document.removeEventListener("mousedown", handleGlobalMouseDown, true);
    };
  }, []);

  // Parse bib entries for autocomplete
  const bibEntries = useMemo(() => parseBibTeX(bibContent), [bibContent]);

  // Extensions for CodeMirror with Live Preview
  // Create fresh extensions each time to ensure proper initialization
  const extensions: Extension[] = [
    markdown({
      base: markdownLanguage,
      codeLanguages: languages,
      addKeymap: true,
    }),
    syntaxHighlighting(customHighlightStyle),
    createLivePreviewPlugin(),
    lineWrapping,
    citationClickHandler,
    autocompletion({
      override: [createCitationAutocomplete(bibEntries)],
      activateOnTyping: true,
      icons: false,
      aboveCursor: false, // Always show below cursor
      defaultKeymap: true,
      optionClass: () => "cm-citation-option",
    }),
  ];

  const handleCitationSelect = useCallback((key: string) => {
    // If we have a replaceMode, replace the specific citation in the document
    if (citationModal.replaceMode) {
      const { rawCitation, citeIndex } = citationModal.replaceMode;
      const view = editorRef.current?.view;

      if (view) {
        const doc = view.state.doc;
        const docText = doc.toString();

        // Find the citation in the document
        const citationIndex = docText.indexOf(rawCitation);

        if (citationIndex >= 0) {
          // Parse the citations inside the brackets
          const insideBrackets = rawCitation.slice(1, -1); // Remove [ and ]
          const citations = insideBrackets.split(";").map(c => c.trim());

          // Replace the specific citation at the given index
          citations[citeIndex] = `@${key}`;

          // Rebuild the citation string
          const newContent = `[${citations.join("; ")}]`;

          // Dispatch the change
          view.dispatch({
            changes: {
              from: citationIndex,
              to: citationIndex + rawCitation.length,
              insert: newContent,
            },
          });
        }
      }
    } else if (citationModal.onSelect) {
      // Legacy behavior
      citationModal.onSelect(key);
    } else {
      // Fallback: check for pending citation (old-style widgets)
      const pendingCitation = (window as unknown as Record<string, string>).__pendingCitation;
      if (pendingCitation) {
        const view = editorRef.current?.view;
        if (view) {
          const doc = view.state.doc;
          const docText = doc.toString();
          const citationIndex = docText.indexOf(pendingCitation);

          if (citationIndex >= 0) {
            // Add the new citation to existing ones
            const insideBrackets = pendingCitation.slice(1, -1);
            const newContent = `[${insideBrackets}; @${key}]`;

            view.dispatch({
              changes: {
                from: citationIndex,
                to: citationIndex + pendingCitation.length,
                insert: newContent,
              },
            });
          }
        }
        delete (window as unknown as Record<string, string>).__pendingCitation;
      }
    }
  }, [citationModal.replaceMode, citationModal.onSelect]);

  const handleCloseModal = useCallback(() => {
    setCitationModal((prev) => ({ ...prev, isOpen: false }));
  }, []);

  return (
    <div className="h-full flex flex-col bg-background">
      {/* File name header */}
      <div className="px-4 py-2 border-b border-border bg-card text-sm text-muted-foreground flex items-center gap-2">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-primary"
        >
          <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <line x1="10" y1="9" x2="8" y2="9" />
        </svg>
        {filename || "Selecione um arquivo"}
      </div>

      {/* Editor area */}
      <div className="flex-1 overflow-hidden relative">
        <CodeMirror
          ref={editorRef}
          value={value}
          onChange={handleChange}
          extensions={extensions}
          theme={obsidianTheme}
          placeholder={placeholderText}
          height="100%"
          style={{ height: "100%" }}
          autoFocus={false}
          basicSetup={{
            lineNumbers: false,
            highlightActiveLineGutter: false,
            highlightActiveLine: true,
            foldGutter: false,
            dropCursor: true,
            allowMultipleSelections: true,
            indentOnInput: true,
            bracketMatching: true,
            closeBrackets: true,
            autocompletion: false,
            rectangularSelection: true,
            crosshairCursor: false,
            highlightSelectionMatches: false,
            searchKeymap: true,
            history: true,
            historyKeymap: true,
          }}
        />

        {/* Citation Modal */}
        <CitationModal
          isOpen={citationModal.isOpen}
          position={citationModal.position}
          bibEntries={bibEntries}
          onSelect={handleCitationSelect}
          onClose={handleCloseModal}
        />
      </div>
    </div>
  );
});
