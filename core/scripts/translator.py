#!/usr/bin/env python3
"""
Translation module for thesis using Groq API
Translates Markdown content from Portuguese to French
"""

import os
import re
from pathlib import Path
from groq import Groq
import yaml
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()


class ThesisTranslator:
    """Translates thesis content from Portuguese to French using Groq API"""

    def __init__(self, api_key: str):
        self.client = Groq(api_key=api_key)
        # Get model from environment variable or use default
        self.model = os.getenv("TRANSLATION_MODEL", "moonshotai/kimi-k2-instruct-0905")

    def translate_markdown(self, content: str) -> str:
        """
        Translate markdown content preserving formatting and citations

        Args:
            content: Markdown text in Portuguese

        Returns:
            Translated markdown text in French
        """
        # Skip if content is too short
        if len(content.strip()) < 10:
            return content

        # System prompt for translation
        system_prompt = """You are a professional academic translator specializing in translating Portuguese academic texts to French.

IMPORTANT RULES:
1. Translate ONLY the text content from Portuguese to French
2. PRESERVE ALL Markdown formatting: **bold**, *italic*, headers (#), lists (-, *), etc.
3. PRESERVE ALL citations exactly as they are: [@author2023], [@fig:label], etc.
4. PRESERVE ALL LaTeX commands: \\todo{}, \\newpage, etc.
5. PRESERVE ALL code blocks and their content
6. PRESERVE ALL URLs and links
7. Keep academic/scientific terminology accurate
8. Maintain the same paragraph structure

Return ONLY the translated text without explanations."""

        try:
            response = self.client.chat.completions.create(
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": f"Translate this academic text from Portuguese to French:\n\n{content}"}
                ],
                model=self.model,
                temperature=0.3,  # Low temperature for consistent translations
                max_tokens=8000
            )

            translated = response.choices[0].message.content.strip()
            return translated

        except Exception as e:
            print(f"⚠️  Translation error: {e}")
            return content  # Return original on error

    def translate_file(self, input_path: Path, output_path: Path):
        """
        Translate a Markdown file from Portuguese to French

        Args:
            input_path: Path to Portuguese .md file
            output_path: Path to save French .md file
        """
        print(f"  Translating: {input_path.name}")

        # Read original content
        with open(input_path, 'r', encoding='utf-8') as f:
            content = f.read()

        # Translate
        translated = self.translate_markdown(content)

        # Ensure output directory exists
        output_path.parent.mkdir(parents=True, exist_ok=True)

        # Write translated content
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(translated)

    def translate_metadata(self, metadata_path: Path, output_path: Path):
        """
        Translate metadata.yaml from Portuguese to French
        Only translates text fields, preserves structure and bibliography

        Args:
            metadata_path: Path to Portuguese metadata.yaml
            output_path: Path to save French metadata.yaml
        """
        print(f"  Translating metadata: {metadata_path.name}")

        with open(metadata_path, 'r', encoding='utf-8') as f:
            metadata = yaml.safe_load(f)

        # Fields to translate
        translate_fields = [
            'title', 'subtitle', 'titleA', 'titleB',
            'university', 'department', 'group',
            'degree', 'author', 'supervisor',
            'examiner', 'birthplace', 'abstract'
        ]

        # Translate text fields
        for field in translate_fields:
            if field in metadata and isinstance(metadata[field], str):
                original = metadata[field]
                # Simple translation for metadata (shorter texts)
                metadata[field] = self._translate_short_text(original)

        # Translate theme strings
        if 'strings' in metadata and isinstance(metadata['strings'], dict):
            french_strings = {
                'contents': 'Sommaire',
                'listfigures': 'Liste des figures',
                'listtables': 'Liste des tableaux',
                'listlistings': 'Liste des codes',
                'abstract': 'Résumé',
                'acknowledgments': 'Remerciements',
                'bibliography': 'Bibliographie',
                'chapter': 'Chapitre',
                'appendix': 'Annexe'
            }
            metadata['strings'] = french_strings

        # Change language to French
        metadata['lang'] = 'fr-FR'
        metadata['language'] = 'french'

        # Write translated metadata
        with open(output_path, 'w', encoding='utf-8') as f:
            yaml.dump(metadata, f, allow_unicode=True, sort_keys=False)

    def _translate_short_text(self, text: str) -> str:
        """Translate short text snippets (titles, names, etc.)"""
        try:
            response = self.client.chat.completions.create(
                messages=[
                    {"role": "system", "content": "Translate from Portuguese to French. Return ONLY the translation, nothing else."},
                    {"role": "user", "content": text}
                ],
                model=self.model,
                temperature=0.3,
                max_tokens=500
            )
            return response.choices[0].message.content.strip()
        except Exception as e:
            print(f"⚠️  Short translation error: {e}")
            return text


def translate_thesis_content(api_key: str, content_dir: Path, output_dir: Path):
    """
    Translate all thesis Markdown content to French

    Args:
        api_key: Groq API key
        content_dir: Path to content/text directory (Portuguese)
        output_dir: Path to output directory for French content
    """
    translator = ThesisTranslator(api_key)

    print("📚 Translating thesis content to French...")

    # Translate chapters
    chapters_in = content_dir / "chapters"
    chapters_out = output_dir / "chapters"

    if chapters_in.exists():
        # Create output directory
        chapters_out.mkdir(parents=True, exist_ok=True)

        for item in sorted(chapters_in.iterdir()):
            # Handle both .md files directly and subdirectories with main.md
            if item.is_file() and item.suffix == '.md':
                # Direct .md file (e.g., 01-introduction.md)
                output_file = chapters_out / item.name
                translator.translate_file(item, output_file)

            elif item.is_dir():
                # Subdirectory with main.md (legacy structure)
                md_file = item / "main.md"
                if md_file.exists():
                    output_file = chapters_out / item.name / "main.md"
                    translator.translate_file(md_file, output_file)

                    # Copy media directory if exists
                    media_in = item / "media"
                    if media_in.exists():
                        media_out = chapters_out / item.name / "media"
                        media_out.mkdir(parents=True, exist_ok=True)
                        os.system(f'cp -r "{media_in}"/* "{media_out}"/')

    # Translate structure files
    structure_in = content_dir / "structure"
    structure_out = output_dir / "structure"

    if structure_in.exists():
        for md_file in sorted(structure_in.glob("*.md")):
            output_file = structure_out / md_file.name
            translator.translate_file(md_file, output_file)

    # Translate metadata (save inside text-fr/ directory)
    metadata_in = content_dir.parent / "metadata.yaml"
    metadata_out = output_dir / "metadata.yaml"  # Save as metadata.yaml inside text-fr/

    if metadata_in.exists():
        translator.translate_metadata(metadata_in, metadata_out)

    print("✅ Translation complete!")


if __name__ == "__main__":
    import sys

    # Get API key from environment or argument
    api_key = os.getenv("GROQ_API_KEY")
    if len(sys.argv) > 1:
        api_key = sys.argv[1]

    if not api_key:
        print("❌ Error: GROQ_API_KEY not found")
        print("Usage: python translator.py [API_KEY]")
        sys.exit(1)

    # Paths
    project_root = Path(__file__).parent.parent.parent
    content_dir = project_root / "content" / "text"
    output_dir = project_root / "content" / "text-fr"

    # Run translation
    translate_thesis_content(api_key, content_dir, output_dir)
