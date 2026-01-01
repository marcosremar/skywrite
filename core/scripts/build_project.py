#!/usr/bin/env python3
"""
Build PDF from project files stored in database
This script receives project data as JSON and builds a PDF

Usage:
    echo '{"project_id": "...", "files": [...], "metadata": {...}}' | python build_project.py

Or with a JSON file:
    python build_project.py --input project_data.json
"""

import sys
import os
import json
import subprocess
import tempfile
import shutil
from pathlib import Path
import yaml
import argparse
import re

# Get the root directory of thesis-writer
SCRIPT_DIR = Path(__file__).parent
CORE_DIR = SCRIPT_DIR.parent  # core/scripts/../ = core/
THEME_DIR = CORE_DIR / "theme"
TEMPLATES_DIR = CORE_DIR.parent / "templates"  # thesis-writer/templates/


def load_template_config(template_id: str) -> dict:
    """Load template configuration from template.json"""
    if not template_id:
        return None

    template_dir = TEMPLATES_DIR / template_id
    config_file = template_dir / "template.json"

    if config_file.exists():
        with open(config_file, 'r', encoding='utf-8') as f:
            config = json.load(f)
            config['_template_dir'] = str(template_dir)
            return config
    return None


def get_template_latex_files(template_id: str) -> dict:
    """Get LaTeX files from template (preamble, template)"""
    if not template_id:
        return {}

    template_dir = TEMPLATES_DIR / template_id / "latex"
    result = {}

    preamble_file = template_dir / "preamble.tex"
    if preamble_file.exists():
        result['preamble'] = preamble_file.read_text(encoding='utf-8')
        result['preamble_path'] = str(preamble_file)

    template_file = template_dir / "template.tex"
    if template_file.exists():
        result['template'] = template_file.read_text(encoding='utf-8')
        result['template_path'] = str(template_file)

    return result


def setup_build_directory(project_id: str) -> Path:
    """Create a temporary build directory for the project"""
    build_dir = Path(tempfile.gettempdir()) / f"thesis-build-{project_id}"
    build_dir.mkdir(parents=True, exist_ok=True)
    return build_dir


def setup_content_directory(project_id: str) -> Path:
    """Create a temporary content directory for the project"""
    content_dir = Path(tempfile.gettempdir()) / f"thesis-content-{project_id}"
    if content_dir.exists():
        shutil.rmtree(content_dir)
    content_dir.mkdir(parents=True, exist_ok=True)
    return content_dir


def copy_theme_to_build(build_dir: Path) -> Path:
    """Copy theme files to build directory for self-contained builds"""
    theme_dest = build_dir / "theme"
    if theme_dest.exists():
        shutil.rmtree(theme_dest)

    if THEME_DIR.exists():
        shutil.copytree(THEME_DIR, theme_dest)
        print(f"  Theme copied to: {theme_dest}")
    else:
        print(f"  Warning: Theme directory not found at {THEME_DIR}")
        theme_dest.mkdir(parents=True, exist_ok=True)

    return theme_dest


import base64


def write_project_files(content_dir: Path, files: list) -> dict:
    """Write project files from database to disk

    Returns a dict with paths organized by type:
    {
        'chapters': [...],
        'structure': [...],
        'appendices': [...],
        'bibliography': [...],
        'media': [...],
        'metadata': Path or None
    }
    """
    organized = {
        'chapters': [],
        'sections': [],  # For template-based projects (journal articles)
        'structure': [],
        'appendices': [],
        'bibliography': [],
        'media': [],
        'metadata': None
    }

    for file_data in files:
        file_path = file_data.get('path', '')
        content = file_data.get('content', '')
        file_type = file_data.get('type', '')

        if not file_path or content is None:
            continue

        # Create full path
        full_path = content_dir / file_path
        full_path.parent.mkdir(parents=True, exist_ok=True)

        # Handle different file types
        if file_type == 'IMAGE' or file_path.startswith('media/'):
            # Decode base64 and write binary
            try:
                binary_content = base64.b64decode(content)
                full_path.write_bytes(binary_content)
                organized['media'].append(full_path)
                print(f"  Wrote: {file_path} ({len(binary_content)} bytes, image)")
            except Exception as e:
                print(f"  Warning: Failed to decode image {file_path}: {e}")
        else:
            # Write text file
            full_path.write_text(content, encoding='utf-8')
            print(f"  Wrote: {file_path} ({len(content)} chars)")

            # Organize by type
            if file_path.endswith('.yaml') or file_path.endswith('.yml'):
                if 'metadata' in file_path:
                    organized['metadata'] = full_path
            elif file_path.endswith('.bib'):
                organized['bibliography'].append(full_path)
            elif file_path.endswith('.md'):
                if 'chapters/' in file_path:
                    organized['chapters'].append(full_path)
                elif 'sections/' in file_path:
                    organized['sections'].append(full_path)
                elif 'structure/' in file_path:
                    organized['structure'].append(full_path)
                elif 'appendices/' in file_path:
                    organized['appendices'].append(full_path)
                else:
                    # Default to chapters for root-level .md files
                    organized['chapters'].append(full_path)

    # Sort all lists
    for key in ['chapters', 'sections', 'structure', 'appendices', 'bibliography', 'media']:
        organized[key] = sorted(organized[key])

    return organized


def load_metadata(metadata_path: Path) -> dict:
    """Load metadata from YAML file"""
    if metadata_path and metadata_path.exists():
        with open(metadata_path, 'r', encoding='utf-8') as f:
            return yaml.safe_load(f) or {}
    return {}


def check_pandoc_crossref_available() -> bool:
    """Check if pandoc-crossref filter is available"""
    try:
        result = subprocess.run(
            ["which", "pandoc-crossref"],
            capture_output=True,
            text=True
        )
        return result.returncode == 0
    except:
        return False


# Cache the pandoc-crossref availability check
_PANDOC_CROSSREF_AVAILABLE = None


def convert_md_to_tex(md_file: Path, build_dir: Path, content_dir: Path, bib_files: list = None) -> Path:
    """Convert a single Markdown file to LaTeX using Pandoc"""
    global _PANDOC_CROSSREF_AVAILABLE

    tex_file = build_dir / md_file.with_suffix('.tex').name

    print(f"  Converting {md_file.name} -> {tex_file.name}...")

    # Check pandoc-crossref availability once
    if _PANDOC_CROSSREF_AVAILABLE is None:
        _PANDOC_CROSSREF_AVAILABLE = check_pandoc_crossref_available()
        if not _PANDOC_CROSSREF_AVAILABLE:
            print("    Note: pandoc-crossref not available, skipping cross-references")

    cmd = [
        "pandoc",
        str(md_file),
        "-f", "markdown+citations+footnotes+smart",
        "-t", "latex",
        "--top-level-division=chapter",
        "--natbib",
        "-o", str(tex_file)
    ]

    # Add bibliography files for citation processing
    if bib_files:
        for bib_file in bib_files:
            cmd.insert(-2, f"--bibliography={bib_file}")

    # Only add crossref filter if available
    if _PANDOC_CROSSREF_AVAILABLE:
        cmd.insert(5, "--filter")
        cmd.insert(6, "pandoc-crossref")

    result = subprocess.run(
        cmd,
        capture_output=True,
        text=True,
        cwd=content_dir
    )

    if result.returncode != 0:
        print(f"    Warning: Pandoc returned code {result.returncode}")
        print(f"    stderr: {result.stderr[:500] if result.stderr else 'none'}")
        # Try again without any filters if it failed
        if result.returncode != 0 and not tex_file.exists():
            print(f"    Retrying with minimal options...")
            cmd_minimal = [
                "pandoc",
                str(md_file),
                "-f", "markdown",
                "-t", "latex",
                "-o", str(tex_file)
            ]
            # Still add bibliography for citations
            if bib_files:
                for bib_file in bib_files:
                    cmd_minimal.insert(-2, f"--bibliography={bib_file}")
                cmd_minimal.insert(-2, "--natbib")
            result = subprocess.run(
                cmd_minimal,
                capture_output=True,
                text=True,
                cwd=content_dir
            )
            if result.returncode != 0:
                print(f"    Error: {result.stderr[:500] if result.stderr else 'unknown'}")

    # Fix image paths if the file was created
    if tex_file.exists():
        fix_image_paths(tex_file, content_dir)
        print(f"    OK: {tex_file.name} created")
    else:
        print(f"    ERROR: Failed to create {tex_file.name}")

    return tex_file


def fix_image_paths(tex_file: Path, content_dir: Path):
    """Fix image paths in generated LaTeX to use absolute paths and proper sizing"""
    content = tex_file.read_text(encoding='utf-8')
    media_dir = content_dir / "media"

    # Fix image sizing to maintain aspect ratio
    # Replace [width=X,height=Y] with [width=X,height=Y,keepaspectratio]
    # Or simpler: just use width and let height auto-adjust
    content = re.sub(
        r'\\includegraphics\[width=([^,\]]+),height=[^\]]+\]',
        r'\\includegraphics[width=\1,keepaspectratio]',
        content
    )

    # Replace media/ with absolute path
    content = re.sub(
        r'(\\includegraphics(?:\[[^\]]*\])?)\{media/',
        rf'\1{{{media_dir.absolute()}/',
        content
    )

    tex_file.write_text(content, encoding='utf-8')


def generate_strings_tex(build_dir: Path, metadata: dict) -> Path:
    """Generate strings.tex with theme strings from metadata"""
    output_file = build_dir / "strings.tex"

    strings = metadata.get('strings', {})

    # Default strings (Portuguese)
    defaults = {
        'contents': 'Sumario',
        'listfigures': 'Lista de Figuras',
        'listtables': 'Lista de Tabelas',
        'listlistings': 'Listagens',
        'abstract': 'Resumo',
        'acknowledgments': 'Agradecimentos',
        'bibliography': 'Referencias',
        'chapter': 'Capitulo',
        'appendix': 'Apendice'
    }

    for key in defaults:
        if key not in strings:
            strings[key] = defaults[key]

    content = f"""%*******************************************************
% Custom Theme Strings
% Generated from metadata.yaml
%*******************************************************

\\renewcommand{{\\contentsname}}{{{strings.get('contents', 'Contents')}}}
\\renewcommand{{\\listfigurename}}{{{strings.get('listfigures', 'List of Figures')}}}
\\renewcommand{{\\listtablename}}{{{strings.get('listtables', 'List of Tables')}}}
\\renewcommand{{\\abstractname}}{{{strings.get('abstract', 'Abstract')}}}
\\renewcommand{{\\bibname}}{{{strings.get('bibliography', 'Bibliography')}}}
\\renewcommand{{\\chaptername}}{{{strings.get('chapter', 'Chapter')}}}
\\renewcommand{{\\appendixname}}{{{strings.get('appendix', 'Appendix')}}}

\\newcommand{{\\acknowledgmentsname}}{{{strings.get('acknowledgments', 'Acknowledgments')}}}
"""

    output_file.write_text(content, encoding='utf-8')
    return output_file


def generate_template_main_tex(build_dir: Path, organized_files: dict, metadata: dict, template_config: dict, template_latex: dict) -> Path:
    """Generate main.tex using template-based approach (for journal articles)"""
    output_file = build_dir / "main.tex"

    # Get content from converted markdown files
    content_parts = []
    for md_file in organized_files['chapters']:
        tex_file = build_dir / md_file.with_suffix('.tex').name
        if tex_file.exists():
            tex_content = tex_file.read_text(encoding='utf-8')
            content_parts.append(tex_content)

    # Also include sections if they exist
    sections_dir = organized_files.get('sections', [])
    for section_file in sections_dir:
        tex_file = build_dir / section_file.with_suffix('.tex').name
        if tex_file.exists():
            tex_content = tex_file.read_text(encoding='utf-8')
            content_parts.append(tex_content)

    body_content = "\n\n".join(content_parts)

    # Build the document using the template
    document_class = template_config.get('documentClass', 'article')
    citation_style = template_config.get('citationStyle', 'apalike')

    # Get bibliography path
    bib_path = ""
    if organized_files['bibliography']:
        bib_path = str(organized_files['bibliography'][0])

    # Generate document
    content = f"""% Generated from template: {template_config.get('name', 'Unknown')}
\\documentclass[12pt,a4paper]{{{document_class}}}

% Preamble from template
{template_latex.get('preamble', '')}

% Document metadata
\\title{{{metadata.get('title', 'Untitled')}}}
\\author{{{metadata.get('author', '')}}}
\\date{{{metadata.get('date', '')}}}

\\begin{{document}}

\\maketitle

"""

    # Add abstract if present
    abstract = metadata.get('abstract', '')
    if abstract:
        content += f"""\\begin{{abstract}}
{abstract}
\\end{{abstract}}

"""

    # Add keywords if present
    keywords = metadata.get('keywords', [])
    if keywords:
        keywords_str = "; ".join(keywords) if isinstance(keywords, list) else keywords
        content += f"""\\noindent\\textbf{{Keywords:}} {keywords_str}
\\vspace{{1em}}

"""

    # Add body content
    content += body_content

    # Add bibliography
    if bib_path:
        content += f"""

\\bibliographystyle{{{citation_style}}}
\\bibliography{{{bib_path}}}
"""

    content += """
\\end{document}
"""

    output_file.write_text(content, encoding='utf-8')
    return output_file


def generate_main_tex(build_dir: Path, organized_files: dict, metadata: dict, theme_dir: Path) -> Path:
    """Generate main thesis.tex file"""
    output_file = build_dir / "thesis.tex"

    # Paths to theme files (relative to build directory)
    general_preamble = theme_dir / "preamble" / "general.tex"
    strings_file = generate_strings_tex(build_dir, metadata)

    # Document class settings
    papersize = metadata.get('papersize', 'a4')
    fontsize = metadata.get('fontsize', '12pt')
    language = metadata.get('language', 'portuguese')

    content = f"""\\RequirePackage{{fix-cm}}
\\documentclass[%
    twoside, openright, titlepage, numbers=noenddot,%
    cleardoublepage=empty,%
    abstract=false,%
    paper={papersize}, fontsize={fontsize},%
]{{scrreprt}}

% Preamble
\\input{{{general_preamble}}}

% Custom theme strings from metadata
\\input{{{strings_file}}}

% Bibliography
"""

    # Add bibliography files
    for bib_path in organized_files['bibliography']:
        content += f"\\addbibresource{{{bib_path}}}\n"

    content += f"""
\\begin{{document}}
\\frenchspacing
\\raggedbottom
\\selectlanguage{{{language}}}
\\pagenumbering{{roman}}
\\pagestyle{{scrplain}}

"""

    # Add cover if exists
    cover_file = theme_dir / "cover" / "cover.tex"
    if cover_file.exists():
        content += f"\\input{{{cover_file}}}\n"

    # Add frontmatter files
    frontmatter_files = [
        "titlepage.tex",
        "titleback.tex",
        "dedication.tex",
        "abstract.tex",
        "acknowledgments.tex",
        "contents.tex"
    ]

    for fm_file in frontmatter_files:
        fm_path = theme_dir / "frontbackmatter" / fm_file
        if fm_path.exists():
            content += f"\\cleardoublepage\\input{{{fm_path}}}\n"

    content += """
\\pagestyle{scrheadings}

% Mainmatter
\\cleardoublepage\\pagenumbering{arabic}

"""

    # Add chapters
    for md_file in organized_files['chapters']:
        tex_file = build_dir / md_file.with_suffix('.tex').name
        if tex_file.exists():
            content += f"\\input{{{tex_file}}}\n\\cleardoublepage\n"

    # Add structure files
    for md_file in organized_files['structure']:
        tex_file = build_dir / md_file.with_suffix('.tex').name
        if tex_file.exists():
            content += f"\\input{{{tex_file}}}\n\\cleardoublepage\n"

    # Add appendices
    if organized_files['appendices']:
        content += "\\appendix\n"
        for md_file in organized_files['appendices']:
            tex_file = build_dir / md_file.with_suffix('.tex').name
            if tex_file.exists():
                content += f"\\input{{{tex_file}}}\n\\cleardoublepage\n"

    # Add bibliography
    content += """
\\cleardoublepage
\\printbibliography[heading=bibintoc]

\\end{document}
"""

    output_file.write_text(content, encoding='utf-8')
    return output_file


def compile_pdf(build_dir: Path) -> Path:
    """Compile LaTeX to PDF using latexmk"""
    thesis_tex = build_dir / "thesis.tex"
    thesis_pdf = build_dir / "thesis.pdf"

    print("\nCompiling PDF with latexmk...")

    cmd = [
        "latexmk",
        "-pdf",
        "-interaction=nonstopmode",
        "-f",  # Force completion even with errors
        f"-output-directory={build_dir}",
        "-cd",
        str(thesis_tex)
    ]

    result = subprocess.run(
        cmd,
        capture_output=True,
        cwd=build_dir
    )

    # Decode output with error handling
    try:
        stdout = result.stdout.decode('utf-8', errors='replace') if result.stdout else ''
    except:
        stdout = str(result.stdout)

    try:
        stderr = result.stderr.decode('utf-8', errors='replace') if result.stderr else ''
    except:
        stderr = str(result.stderr)

    if thesis_pdf.exists():
        print(f"  PDF generated: {thesis_pdf}")
        return thesis_pdf
    else:
        print(f"  Error compiling PDF")
        print(f"  stdout: {stdout[-2000:] if stdout else 'none'}")
        print(f"  stderr: {stderr[-2000:] if stderr else 'none'}")
        return None


def compile_template_pdf(build_dir: Path) -> Path:
    """Compile LaTeX to PDF for template-based projects"""
    main_tex = build_dir / "main.tex"
    main_pdf = build_dir / "main.pdf"

    print("\nCompiling PDF with latexmk...")

    cmd = [
        "latexmk",
        "-pdf",
        "-interaction=nonstopmode",
        "-f",  # Force completion even with errors
        f"-output-directory={build_dir}",
        "-cd",
        str(main_tex)
    ]

    result = subprocess.run(
        cmd,
        capture_output=True,
        cwd=build_dir
    )

    # Decode output with error handling
    try:
        stdout = result.stdout.decode('utf-8', errors='replace') if result.stdout else ''
    except:
        stdout = str(result.stdout)

    try:
        stderr = result.stderr.decode('utf-8', errors='replace') if result.stderr else ''
    except:
        stderr = str(result.stderr)

    if main_pdf.exists():
        print(f"  PDF generated: {main_pdf}")
        return main_pdf
    else:
        print(f"  Error compiling PDF")
        print(f"  stdout: {stdout[-2000:] if stdout else 'none'}")
        print(f"  stderr: {stderr[-2000:] if stderr else 'none'}")
        return None


def build_project(project_data: dict) -> dict:
    """Main build function - takes project data, returns build result"""
    project_id = project_data.get('project_id', 'unknown')
    files = project_data.get('files', [])
    template_id = project_data.get('template_id', None)

    print("=" * 60)
    print(f"Building project: {project_id}")
    if template_id:
        print(f"Using template: {template_id}")
    print("=" * 60)

    # Setup directories
    build_dir = setup_build_directory(project_id)
    content_dir = setup_content_directory(project_id)

    print(f"\nBuild directory: {build_dir}")
    print(f"Content directory: {content_dir}")

    # Load template configuration if provided
    template_config = None
    template_latex = {}
    if template_id:
        template_config = load_template_config(template_id)
        if template_config:
            print(f"\nTemplate loaded: {template_config.get('name', 'Unknown')}")
            template_latex = get_template_latex_files(template_id)
        else:
            print(f"\nWarning: Template '{template_id}' not found, using default theme")

    # Copy theme to build directory (for fallback)
    print("\nCopying theme files...")
    theme_dir = copy_theme_to_build(build_dir)

    # Write files to disk
    print(f"\nWriting {len(files)} files...")
    organized = write_project_files(content_dir, files)

    # Load metadata
    metadata = {}
    if organized['metadata']:
        metadata = load_metadata(organized['metadata'])
        print(f"\nMetadata loaded: {metadata.get('title', 'No title')}")

    # Convert Markdown to LaTeX
    print("\nConverting Markdown to LaTeX...")

    # Include sections for template-based projects
    all_md_files = organized['chapters'] + organized['sections'] + organized['structure'] + organized['appendices']

    # Pass bibliography files to pandoc for citation processing
    bib_files = [str(f) for f in organized['bibliography']]

    for md_file in all_md_files:
        convert_md_to_tex(md_file, build_dir, content_dir, bib_files)

    # Generate main document based on template or theme
    if template_config:
        print("\nGenerating main.tex from template...")
        main_tex = generate_template_main_tex(build_dir, organized, metadata, template_config, template_latex)
        print(f"  Created: {main_tex}")
        # Compile with template-specific function
        pdf_path = compile_template_pdf(build_dir)
    else:
        # Generate main thesis.tex using default theme
        print("\nGenerating main thesis.tex...")
        main_tex = generate_main_tex(build_dir, organized, metadata, theme_dir)
        print(f"  Created: {main_tex}")
        # Compile PDF
        pdf_path = compile_pdf(build_dir)

    # Return result
    result = {
        'success': pdf_path is not None,
        'project_id': project_id,
        'build_dir': str(build_dir),
        'pdf_path': str(pdf_path) if pdf_path else None,
        'template_id': template_id
    }

    print("\n" + "=" * 60)
    if result['success']:
        print("BUILD SUCCESSFUL!")
    else:
        print("BUILD FAILED!")
    print("=" * 60)

    return result


def main():
    parser = argparse.ArgumentParser(description='Build PDF from project data')
    parser.add_argument('--input', '-i', help='JSON file with project data')
    args = parser.parse_args()

    # Read project data
    if args.input:
        with open(args.input, 'r', encoding='utf-8') as f:
            project_data = json.load(f)
    else:
        # Read from stdin
        project_data = json.load(sys.stdin)

    # Build project
    result = build_project(project_data)

    # Output result as JSON
    print("\n--- RESULT ---")
    print(json.dumps(result, indent=2))

    sys.exit(0 if result['success'] else 1)


if __name__ == "__main__":
    main()
