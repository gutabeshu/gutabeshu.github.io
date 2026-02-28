#!/usr/bin/env python3
"""
Fetch publications from Semantic Scholar API and write data/publications.json.

Usage:
  python scripts/fetch_publications.py

Setup:
  1. Find your Semantic Scholar Author ID:
       - Go to https://www.semanticscholar.org/
       - Search your name and open your author profile
       - Copy the numeric ID from the URL, e.g. semanticscholar.org/author/123456789
  2. Paste the ID into data/author_config.json  ->  "semantic_scholar_id"
  3. Run this script once to test, then let GitHub Actions handle the rest.

API docs: https://api.semanticscholar.org/api-docs/
"""

import json
import os
import sys
import time
import requests
from datetime import datetime, timezone

# ── Paths ──────────────────────────────────────────────────────────────────────
ROOT    = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CONFIG  = os.path.join(ROOT, "data", "author_config.json")
OUTPUT  = os.path.join(ROOT, "data", "publications.json")

# ── Semantic Scholar ───────────────────────────────────────────────────────────
BASE_URL = "https://api.semanticscholar.org/graph/v1"
FIELDS   = ",".join([
    "paperId", "title", "year", "authors",
    "venue", "externalIds", "citationCount",
    "openAccessPdf", "isOpenAccess", "abstract",
])


def load_config() -> dict:
    with open(CONFIG, encoding="utf-8") as fh:
        return json.load(fh)


def fetch_papers(author_id: str) -> list[dict]:
    """Fetch ALL papers for an author, paging through the API."""
    papers, offset, limit = [], 0, 100

    while True:
        url    = f"{BASE_URL}/author/{author_id}/papers"
        params = {"fields": FIELDS, "limit": limit, "offset": offset}

        for attempt in range(3):
            try:
                resp = requests.get(url, params=params, timeout=30)
                if resp.status_code == 429:          # rate-limited
                    wait = int(resp.headers.get("Retry-After", "10"))
                    print(f"  Rate-limited — waiting {wait}s …")
                    time.sleep(wait)
                    continue
                resp.raise_for_status()
                break
            except requests.RequestException as exc:
                if attempt == 2:
                    print(f"  ERROR: {exc}")
                    return papers
                time.sleep(3)

        batch = resp.json().get("data", [])
        papers.extend(batch)
        print(f"  [{offset + len(batch)}/{offset + limit}] fetched so far …")

        if len(batch) < limit:        # last page
            break
        offset += limit
        time.sleep(0.5)              # be polite to the API

    return papers


def bold_author(name: str, variants: list[str]) -> str:
    """Return name wrapped in ** if it matches any variant (for rendering)."""
    for v in variants:
        if v.lower() in name.lower() or name.lower() in v.lower():
            return f"**{name}**"
    return name


def format_paper(paper: dict, name_variants: list[str]) -> dict:
    ext = paper.get("externalIds") or {}
    doi = ext.get("DOI")
    arxiv = ext.get("ArXiv")

    oa_pdf = paper.get("openAccessPdf") or {}
    pdf_url = oa_pdf.get("url")

    authors_raw = paper.get("authors") or []
    authors = [bold_author(a.get("name", ""), name_variants) for a in authors_raw]

    abstract = (paper.get("abstract") or "").strip()
    if len(abstract) > 600:
        abstract = abstract[:600].rsplit(" ", 1)[0] + " …"

    return {
        "paperId":       paper.get("paperId", ""),
        "title":         (paper.get("title") or "").strip(),
        "year":          paper.get("year"),
        "authors":       authors,
        "venue":         (paper.get("venue") or "").strip(),
        "doi":           doi,
        "doiUrl":        f"https://doi.org/{doi}" if doi else None,
        "arxivId":       arxiv,
        "arxivUrl":      f"https://arxiv.org/abs/{arxiv}" if arxiv else None,
        "pdfUrl":        pdf_url,
        "isOpenAccess":  paper.get("isOpenAccess", False),
        "citationCount": paper.get("citationCount", 0),
        "abstract":      abstract,
        "scholarUrl":    f"https://www.semanticscholar.org/paper/{paper.get('paperId', '')}",
    }


def main() -> int:
    # ── Load config ────────────────────────────────────────────────────────────
    print("Loading author config …")
    try:
        cfg = load_config()
    except FileNotFoundError:
        print(f"ERROR: config not found at {CONFIG}")
        return 1

    author_id    = cfg.get("semantic_scholar_id", "").strip()
    name_variants = cfg.get("name_variants", [cfg.get("name", "")])

    if not author_id or author_id == "YOUR_SEMANTIC_SCHOLAR_AUTHOR_ID":
        print("=" * 60)
        print("ACTION REQUIRED")
        print("=" * 60)
        print("Set your Semantic Scholar Author ID in data/author_config.json")
        print()
        print("  1. Go to https://www.semanticscholar.org/")
        print("  2. Search your name → open your profile")
        print("  3. Copy the numeric ID from the URL:")
        print("       semanticscholar.org/author/<YOUR_ID_HERE>")
        print("  4. Paste it into data/author_config.json")
        print("=" * 60)
        return 1

    # ── Fetch ──────────────────────────────────────────────────────────────────
    print(f"Fetching publications for Semantic Scholar ID: {author_id}")
    raw_papers = fetch_papers(author_id)
    print(f"  → {len(raw_papers)} papers returned by API")

    # ── Format + filter ────────────────────────────────────────────────────────
    papers = [
        format_paper(p, name_variants)
        for p in raw_papers
        if p.get("title") and p.get("year")
    ]

    # Sort: newest first, then by citation count
    papers.sort(key=lambda x: (x.get("year") or 0, x.get("citationCount") or 0), reverse=True)

    # ── Build years list (for filter UI) ──────────────────────────────────────
    years = sorted({p["year"] for p in papers if p["year"]}, reverse=True)

    # ── Write output ───────────────────────────────────────────────────────────
    output = {
        "author":      cfg.get("name", ""),
        "updatedAt":   datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "source":      "Semantic Scholar API",
        "total":       len(papers),
        "years":       years,
        "googleScholarUrl": cfg.get("google_scholar_url", ""),
        "publications": papers,
    }

    os.makedirs(os.path.dirname(OUTPUT), exist_ok=True)
    with open(OUTPUT, "w", encoding="utf-8") as fh:
        json.dump(output, fh, indent=2, ensure_ascii=False)

    # ── Summary ────────────────────────────────────────────────────────────────
    print()
    print("=" * 50)
    print(f"  Saved {len(papers)} publications → {OUTPUT}")
    if years:
        print(f"  Year range: {years[-1]} – {years[0]}")
        total_cites = sum(p.get("citationCount", 0) for p in papers)
        print(f"  Total citations: {total_cites}")
    print("=" * 50)
    return 0


if __name__ == "__main__":
    sys.exit(main())
