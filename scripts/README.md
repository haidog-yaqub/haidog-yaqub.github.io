# Scripts

## Adding a new paper from BibTeX

Use the BibTeX import script to convert BibTeX entries into publication markdown files.

### Setup

Optional (for better parsing of complex BibTeX):

```bash
pip install -r scripts/requirements.txt
```

The script also works without bibtexparser using a built-in parser for common BibTeX formats.

### Usage

**From a file:**
```bash
python scripts/add_paper_from_bibtex.py paper.bib
```

**From stdin:**
```bash
cat paper.bib | python scripts/add_paper_from_bibtex.py
```

**Force output year folder:**
```bash
python scripts/add_paper_from_bibtex.py -o 2025 paper.bib
```

**Preview without writing:**
```bash
python scripts/add_paper_from_bibtex.py --dry-run paper.bib
```

### Output

Creates markdown files in `_publications/YYYY/YYYY-slug.md` with:
- Title, authors, venue, abstract, links parsed from BibTeX
- Optional `bibtex` field for the [BibTeX] copy button on the site

### BibTeX format

Supports standard BibTeX entry types: `article`, `inproceedings`, `conference`, `phdthesis`, `mastersthesis`, etc.
