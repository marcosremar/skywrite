#!/usr/bin/env python3
"""
Convert Markdown chapters to LaTeX
Uses Pandoc with custom template
Supports custom paths via environment variables for bilingual builds
"""

import sys
import os
import subprocess
from pathlib import Path
import yaml

ROOT_DIR = Path(__file__).parent.parent.parent
CONTENT_DIR = ROOT_DIR / "content"

# Allow override via environment variables (for bilingual builds)
TEXT_DIR = Path(os.getenv("TEXT_DIR", CONTENT_DIR / "text"))
BUILD_DIR = Path(os.getenv("BUILD_DIR", "/tmp/thesis-build"))
METADATA_FILE = Path(os.getenv("METADATA_FILE", CONTENT_DIR / "metadata.yaml"))

CHAPTERS_DIR = TEXT_DIR / "chapters"
STRUCTURE_DIR = TEXT_DIR / "structure"
APPENDICES_DIR = TEXT_DIR / "appendices"
CORE_DIR = ROOT_DIR / "core"
CONFIG_DIR = CORE_DIR / "config"
THEME_DIR = CORE_DIR / "theme"

def load_metadata():
    """Load metadata from metadata.yaml (or custom path)"""
    if METADATA_FILE.exists():
        with open(METADATA_FILE, 'r', encoding='utf-8') as f:
            return yaml.safe_load(f)
    return {}

def convert_chapter(md_file: Path, tex_file: Path, metadata: dict) -> bool:
    """Convert a single Markdown file to LaTeX"""
    try:
        print(f"  Converting {md_file.name} → {tex_file.name}...")

        # Pandoc command - let LaTeX/BibLaTeX handle citations, not Pandoc
        cmd = [
            "pandoc",
            str(md_file),
            "-f", "markdown+citations+footnotes+smart",
            "-t", "latex",
            "--filter", "pandoc-crossref",  # Enable cross-references (@fig:, @sec:, etc)
            "--top-level-division=chapter",
            "--natbib",  # Use natbib citation commands compatible with biblatex
            "-o", str(tex_file)
        ]

        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            cwd=CONTENT_DIR
        )

        if result.returncode != 0:
            print(f"    ✗ Error: {result.stderr}")
            return False

        # Post-process: fix image paths to be absolute
        fix_image_paths_in_tex(tex_file)

        print(f"    ✓ Converted")
        return True

    except Exception as e:
        print(f"    ✗ Error: {e}")
        return False

def fix_image_paths_in_tex(tex_file: Path):
    """Fix image paths in generated LaTeX to use absolute paths"""
    import re
    content = tex_file.read_text(encoding='utf-8')

    # Replace media/ with absolute path (handles both with and without options)
    media_dir = CONTENT_DIR / "media"
    # Pattern: \includegraphics[...]{media/file.jpg} or \includegraphics{media/file.jpg}
    content = re.sub(
        r'(\\includegraphics(?:\[[^\]]*\])?)\{media/',
        rf'\1{{{media_dir.absolute()}/',
        content
    )

    tex_file.write_text(content, encoding='utf-8')

def generate_strings_tex(metadata: dict) -> Path:
    """Generate strings.tex with theme strings from metadata"""
    output_file = BUILD_DIR / "strings.tex"

    strings = metadata.get('strings', {})

    # Default strings if not provided
    defaults = {
        'contents': 'Contents',
        'listfigures': 'List of Figures',
        'listtables': 'List of Tables',
        'listlistings': 'Listings',
        'abstract': 'Abstract',
        'acknowledgments': 'Acknowledgments',
        'bibliography': 'Bibliography',
        'chapter': 'Chapter',
        'appendix': 'Appendix'
    }

    # Use provided strings or defaults
    for key in defaults:
        if key not in strings:
            strings[key] = defaults[key]

    # Generate LaTeX commands to override theme strings
    content = f"""%*******************************************************
% Custom Theme Strings
% Generated from metadata.yaml
%*******************************************************

% Override LaTeX/Babel default strings with metadata values
\\renewcommand{{\\contentsname}}{{{strings.get('contents', 'Contents')}}}
\\renewcommand{{\\listfigurename}}{{{strings.get('listfigures', 'List of Figures')}}}
\\renewcommand{{\\listtablename}}{{{strings.get('listtables', 'List of Tables')}}}
\\renewcommand{{\\lstlistlistingname}}{{{strings.get('listlistings', 'Listings')}}}
\\renewcommand{{\\abstractname}}{{{strings.get('abstract', 'Abstract')}}}
\\renewcommand{{\\bibname}}{{{strings.get('bibliography', 'Bibliography')}}}
\\renewcommand{{\\chaptername}}{{{strings.get('chapter', 'Chapter')}}}
\\renewcommand{{\\appendixname}}{{{strings.get('appendix', 'Appendix')}}}

% Custom strings for frontmatter
\\newcommand{{\\acknowledgmentsname}}{{{strings.get('acknowledgments', 'Acknowledgments')}}}
"""

    output_file.write_text(content, encoding='utf-8')
    return output_file

def generate_main_tex(metadata: dict) -> Path:
    """Generate main thesis.tex file"""
    output_file = BUILD_DIR / "thesis.tex"

    # Load only general.tex (which includes the other preamble files)
    general_preamble = THEME_DIR / "preamble" / "general.tex"

    # Generate strings.tex
    strings_file = generate_strings_tex(metadata)

    # Generate document
    content = f"""\\RequirePackage{{fix-cm}}
\\documentclass[%
    twoside, openright, titlepage, numbers=noenddot,%
    cleardoublepage=empty,%
    abstract=false,%
    paper={metadata.get('papersize', 'a5')}, fontsize={metadata.get('fontsize', '10pt')},%
]{{scrreprt}}

% Preamble
\\input{{{general_preamble.absolute()}}}

% Custom theme strings from metadata
\\input{{{strings_file.absolute()}}}

% Bibliography
"""

    # Add bibliography files with absolute paths
    for bib in metadata.get('bibliography', []):
        bib_path = CONTENT_DIR / bib
        if bib_path.exists():
            content += f"\\addbibresource{{{bib_path.absolute()}}}\n"

    content += """
\\begin{document}
\\frenchspacing
\\raggedbottom
\\selectlanguage{""" + metadata.get('language', 'english') + """}
\\pagenumbering{roman}
\\pagestyle{scrplain}

"""

    # Add cover if exists
    cover_file = THEME_DIR / "cover" / "cover.tex"
    if cover_file.exists():
        content += f"\\input{{{cover_file.absolute()}}}\n"

    # Add frontmatter
    frontmatter_files = [
        "titlepage.tex",
        "titleback.tex",
        "dedication.tex",
        "abstract.tex",
        "acknowledgments.tex",
        "contents.tex"
    ]

    for fm_file in frontmatter_files:
        fm_path = THEME_DIR / "frontbackmatter" / fm_file
        if fm_path.exists():
            content += f"\\cleardoublepage\\input{{{fm_path.absolute()}}}\n"

    content += """
\\pagestyle{scrheadings}

% Mainmatter
\\cleardoublepage\\pagenumbering{arabic}

"""

    # Add variable chapters (converted from MD) - sorted by numeric prefix
    chapter_files = sorted(CHAPTERS_DIR.glob("*.md"))
    for md_file in chapter_files:
        tex_file = BUILD_DIR / md_file.with_suffix('.tex').name
        if tex_file.exists():
            content += f"\\input{{{tex_file.absolute()}}}\n\\cleardoublepage\n"

    # Add structure files (appendix, etc) - always at the end
    structure_files = sorted(STRUCTURE_DIR.glob("*.md"))
    for md_file in structure_files:
        tex_file = BUILD_DIR / md_file.with_suffix('.tex').name
        if tex_file.exists():
            content += f"\\input{{{tex_file.absolute()}}}\n\\cleardoublepage\n"

    # Add appendices - after structure, before bibliography
    if APPENDICES_DIR.exists():
        content += "\\appendix\n"  # Switch to appendix mode
        appendix_files = sorted(APPENDICES_DIR.glob("*.md"))
        for md_file in appendix_files:
            tex_file = BUILD_DIR / md_file.with_suffix('.tex').name
            if tex_file.exists():
                content += f"\\input{{{tex_file.absolute()}}}\n\\cleardoublepage\n"

    # Add bibliography
    content += """
\\cleardoublepage
\\printbibliography[heading=bibintoc]

\\end{document}
"""

    output_file.write_text(content, encoding='utf-8')
    return output_file

def convert_all():
    """Convert all Markdown chapters to LaTeX"""
    print("=" * 60)
    print("Converting Markdown to LaTeX")
    print("=" * 60)
    print()

    # Load metadata
    metadata = load_metadata()
    print(f"Loaded metadata: {metadata.get('title', 'No title')}")
    print()

    # Ensure build directory exists
    BUILD_DIR.mkdir(exist_ok=True)

    # Find all .md files in chapters, structure, and appendices
    chapter_files = sorted(CHAPTERS_DIR.glob("*.md"))
    structure_files = sorted(STRUCTURE_DIR.glob("*.md")) if STRUCTURE_DIR.exists() else []
    appendix_files = sorted(APPENDICES_DIR.glob("*.md")) if APPENDICES_DIR.exists() else []
    all_files = chapter_files + structure_files + appendix_files

    if not all_files:
        print("No .md files found in content/text/")
        print("Run: python3 core/scripts/convert_tex_to_md.py")
        return False

    print(f"Found {len(chapter_files)} chapters + {len(structure_files)} structure files + {len(appendix_files)} appendices")
    print()

    # Convert each file
    success = 0
    for md_file in all_files:
        tex_file = BUILD_DIR / md_file.with_suffix('.tex').name
        if convert_chapter(md_file, tex_file, metadata):
            success += 1

    print()
    print(f"Converted {success}/{len(all_files)} files")
    print()

    # Generate main thesis.tex
    print("Generating main thesis.tex...")
    main_tex = generate_main_tex(metadata)
    print(f"  ✓ Created: {main_tex}")
    print()

    print("=" * 60)
    print("Conversion complete!")
    print("=" * 60)

    return success == len(all_files)

if __name__ == "__main__":
    # Check if pandoc is available
    try:
        subprocess.run(["pandoc", "--version"],
                      capture_output=True, check=True)
    except (subprocess.CalledProcessError, FileNotFoundError):
        print("Error: Pandoc is not installed")
        print("Install with: brew install pandoc")
        sys.exit(1)

    success = convert_all()
    sys.exit(0 if success else 1)
