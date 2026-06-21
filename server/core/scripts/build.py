#!/usr/bin/env python3
"""
Thesis Build Script
Compiles LaTeX thesis to PDF with proper error handling
"""

import sys
import subprocess
from pathlib import Path

# Directories
ROOT_DIR = Path(__file__).parent.parent.parent
CONTENT_DIR = ROOT_DIR / "content"
BUILD_DIR = Path("/tmp/thesis-build")
CORE_DIR = ROOT_DIR / "core"

# Colors for terminal output
class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    BOLD = '\033[1m'
    END = '\033[0m'

def log(message, color=Colors.BLUE):
    """Print colored log message"""
    print(f"{color}{Colors.BOLD}[BUILD]{Colors.END} {message}")

def error(message):
    """Print error message"""
    log(message, Colors.RED)

def success(message):
    """Print success message"""
    log(message, Colors.GREEN)

def warning(message):
    """Print warning message"""
    log(message, Colors.YELLOW)

def run_command(cmd, cwd=None):
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
            error(f"Command failed: {' '.join(cmd)}")
            if result.stderr:
                print(result.stderr)
            return False

        return True
    except Exception as e:
        error(f"Error running command: {e}")
        return False

def ensure_build_dir():
    """Create build directory if it doesn't exist"""
    BUILD_DIR.mkdir(exist_ok=True)
    log(f"Build directory: {BUILD_DIR}")

def convert_markdown():
    """Convert Markdown chapters to LaTeX"""
    log("Converting Markdown to LaTeX...")

    # Check if there are .md files
    md_files = list((CONTENT_DIR / "text" / "chapters").glob("*.md"))

    if not md_files:
        warning("No Markdown files found, skipping conversion")
        return True

    log(f"Found {len(md_files)} Markdown chapters")

    # Run conversion script
    convert_script = CORE_DIR / "scripts" / "convert_md.py"
    if not convert_script.exists():
        error("Conversion script not found!")
        return False

    if run_command([sys.executable, str(convert_script)], cwd=ROOT_DIR):
        success("✓ Markdown converted to LaTeX")
        return True
    else:
        error("✗ Markdown conversion failed")
        return False

def build_latex():
    """Build LaTeX thesis using latexmk"""
    log("Compiling LaTeX to PDF...")

    # Check if thesis.tex exists (generated from MD or original)
    thesis_file = BUILD_DIR / "thesis.tex"

    if not thesis_file.exists():
        # Try original location
        thesis_file = CONTENT_DIR / "thesis.tex"
        if not thesis_file.exists():
            error(f"Thesis file not found in {BUILD_DIR} or {CONTENT_DIR}")
            return False

    # latexmk command
    cmd = [
        "latexmk",
        "-bibtex",
        "-pdf",
        "-interaction=nonstopmode",
        "-f",  # Force completion even with errors
        "-output-directory=" + str(BUILD_DIR),
        "-cd",
        str(thesis_file)
    ]

    log("Running: " + " ".join(cmd))

    run_command(cmd)  # Run regardless of return code (with -f flag)

    # Check if PDF was generated in build directory
    pdf_build = BUILD_DIR / "thesis.pdf"
    pdf_root = ROOT_DIR / "thesis-temp.pdf"

    if pdf_build.exists():
        # Copy PDF to root directory
        import shutil
        shutil.copy2(pdf_build, pdf_root)
        success("✓ PDF compiled successfully!")
        success(f"✓ Output: {pdf_root}")
        return True
    else:
        error("✗ Compilation failed. No PDF generated.")
        return False

def main():
    """Main build function"""
    log("=" * 60)
    log("Building Thesis")
    log("=" * 60)

    ensure_build_dir()

    # Step 1: Convert Markdown to LaTeX (if .md files exist)
    if not convert_markdown():
        error("Build failed at Markdown conversion.")
        return 1

    # Step 2: Compile LaTeX to PDF
    if build_latex():
        success("Build completed successfully! 🎉")
        return 0
    else:
        error("Build failed at PDF compilation.")
        return 1

if __name__ == "__main__":
    sys.exit(main())
