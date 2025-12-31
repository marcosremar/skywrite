#!/bin/bash

echo "Installing all required LaTeX packages for thesis..."

# Update tlmgr first
sudo tlmgr update --self

# Install larger collections that contain many packages
echo "Installing LaTeX collections..."
sudo tlmgr install collection-latexextra
sudo tlmgr install collection-fontsextra
sudo tlmgr install collection-mathscience
sudo tlmgr install collection-bibtexextra

# Install specific packages we know we need
echo "Installing specific packages..."
sudo tlmgr install \
  biblatex biblatex-apa biber \
  csquotes mparhack relsize fixmath \
  hyperxmp enumitem tocloft titlesec \
  classicthesis pgfplots cleveref \
  isomath ltablex floatrow blindtext \
  acronym siunitx scrhack \
  bchart xkeyval logreq microtype \
  ifmtarg setspace booktabs hardwrap

# Update the TeX database
echo "Updating TeX database..."
sudo texhash

echo "All packages installed successfully!" 