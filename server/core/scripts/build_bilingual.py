#!/usr/bin/env python3
"""
Bilingual Thesis Build Script
Builds Portuguese and French versions in parallel
"""

import sys
import os
import subprocess
import shutil
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
from translator import translate_thesis_content
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Directories
ROOT_DIR = Path(__file__).parent.parent.parent
CONTENT_DIR = ROOT_DIR / "content"
BUILD_DIR_PT = Path("/tmp/thesis-build-pt")
BUILD_DIR_FR = Path("/tmp/thesis-build-fr")
CORE_DIR = ROOT_DIR / "core"

# Colors for terminal output
class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    BOLD = '\033[1m'
    END = '\033[0m'

def log(message, color=Colors.BLUE, lang=""):
    """Print colored log message"""
    prefix = f"[{lang}] " if lang else ""
    print(f"{color}{Colors.BOLD}[BUILD]{Colors.END} {prefix}{message}")

def error(message, lang=""):
    log(message, Colors.RED, lang)

def success(message, lang=""):
    log(message, Colors.GREEN, lang)

def warning(message, lang=""):
    log(message, Colors.YELLOW, lang)


def translate_content(api_key: str):
    """Translate content to French"""
    log("🌍 Translating content to French...", Colors.BLUE)

    content_dir = CONTENT_DIR / "text"
    output_dir = CONTENT_DIR / "text-fr"

    try:
        translate_thesis_content(api_key, content_dir, output_dir)
        success("✓ Translation complete!")
        return True
    except Exception as e:
        error(f"Translation failed: {e}")
        return False


def run_command(cmd, cwd=None, lang=""):
    """Run shell command and return success status"""
    try:
        result = subprocess.run(
            cmd,
            cwd=cwd,
            capture_output=True,
            text=True,
            check=False
        )

        if result.returncode != 0:
            # Don't treat as error with -f flag (latexmk forces completion)
            if "-f" not in cmd:
                error(f"Command failed: {' '.join(cmd)}", lang)
                return False

        return True
    except Exception as e:
        error(f"Error running command: {e}", lang)
        return False


def build_version(lang: str, build_dir: Path, output_pdf: str):
    """
    Build a single language version

    Args:
        lang: "PT" or "FR"
        build_dir: Build directory for this version
        output_pdf: Output PDF filename

    Returns:
        bool: Success status
    """
    log(f"Starting build...", Colors.BLUE, lang)

    # Create build directory
    build_dir.mkdir(exist_ok=True)

    # Determine content directory
    if lang == "PT":
        text_dir = CONTENT_DIR / "text"
        metadata_file = CONTENT_DIR / "metadata.yaml"
    else:  # FR
        text_dir = CONTENT_DIR / "text-fr"
        metadata_file = text_dir / "metadata.yaml"  # metadata.yaml inside text-fr/

    # Convert Markdown to LaTeX
    log("Converting Markdown to LaTeX...", Colors.BLUE, lang)

    convert_script = CORE_DIR / "scripts" / "convert_md.py"

    # Run conversion with custom paths
    env = os.environ.copy()
    env['TEXT_DIR'] = str(text_dir)
    env['BUILD_DIR'] = str(build_dir)
    env['METADATA_FILE'] = str(metadata_file)

    result = subprocess.run(
        [sys.executable, str(convert_script)],
        cwd=ROOT_DIR,
        env=env,
        capture_output=True,
        text=True
    )

    if result.returncode != 0:
        error("Markdown conversion failed", lang)
        print(result.stderr)
        return False

    success("✓ Markdown converted", lang)

    # Build LaTeX
    log("Compiling LaTeX to PDF...", Colors.BLUE, lang)

    thesis_file = build_dir / "thesis.tex"

    if not thesis_file.exists():
        error(f"Thesis file not found: {thesis_file}", lang)
        return False

    # latexmk command
    cmd = [
        "latexmk",
        "-bibtex",
        "-pdf",
        "-interaction=nonstopmode",
        "-f",  # Force completion even with errors
        "-output-directory=" + str(build_dir),
        "-cd",
        str(thesis_file)
    ]

    run_command(cmd, lang=lang)

    # Check if PDF was generated
    pdf_build = build_dir / "thesis.pdf"
    pdf_root = ROOT_DIR / output_pdf

    if pdf_build.exists():
        shutil.copy2(pdf_build, pdf_root)
        success(f"✓ PDF compiled: {output_pdf}", lang)
        return True
    else:
        error("✗ Compilation failed. No PDF generated.", lang)
        return False


def build_parallel(api_key: str = None):
    """Build both versions in parallel"""
    log("=" * 60)
    log("Building Bilingual Thesis (PT + FR)")
    log("=" * 60)

    # Step 1: Translate to French if API key provided
    if api_key:
        if not translate_content(api_key):
            warning("⚠️  Translation failed, skipping French build")
            # Continue with Portuguese only
            success_pt = build_version("PT", BUILD_DIR_PT, "thesis-temp.pdf")
            return 0 if success_pt else 1
    else:
        warning("⚠️  No GROQ_API_KEY provided, skipping translation")
        warning("⚠️  Using existing French content if available")

    # Step 2: Build both versions in parallel
    log("🚀 Building PT and FR versions in parallel...")

    with ThreadPoolExecutor(max_workers=2) as executor:
        # Submit both build tasks
        future_pt = executor.submit(build_version, "PT", BUILD_DIR_PT, "thesis-temp.pdf")
        future_fr = executor.submit(build_version, "FR", BUILD_DIR_FR, "thesis-temp-fr.pdf")

        # Wait for both to complete
        success_pt = future_pt.result()
        success_fr = future_fr.result()

    # Report results
    log("=" * 60)
    if success_pt and success_fr:
        success("✅ Both versions compiled successfully! 🎉")
        log("📄 Portuguese: thesis-temp.pdf")
        log("📄 French: thesis-temp-fr.pdf")
        return 0
    elif success_pt:
        warning("⚠️  Portuguese OK, French failed")
        return 1
    elif success_fr:
        warning("⚠️  French OK, Portuguese failed")
        return 1
    else:
        error("❌ Both builds failed")
        return 1


def main():
    """Main build function"""
    # Get API key from environment
    api_key = os.getenv("GROQ_API_KEY")

    if not api_key:
        warning("GROQ_API_KEY not set - translation will be skipped")
        warning("Set it with: export GROQ_API_KEY='your-key-here'")

    return build_parallel(api_key)


if __name__ == "__main__":
    sys.exit(main())
