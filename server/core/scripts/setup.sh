#!/bin/bash
#
# Thesis Setup Script
# Installs all dependencies needed for building the thesis
#

set -e  # Exit on error

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() {
    echo -e "${BLUE}[SETUP]${NC} $1"
}

success() {
    echo -e "${GREEN}[SETUP]${NC} $1"
}

error() {
    echo -e "${RED}[SETUP]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[SETUP]${NC} $1"
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

echo ""
echo "============================================"
echo "  Thesis Build System - Setup"
echo "============================================"
echo ""

# Check Python
log "Checking Python..."
if command_exists python3; then
    PYTHON_VERSION=$(python3 --version | cut -d' ' -f2)
    success "✓ Python found: $PYTHON_VERSION"
else
    error "✗ Python 3 not found. Please install Python 3.8+"
    exit 1
fi

# Check LaTeX
log "Checking LaTeX installation..."
if command_exists pdflatex; then
    success "✓ LaTeX found"
else
    error "✗ LaTeX not found"
    warning "Please install LaTeX:"
    echo "  macOS:   brew install --cask mactex"
    echo "  Ubuntu:  sudo apt-get install texlive-full"
    exit 1
fi

# Check latexmk
log "Checking latexmk..."
if command_exists latexmk; then
    success "✓ latexmk found"
else
    error "✗ latexmk not found"
    warning "Please install latexmk (usually comes with LaTeX)"
    exit 1
fi

# Check biber
log "Checking biber..."
if command_exists biber; then
    success "✓ biber found"
else
    warning "⚠ biber not found (needed for bibliography)"
    warning "Install with: tlmgr install biber"
fi

# Install Python dependencies
log "Installing Python dependencies..."
if pip3 install --user watchdog colorama >/dev/null 2>&1; then
    success "✓ Python dependencies installed"
else
    warning "⚠ Could not install Python dependencies"
    echo "  Try manually: pip3 install watchdog colorama"
fi

# Optional: Check Pandoc (for Markdown support)
log "Checking Pandoc (optional)..."
if command_exists pandoc; then
    PANDOC_VERSION=$(pandoc --version | head -n1 | cut -d' ' -f2)
    success "✓ Pandoc found: $PANDOC_VERSION"
else
    warning "⚠ Pandoc not found (needed for Markdown conversion)"
    echo "  Install: brew install pandoc  (macOS)"
    echo "           sudo apt-get install pandoc  (Ubuntu)"
fi

echo ""
success "============================================"
success "  Setup Complete! 🎉"
success "============================================"
echo ""
echo "Next steps:"
echo "  1. Run ${GREEN}./build.sh${NC} to build your thesis"
echo "  2. Run ${GREEN}./watch.sh${NC} for auto-rebuild on save"
echo ""
