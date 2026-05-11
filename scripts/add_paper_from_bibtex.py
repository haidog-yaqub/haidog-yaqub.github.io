#!/usr/bin/env python3
"""
Convert BibTeX entries to Jekyll publication markdown files.

Usage:
  python add_paper_from_bibtex.py < bibtex.bib
  python add_paper_from_bibtex.py bibtex.bib
  python add_paper_from_bibtex.py -o 2025 bibtex.bib   # force year folder

Output: Creates a markdown file in _publications/YYYY/YYYY-slug.md
"""

import argparse
import re
import sys
from pathlib import Path
from typing import Optional


def parse_bibtex_simple(bibtex_str: str) -> list[dict]:
    """Parse BibTeX string into list of entries (fallback when bibtexparser not available)."""
    entries = []
    # Match @type{key, ...}
    pattern = re.compile(
        r"@(\w+)\s*\{\s*([^,]+)\s*,\s*(.*)",
        re.DOTALL | re.IGNORECASE
    )
    rest = bibtex_str
    while True:
        m = pattern.search(rest)
        if not m:
            break
        entry_type, cite_key, body = m.group(1), m.group(2).strip(), m.group(3)
        # Find matching brace for entry (body is inside the entry's {)
        depth = 1
        end = -1
        for i, c in enumerate(body):
            if c == "{":
                depth += 1
            elif c == "}":
                depth -= 1
                if depth == 0:
                    end = i
                    break
        content = body[:end] if end >= 0 else body
        rest = body[end + 1 :] if end >= 0 else ""

        # Parse fields (key = {value} or key = "value")
        entry = {"ENTRYTYPE": entry_type, "ID": cite_key}
        field_re = re.compile(r'(\w+)\s*=\s*["{]((?:[^{}]|\{[^{}]*\})*)["}]', re.IGNORECASE)
        for fm in field_re.finditer(content):
            key, val = fm.group(1).lower(), fm.group(2).strip()
            val = re.sub(r"\s+", " ", val).strip()
            entry[key] = val
        entries.append(entry)
    return entries


try:
    import bibtexparser
    HAVE_BIBTEXPARSER = True
except ImportError:
    HAVE_BIBTEXPARSER = False


def slugify(text: str) -> str:
    """Convert title to filename-safe slug."""
    slug = text.lower()
    slug = re.sub(r'[^\w\s-]', '', slug)
    slug = re.sub(r'[-\s]+', '-', slug)
    return slug[:50]  # limit length


def parse_bibtex_authors(bibtex_author: str) -> list[str]:
    """Convert BibTeX author string to publication format (list of 'Name*' or 'Name#')."""
    # BibTeX format: "Last, First" or "First Last" separated by " and "
    authors = []
    for part in bibtex_author.split(" and "):
        part = part.strip()
        if "," in part:
            last, first = part.split(",", 1)
            name = f"{first.strip()} {last.strip()}"
        else:
            name = part
        authors.append(name)
    return authors


def bibtex_to_markdown(entry: dict, year_override: Optional[str] = None) -> tuple[str, str, str]:
    """
    Convert a bibtexparser entry to publication markdown.
    Returns (markdown_content, year, slug).
    """
    entry_type = entry.get("ENTRYTYPE", "article").lower()
    title = entry.get("title", "").strip()
    if not title:
        raise ValueError("Entry missing title")

    # Authors
    bibtex_author = entry.get("author", entry.get("authors", ""))
    authors = parse_bibtex_authors(bibtex_author) if bibtex_author else []

    # Year
    year_val = entry.get("year") or entry.get("date") or ""
    year = year_override or (str(year_val)[:4] if year_val else "")
    if not year:
        year = "unknown"

    # Venue (journal for articles, booktitle for conference)
    pub = ""
    if entry_type == "article":
        pub = entry.get("journal", entry.get("journaltitle", ""))
    elif entry_type in ("inproceedings", "conference"):
        pub = entry.get("booktitle", entry.get("journal", ""))
    elif entry_type == "phdthesis":
        pub = f"PhD Thesis, {entry.get('school', '')}"
    elif entry_type == "mastersthesis":
        pub = f"Master's Thesis, {entry.get('school', '')}"
    else:
        pub = entry.get("booktitle", entry.get("journal", ""))

    abstract = entry.get("abstract", "").strip()
    url = entry.get("url", entry.get("link", ""))
    doi = entry.get("doi", "")
    arxiv = entry.get("eprint", "")

    # Build links
    links = {}
    if url:
        links["Paper"] = url
    elif doi:
        links["Paper"] = f"https://doi.org/{doi}"
    elif arxiv:
        links["Paper"] = f"https://arxiv.org/abs/{arxiv}"
    if doi and "Paper" not in links:
        links["DOI"] = f"https://doi.org/{doi}"

    # Generate BibTeX for copy button
    cite_key = entry.get("ID", slugify(title))
    bibtex_lines = [f"  title = {{{title}}},"]
    if bibtex_author:
        bibtex_lines.append(f"  author = {{{bibtex_author}}},")
    if pub:
        field = "journal" if entry_type == "article" else "booktitle"
        bibtex_lines.append(f"  {field} = {{{pub}}},")
    bibtex_lines.append(f"  year = {{{year}}},")
    if doi:
        bibtex_lines.append(f"  doi = {{{doi}}},")
    if url:
        bibtex_lines.append(f"  url = {{{url}}},")
    # Remove trailing comma from last line
    if bibtex_lines:
        bibtex_lines[-1] = bibtex_lines[-1].rstrip(",")
    raw_bibtex = f"@{entry_type}{{{cite_key},\n" + "\n".join(bibtex_lines) + "\n}"

    # Escape quotes in YAML strings
    def yaml_escape(s: str) -> str:
        return s.replace("\\", "\\\\").replace('"', '\\"').replace("\n", " ")

    # Build YAML front matter
    title_escaped = yaml_escape(title)
    pub_escaped = yaml_escape(pub)
    abstract_folded = abstract.replace("\n", " ").strip() if abstract else ""
    abstract_escaped = yaml_escape(abstract_folded) if abstract_folded else ""

    lines = [
        "---",
        f'title:          "{title_escaped}"',
        f"date:           {year}-01-01",
        "selected:       false",
        "type:           publication",
        "tags:           []",
        f'pub:            "{pub_escaped}"',
        "abstract: >-",
        f"  {abstract_escaped}" if abstract_escaped else "  ",
    ]

    # Authors YAML
    if authors:
        lines.append("authors:")
        for a in authors:
            lines.append(f"  - {a}")
    else:
        lines.append("authors: []")

    # Links
    if links:
        lines.append("links:")
        for label, link_url in links.items():
            lines.append(f"  {label}: {link_url}")

    # Add BibTeX for copy button (YAML literal block)
    lines.append("bibtex: |")
    for line in raw_bibtex.split("\n"):
        lines.append(f"  {line}")

    lines.append("---")
    lines.append("")

    slug = slugify(title)
    return "\n".join(lines), year, slug


def main():
    parser = argparse.ArgumentParser(description="Convert BibTeX to Jekyll publication markdown")
    parser.add_argument("input", nargs="?", help="BibTeX file (default: stdin)")
    parser.add_argument("-o", "--output-year", help="Override output year folder")
    parser.add_argument("--dry-run", action="store_true", help="Print output without writing files")
    args = parser.parse_args()

    # Read BibTeX
    if args.input:
        with open(args.input, encoding="utf-8") as f:
            bibtex_str = f.read()
    else:
        bibtex_str = sys.stdin.read()

    if HAVE_BIBTEXPARSER:
        db = bibtexparser.loads(bibtex_str)
        entries = db.entries
    else:
        entries = parse_bibtex_simple(bibtex_str)

    if not entries:
        print("No BibTeX entries found.", file=sys.stderr)
        sys.exit(1)

    script_dir = Path(__file__).resolve().parent
    pub_dir = script_dir.parent / "_publications"

    for entry in entries:
        try:
            markdown, year, slug = bibtex_to_markdown(entry, args.output_year)
        except Exception as e:
            print(f"Skipping entry: {e}", file=sys.stderr)
            continue

        year = args.output_year or year
        filename = f"{year}-{slug}.md"
        out_path = pub_dir / year / filename

        if args.dry_run:
            print(f"Would write: {out_path}")
            print(markdown)
            print("---")
            continue

        out_path.parent.mkdir(parents=True, exist_ok=True)
        with open(out_path, "w", encoding="utf-8") as f:
            f.write(markdown)
        print(f"Created: {out_path}")


if __name__ == "__main__":
    main()
