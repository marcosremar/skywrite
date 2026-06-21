#!/usr/bin/env python3
"""
Convert LaTeX chapters to Markdown
Uses Pandoc to convert .tex files to .md
"""

import sys
import subprocess
from pathlib import Path
import re

ROOT_DIR = Path(__file__).parent.parent.parent
CONTENT_DIR = ROOT_DIR / "content"
TEXT_DIR = CONTENT_DIR / "text"
CHAPTERS_DIR = TEXT_DIR / "chapters"

def convert_file(tex_file: Path, md_file: Path) -> bool:
    """Convert a single .tex file to .md using Pandoc"""
    try:
        print(f"Converting {tex_file.name} → {md_file.name}...")

        # Pandoc conversion
        result = subprocess.run([
            "pandoc",
            str(tex_file),
            "-f", "latex",
            "-t", "markdown+citations+footnotes",
            "--wrap=none",
            "--markdown-headings=atx",
            "-o", str(md_file)
        ], capture_output=True, text=True)

        if result.returncode != 0:
            print(f"  ✗ Error: {result.stderr}")
            return False

        # Post-process: fix image paths
        fix_image_paths(md_file)

        # Post-process: fix citations
        fix_citations(md_file)

        print(f"  ✓ Converted successfully")
        return True

    except Exception as e:
        print(f"  ✗ Error: {e}")
        return False

def fix_image_paths(md_file: Path):
    """Fix image paths to point to content/media/"""
    content = md_file.read_text(encoding='utf-8')

    # Replace chapter-specific image paths with media/
    # chapters/introduction/images/fig.png → media/fig.png
    content = re.sub(
        r'chapters/[^/]+/images/([^)]+)',
        r'media/\1',
        content
    )

    # Also handle direct image references
    content = re.sub(
        r'images/([^)]+)',
        r'media/\1',
        content
    )

    md_file.write_text(content, encoding='utf-8')

def fix_citations(md_file: Path):
    """Convert LaTeX citations to Pandoc style"""
    content = md_file.read_text(encoding='utf-8')

    # \autocite{ref} → [@ref]
    content = re.sub(r'\\autocite\{([^}]+)\}', r'[@\1]', content)

    # \textcite{ref} → @ref
    content = re.sub(r'\\textcite\{([^}]+)\}', r'@\1', content)

    # \parencite{ref} → [@ref]
    content = re.sub(r'\\parencite\{([^}]+)\}', r'[@\1]', content)

    # \cite{ref} → [@ref]
    content = re.sub(r'\\cite\{([^}]+)\}', r'[@\1]', content)

    md_file.write_text(content, encoding='utf-8')

def convert_all_chapters():
    """Convert all chapter .tex files to .md"""
    print("=" * 60)
    print("Converting LaTeX chapters to Markdown")
    print("=" * 60)
    print()

    # Find all main.tex files in chapters
    tex_files = list(CHAPTERS_DIR.glob("*/main.tex"))

    if not tex_files:
        print("No .tex files found in chapters/")
        return

    success = 0
    failed = 0

    for tex_file in tex_files:
        chapter_name = tex_file.parent.name
        md_file = tex_file.parent / f"{chapter_name}.md"

        if convert_file(tex_file, md_file):
            success += 1
        else:
            failed += 1

    print()
    print("=" * 60)
    print(f"Conversion complete!")
    print(f"  ✓ Success: {success}")
    if failed:
        print(f"  ✗ Failed:  {failed}")
    print("=" * 60)
    print()
    print("Next steps:")
    print("  1. Review converted .md files")
    print("  2. Fix any formatting issues")
    print("  3. Backup original .tex files")
    print("  4. Run: ./build.sh")

if __name__ == "__main__":
    # Check if pandoc is available
    try:
        subprocess.run(["pandoc", "--version"],
                      capture_output=True, check=True)
    except (subprocess.CalledProcessError, FileNotFoundError):
        print("Error: Pandoc is not installed")
        print("Install with: brew install pandoc")
        sys.exit(1)

    convert_all_chapters()
