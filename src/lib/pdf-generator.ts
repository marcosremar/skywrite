import { marked } from "marked";
import { jsPDF } from "jspdf";

interface PDFOptions {
  title?: string;
  author?: string;
  content: string;
}

// Simple markdown to text converter for PDF
function markdownToLines(markdown: string): Array<{ text: string; style: string }> {
  const lines: Array<{ text: string; style: string }> = [];
  const rawLines = markdown.split("\n");

  for (const line of rawLines) {
    const trimmed = line.trim();

    if (!trimmed) {
      lines.push({ text: "", style: "normal" });
      continue;
    }

    // Headers
    if (trimmed.startsWith("### ")) {
      lines.push({ text: trimmed.slice(4), style: "h3" });
    } else if (trimmed.startsWith("## ")) {
      lines.push({ text: trimmed.slice(3), style: "h2" });
    } else if (trimmed.startsWith("# ")) {
      lines.push({ text: trimmed.slice(2), style: "h1" });
    }
    // Lists
    else if (trimmed.match(/^\d+\.\s/)) {
      lines.push({ text: "  " + trimmed, style: "list" });
    } else if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      lines.push({ text: "  • " + trimmed.slice(2), style: "list" });
    }
    // Regular paragraph
    else {
      // Clean markdown formatting
      let text = trimmed
        .replace(/\*\*(.+?)\*\*/g, "$1") // bold
        .replace(/\*(.+?)\*/g, "$1") // italic
        .replace(/`(.+?)`/g, "$1") // code
        .replace(/\[(.+?)\]\(.+?\)/g, "$1") // links
        .replace(/\[@.+?\]/g, "[ref]"); // citations

      lines.push({ text, style: "normal" });
    }
  }

  return lines;
}

export async function generatePDF(options: PDFOptions): Promise<Buffer> {
  const { title, author, content } = options;

  // Create PDF document (A4 size)
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const marginLeft = 30;
  const marginRight = 20;
  const marginTop = 25;
  const marginBottom = 25;
  const contentWidth = pageWidth - marginLeft - marginRight;

  let y = marginTop;

  // Helper to add new page if needed
  const checkNewPage = (neededSpace: number) => {
    if (y + neededSpace > pageHeight - marginBottom) {
      doc.addPage();
      y = marginTop;
      return true;
    }
    return false;
  };

  // Title page
  if (title) {
    doc.setFont("times", "bold");
    doc.setFontSize(24);

    // Center title
    const titleLines = doc.splitTextToSize(title.toUpperCase(), contentWidth);
    const titleY = pageHeight / 3;

    titleLines.forEach((line: string, i: number) => {
      const textWidth = doc.getTextWidth(line);
      const x = (pageWidth - textWidth) / 2;
      doc.text(line, x, titleY + (i * 10));
    });

    // Author
    if (author) {
      doc.setFont("times", "normal");
      doc.setFontSize(14);
      const authorWidth = doc.getTextWidth(author);
      doc.text(author, (pageWidth - authorWidth) / 2, titleY + 60);
    }

    // Add new page for content
    doc.addPage();
    y = marginTop;
  }

  // Process content
  const lines = markdownToLines(content);

  for (const line of lines) {
    if (line.text === "") {
      y += 4;
      continue;
    }

    let fontSize = 12;
    let fontStyle: "normal" | "bold" | "italic" = "normal";
    let lineHeight = 6;
    let addSpaceBefore = 0;

    switch (line.style) {
      case "h1":
        fontSize = 16;
        fontStyle = "bold";
        lineHeight = 8;
        addSpaceBefore = 10;
        break;
      case "h2":
        fontSize = 14;
        fontStyle = "bold";
        lineHeight = 7;
        addSpaceBefore = 8;
        break;
      case "h3":
        fontSize = 12;
        fontStyle = "bold";
        lineHeight = 6;
        addSpaceBefore = 6;
        break;
      case "list":
        fontSize = 12;
        lineHeight = 5;
        break;
      default:
        fontSize = 12;
        lineHeight = 6;
    }

    y += addSpaceBefore;
    checkNewPage(lineHeight * 2);

    doc.setFont("times", fontStyle);
    doc.setFontSize(fontSize);

    // Word wrap
    const wrappedLines = doc.splitTextToSize(line.text, contentWidth);

    for (const wrappedLine of wrappedLines) {
      checkNewPage(lineHeight);
      doc.text(wrappedLine, marginLeft, y);
      y += lineHeight;
    }
  }

  // Return as Buffer
  const arrayBuffer = doc.output("arraybuffer");
  return Buffer.from(arrayBuffer);
}
