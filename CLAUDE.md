# Citation Checker — CLAUDE.md

## Overview

South African legal citation verification tool. Upload a DOCX or PDF containing legal citations → the app extracts them, checks each against SAFLII (Southern African Legal Information Institute), and produces an audited report with confidence scores.

**Tech stack:** Python 3.9, Streamlit, deployed/developed via Replit + Claude Code.

---

## Folder Structure

```
citation checker/
├── app.py                          # Main application — ALL logic and UI (1,842 lines)
├── requirements.txt                # Python dependencies
├── .gitignore                      # Excludes __pycache__, .DS_Store, .claude/, temp files
├── .claude/
│   ├── launch.json                 # Streamlit dev server config (port 8501, headless)
│   └── settings.local.json         # Claude Code permissions
├── Test heads.docx                 # Test document
├── test heads v2.docx              # Test document v2
├── Replit_Search_Cascade_Fix.md    # Search strategy docs (SAFLII-only approach)
├── SAFLII_Hunter_Replit_Guide.md   # 5-tier confidence system documentation
├── SAFLII_Verifier_Code_Export.md  # Full code reference & integration guide
├── 07_certification_report_template.md.txt  # Report structure template
├── 09_citation_cross_reference.json.txt     # Citation format mapping reference
├── 05_revised_forensic_search_engine.py.txt # Forensic search logic docs
└── file08.txt                      # UI discrepancy resolution component docs
```

**Single-file app:** Everything lives in `app.py` — CSS, classes, UI screens, business logic.

---

## How It Works

### Three-Screen Navigation

1. **The Hopper** — Upload .docx/.pdf, extract citations, run audit
2. **The Auditor** — View results table, discrepancy panels, download PDFs, get Certificate of Accuracy
3. **The Librarian** — Court bundle generation (placeholder, not yet implemented)

### Core Classes

- **`CitationEngine`** (lines ~321–447) — Regex-based extraction of 8 SA citation formats. Line-by-line processing to prevent cross-line leaks. Footnote recovery searches up to 5 lines back for orphaned citations.
- **`SafliiBridge`** (lines ~580–1086) — 4-step forensic search pipeline against SAFLII.

### Citation Formats Supported

| Format | Example |
|--------|---------|
| Standard SA (Juta) | `Case Name 1995 (3) SA 391 (CC)` |
| BCLR (LexisNexis) | `Case Name 1995 (6) BCLR 665 (CC)` |
| SACR | `Case Name 1995 (2) SACR 1 (CC)` |
| All SA | `Case Name 2002 (4) All SA 145 (SCA)` |
| Old Provincial | `Case Name, 1944 CPD 100` |
| Neutral ZASCA | `Case Name [2023] ZASCA 15` |
| Neutral ZACC | `Case Name [2022] ZACC 45` |
| Neutral Regional | `Case Name [2023] ZAWCHC 12` |

### SAFLII Verification Pipeline (4 Steps)

1. **Direct URL** — For neutral citations, build URL deterministically → check if it exists and party names match
2. **Search by party names** — Query SAFLII search endpoint with `"Party A v Party B"`
3. **Fuzzy match reconciliation** — RapidFuzz `token_set_ratio()`, threshold ≥75%, +10 bonus for year match
4. **Not Found fallback** — Return NOT_FOUND with search link

**Important constraints:**
- SAFLII blocks cloud/server IPs (HTTP 410) — all URLs are for the user's browser
- 2-second throttle between requests
- 3 retries for server errors/timeouts
- Browser-like headers to avoid blocking

### 5-Tier Confidence System

| Tier | Color | Hex | Threshold |
|------|-------|-----|-----------|
| EXACT_MATCH | Green | #27AE60 | Found + confidence ≥80% |
| PARTIAL_MATCH | Amber | #F39C12 | Found/typo + confidence ≥50% |
| POTENTIAL_MATCH | Blue | #3498DB | Found but confidence <50% |
| CITED_IN_OTHER_CASES | Purple | #8E44AD | Not directly on SAFLII but cited elsewhere |
| NOT_FOUND | Red | #E74C3C | Zero results |

### Special Cases

- **Mismatch resolution:** Direct URL points to wrong case → search finds correct one → 3-column discrepancy panel
- **Typo detection:** Year discrepancy between document and SAFLII → 2-column comparison panel
- **Old provincial citations (pre-1994):** Predate SAFLII archive; softer NOT_FOUND classification

---

## Design Choices

### Color Palette

| Element | Hex | Usage |
|---------|-----|-------|
| Main background | #F4F4F4 | App background |
| Sidebar / headers | #2C3E50 | Dark navy |
| Sidebar text | #F4F4F4 | Light on dark |
| Borders | #7F8C8D | Tables, hover states |
| Terminal log bg | #1a1a2e | Dark terminal aesthetic |
| Terminal log text | #00ff88 | Green monospace |
| Success panels | #E8F8F0 | Light green |
| Error panels | #FDEDEC | Light red |
| Info panels | #2980B9 | Blue |

### Typography

- **Headings:** Georgia serif, normal weight, 0.5px letter-spacing
- **Citations / legal text:** Georgia serif, italic
- **Tables / code:** Courier New or Roboto Mono, 0.85rem
- **Terminal output:** Courier New, monospace
- **Buttons:** UPPERCASE, 1px letter-spacing, Georgia serif

### Layout

- Streamlit **wide layout**, sidebar expanded by default
- Audit table: #2C3E50 header row, #F4F4F4 text, hover effect (#EAECEE)
- Status badges: inline-block, 3px rounded corners, color-coded per tier
- Confidence badges: green (≥90%), yellow (≥75%), red (<75%) backgrounds

---

## Dependencies

```
streamlit          # Web framework
python-docx        # DOCX text extraction
requests           # HTTP to SAFLII
beautifulsoup4     # HTML parsing
lxml               # XML/HTML parser backend
rapidfuzz          # Fuzzy string matching
pdfplumber         # PDF text extraction
```

---

## Development

- **Run locally:** `streamlit run app.py --server.headless true` on port 8501
- **Python version:** 3.9
- **All logic in one file** (`app.py`) — no separate modules, no database, no API keys needed

---

## Key Decisions & Anti-Hallucination Safeguards

1. EXACT_MATCH requires a confirmed SAFLII URL — never from AI inference alone
2. No server-side URL verification (cloud IPs blocked) — links are for the user's browser
3. Pre-1994 citations skip AI lookup (predate neutral citation system)
4. When in doubt → NOT_FOUND (false negative safer than false positive)
5. Year discrepancies flagged visibly but not confidence-blocking
6. Search trail logged and displayed as breadcrumb (e.g. "SAFLII (direct): Found → SAFLII (search): Found")

---

## Court Code Mappings

40+ court codes supported. Old provincial division codes (CPD, TPD, WLD, NPD, OPD, AD) map to modern SAFLII equivalents (ZAWCHC, ZAGPPHC, ZAGPJHC, ZAKZPHC, ZAFSHC, ZASCA).
