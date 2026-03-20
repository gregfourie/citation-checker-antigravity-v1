# Citation Checker — Build Instructions for Google IDX

## What This App Does

South African legal citation verification tool. A user uploads a DOCX or PDF containing legal citations. The app:
1. **Extracts** all citations using regex pattern matching
2. **Verifies** each citation against SAFLII (Southern African Legal Information Institute — saflii.org)
3. **Produces** an audited report with confidence scores and a Certificate of Accuracy

---

## Tech Stack (Your Choice)

The previous version used Python/Streamlit. You're free to rebuild in any framework. The core logic below is framework-agnostic. Recommended options for Google IDX:
- **Python + Flask/FastAPI** (backend) + **HTML/JS** (frontend)
- **Next.js** (full-stack JavaScript)
- **Python + Streamlit** (simplest, but limited deployment options)

---

## CRITICAL: SAFLII IP Blocking

SAFLII blocks requests from cloud server IPs (Streamlit Cloud, shared hosting, etc.). You have two options:

### Option A: Google Apps Script Proxy (already set up)
Route all SAFLII requests through this proxy:
```
https://script.google.com/macros/s/AKfycbzTelo_9-wPw2gp3Fzc1cuLcwG0KihoQ2Yxo1n4z388DQX3i-N00CpVFcj9CtAyB9Ag/exec?url=ENCODED_SAFLII_URL
```

Usage: `fetch(PROXY + '?url=' + encodeURIComponent(safliiUrl))`

### Option B: Client-Side Requests
Make SAFLII requests from the user's browser (not the server). The user's home/office IP won't be blocked. Requires a CORS proxy or service worker approach.

### Option C: Direct (if your server IP isn't blocked)
Try direct requests first. If you get HTTP 410 or connection refused, fall back to the proxy.

---

## Three-Screen Navigation

| Screen | Name | Purpose |
|--------|------|---------|
| 1 | **Add Citations** | Upload .docx/.pdf or paste text, extract citations, run audit |
| 2 | **The Auditor** | View results table, discrepancy panels, download PDFs, Certificate of Accuracy |
| 3 | **The Librarian** | Court bundle generation (placeholder — not yet implemented) |

---

## Part 1: Citation Extraction Engine

### 9 Regex Patterns

The engine processes text **line by line** to prevent cross-line matches. Character classes:

```
NAME_CHARS = r"[A-Za-z\s&()\-']"           # Basic name characters
NAME_CHARS_PLUS = r"[A-Za-z\s&()\-'.,]"    # Includes period and comma (for "v." and "(Pty)")
```

#### Pattern 1: Standard SA Reports (Juta)
```
Example: S v Makwanyane 1995 (3) SA 391 (CC)
Regex:   ([A-Z]NAME_CHARS_PLUS+?v\.?\sNAME_CHARS_PLUS+?)\s(\d{4})\s\((\d+)\)\sSA\s(\d+)\s\(([A-Z]+)\)
Groups:  (case_name, year, volume, page, court_code)
```

#### Pattern 2: BCLR (LexisNexis)
```
Example: Case Name 1995 (6) BCLR 665 (CC)
Regex:   ([A-Z]NAME_CHARS_PLUS+?v\.?\sNAME_CHARS_PLUS+?)\s(\d{4})\s\((\d+)\)\sBCLR\s(\d+)\s\(([A-Z]+)\)
Groups:  (case_name, year, volume, page, court_code)
```

#### Pattern 3: SACR
```
Example: Case Name 1995 (2) SACR 1 (CC)
Regex:   ([A-Z]NAME_CHARS_PLUS+?v\.?\sNAME_CHARS_PLUS+?)\s(\d{4})\s\((\d+)\)\sSACR\s(\d+)\s\(([A-Z]+)\)
Groups:  (case_name, year, volume, page, court_code)
```

#### Pattern 4: All SA (LexisNexis)
```
Example: Case Name 2002 (4) All SA 145 (SCA)
Regex:   ([A-Z]NAME_CHARS_PLUS+?v\.?\sNAME_CHARS_PLUS+?)\s(\d{4})\s\((\d+)\)\sAll\sSA\s(\d+)\s\(([A-Z]+)\)
Groups:  (case_name, year, volume, page, court_code)
```

#### Pattern 5: Old Provincial (pre-1994)
```
Example: Blotnick v. Turecki, 1944 CPD 100
Regex:   ([A-Z]NAME_CHARS_PLUS+?v\.?\sNAME_CHARS_PLUS+?),?\s(\d{4})\s(CPD|TPD|WLD|NPD|OPD|EPD|AD|SCA|DCLD|SECLD|NCHC|BCHC|ECD|NCD)\s(\d+)
Groups:  (case_name, year, division_code, page)
```

#### Pattern 6: Neutral ZASCA
```
Example: Case Name [2023] ZASCA 15
Regex:   ([A-Z]NAME_CHARS_PLUS+?v\.?\sNAME_CHARS_PLUS+?)\s\[(\d{4})\]\sZASCA\s(\d+)
Groups:  (case_name, year, number)
```

#### Pattern 7: Neutral ZACC (Constitutional Court)
```
Example: Case Name [2022] ZACC 45
Regex:   ([A-Z]NAME_CHARS_PLUS+?v\.?\sNAME_CHARS_PLUS+?)\s\[(\d{4})\]\sZACC\s(\d+)
Groups:  (case_name, year, number)
```

#### Pattern 8: Neutral Regional
```
Example: Case Name [2023] ZAWCHC 12
Regex:   ([A-Z]NAME_CHARS_PLUS+?v\.?\sNAME_CHARS_PLUS+?)\s\[(\d{4})\]\s(ZA[A-Z]{2,8})\s(\d+)
Groups:  (case_name, year, court_code, number)
```

#### Pattern 9: Loose/Malformed SA Citation
```
Example: Smithso v jonboy Gauteng Law Reports 1997 3 SA 214
Regex:   ([A-Z]NAME_CHARS_PLUS+?v\.?\sNAME_CHARS_PLUS+?)\s(\d{4})\s+(\d*)\s*(?:SA|BCLR|SACR)\s(\d+)
Groups:  (case_name, year, volume_or_empty, page)
```

### Processing Order
Run patterns in this order (more specific first, loose last):
1. standard_sa
2. bclr
3. sacr
4. all_sa
5. old_provincial
6. neutral_zasca
7. neutral_zacc
8. neutral_regional
9. loose_sa

### Deduplication
Key: `lowercase(case_name) + "|" + year`
- Skip neutral_regional if already found by zasca/zacc
- Skip bclr/sacr/all_sa duplicates

### Footnote Recovery
After inline extraction, scan for orphan citations (citation text without party names):

```
Footnote patterns (no party name prefix):
  standard_sa: (\d{4})\s\((\d+)\)\sSA\s(\d+)\s\(([A-Z]+)\)
  bclr:        (\d{4})\s\((\d+)\)\sBCLR\s(\d+)\s\(([A-Z]+)\)
  sacr:        (\d{4})\s\((\d+)\)\sSACR\s(\d+)\s\(([A-Z]+)\)
  all_sa:      (\d{4})\s\((\d+)\)\sAll\sSA\s(\d+)\s\(([A-Z]+)\)
```

For each orphan citation found:
1. Check the text before it on the same line — skip if it contains `v` (already an inline citation)
2. Check if this citation was already found (by year + page number)
3. Search up to 5 preceding lines for a party name pattern: `[A-Z]...v...` possibly ending with a footnote number
4. If found, combine party names + citation data and add to results

---

## Part 2: SAFLII Verification Pipeline (4 Steps)

### Constants
```
BASE_URL = "https://www.saflii.org"
SEARCH_URL = "https://www.saflii.org/cgi-bin/sinosrch-adw.cgi"
CRAWL_DELAY = 2  # seconds between requests
```

### Browser Headers (required to avoid blocking)
```
User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8
Accept-Language: en-US,en;q=0.9
Accept-Encoding: gzip, deflate, br
Connection: keep-alive
```

### Party Name Extraction
```
Regex: ([A-Z][A-Za-z\s&()]*?)\s+v\.?\s+([A-Z][A-Za-z\s&()]*?)(?=\s*[\[\(]|\s*\d{4}|\s*SA\b|\s*BCLR\b|\s*SACR\b|\s*All\s|\s*ZA[A-Z]|\s*CCT|\s*,?\s*\d{4}|\s*$)
Returns: (party_a, party_b) or (null, null)
```

**Important:** The `v\.?` handles both `v` and `v.` (old-fashioned form).

### Step 1: Direct URL (Neutral Citations Only)

For types `neutral_zasca`, `neutral_zacc`, `neutral_regional`:

Build URL deterministically:
```
https://www.saflii.org/za/cases/{COURT_CODE}/{YEAR}/{NUMBER}.html
```

Example: `[2023] ZASCA 15` → `https://www.saflii.org/za/cases/ZASCA/2023/15.html`

After fetching:
- If page exists AND party names match (fuzzy score ≥ 50): return as **found** with confidence = min(score + 10, 100)
- If page exists BUT party names don't match: **stash as mismatch**, continue to Step 2
- If page doesn't exist: continue to Step 2

### Step 2: Search SAFLII by Party Names

Build search query:
- If party names extracted: `"Party A v Party B"` (normalize `v.` → `v`)
- If old_provincial type: use full citation display string (normalize `v.` → `v`)
- If no party names: use full display string

Search URL: `{SEARCH_URL}?query={QUERY}&method=all&results=20&meta=/saflii`

**No court filter** — search across all South African courts for maximum recall.

Parse HTML response:
- Find all `<li>` elements containing `<a>` links
- Filter: href must contain `/za/cases/` or `/cases/`
- Extract: title (link text), URL, snippet

### Step 3: Fuzzy Match Reconciliation

Compare search results against the document citation using fuzzy string matching.

**Algorithm (with party names):**
```
for each search result:
    score = token_set_ratio(lowercase("Party A v Party B"), lowercase(result.title))

    // Extract year from result citation [YYYY] or URL /YYYY/
    if result_year == document_year:
        score += 10  // year match bonus
    else:
        flag year_discrepancy

    track best_score and best_match

if best_score >= 75:
    return best_match
else:
    return null  // no match meets threshold
```

**Algorithm (without party names):**
```
for each search result:
    if result has citation with year:
        if year matches: return with confidence 70
        else: return with confidence 60 + year_discrepancy flag

if nothing matched: return first result with confidence 50
```

**Token Set Ratio** (fuzzy matching):
Tokenize both strings, compute intersection/remainder sets, compare:
```
token_set_ratio("S v Makwanyane", "S v Makwanyane and Another") = high score
```
Use a library like `rapidfuzz` (Python) or `fuzzball` (JavaScript).

### Step 4: Results Classification

After search + fuzzy match:

**If search returned results but fuzzy match rejected all:**
- Classify as `cited_in_other_cases`
- Count how many search results were returned (`citing_cases_count`)
- Save the first result as `top_citing_title` and `top_citing_url`
- Provide a "View Citing Cases" link

**If search returned no results:**
- Classify as `not_found`
- Provide a "Search SAFLII" link for manual verification

**Mismatch handling** (Step 1 found wrong case, Step 2 found right one):
- If search finds a DIFFERENT case than the direct URL: `mismatch_resolved`
- If search finds the SAME wrong case: fall through to `typo_detected`

### URL Normalization
SAFLII uses wrapper URLs like `cgi-bin/disp.pl?file=za/cases/...`. Normalize:
```
1. If URL contains ?file=za/cases/...: extract path, prepend BASE_URL
2. Replace http:// with https://
3. Replace ://saflii.org with ://www.saflii.org
4. If relative URL: prepend BASE_URL
```

### Extract Citation from URL
```
Regex on URL: /za/cases/([A-Z]+)/(\d{4})/(\d+)
Returns: "[{year}] {court} {number}" e.g. "[2023] ZASCA 15"
```

---

## Part 3: 5-Tier Confidence System

### Classification Logic
```
if status == "found" AND found_via == "SAFLII" AND confidence >= 80:
    → EXACT_MATCH

if status in ("found", "typo_detected") AND found_via == "SAFLII" AND confidence >= 50:
    → PARTIAL_MATCH

if status == "mismatch_resolved":
    → PARTIAL_MATCH

if status in ("found", "typo_detected") AND found_via == "SAFLII":
    → POTENTIAL_MATCH

if status == "cited_in_other_cases":
    → CITED_IN_OTHER_CASES

else:
    → NOT_FOUND
```

### Tier Display

| Tier | Label | Color | Description |
|------|-------|-------|-------------|
| EXACT_MATCH | Verified | #5B8C6F (sage green) | Case found on SAFLII with high confidence |
| PARTIAL_MATCH | Likely Match | #C49132 (amber) | Strong overlap — verify manually |
| POTENTIAL_MATCH | Possible Match | #5B8FB9 (sky blue) | Some indicators align — needs verification |
| CITED_IN_OTHER_CASES | Cited Elsewhere | #8B6DAF (plum) | Not on SAFLII directly but cited in other judgments |
| NOT_FOUND | Not Found | #C45B4A (rust red) | Not found — potential hallucination |

### Confidence Badge Colors
- ≥ 90%: green background
- ≥ 75%: yellow background
- < 75%: red background

---

## Part 4: Court Code Mappings

### Aliases → Canonical SAFLII Codes
```
CC → ZACC                    CPD → ZAWCHC
SCA → ZASCA                  TPD → ZAGPPHC
ConCourt → ZACC              NPD → ZAKZDHC
WCC → ZAWCHC                 WLD → ZAGPJHC
GJ → ZAGPJHC                 GSJ → ZAGPJHC
GP → ZAGPPHC                 OPD → ZAFSHC (Free State)
KZD → ZAKZDHC                AD → ZASCA (Appellate Division)
KZP → ZAKZPHC
EC → ZAECHC                  A → ZASCA
FS → ZAFSHC                  W → ZAWCHC
NC → ZANCHC                  N → ZAKZDHC
NW → ZANWHC                  C → ZAWCHC
LP → ZALMPHC                 T → ZAGPPHC
MP → ZAMPMBHC                D → ZAKZDHC
LAC → ZALAC
LC → ZALC
LCC → ZALCC
```

### Valid SAFLII Court Codes
```
ZACC, ZASCA,
ZAECBHC, ZAECGHC, ZAECQBHC, ZAECMKHC, ZAECMHC, ZAECELLC,
ZAECPEHC, ZAECHC, ZAFSHC, ZAGPHC, ZAGPPHC, ZAGPJHC,
ZAKZHC, ZAKZDHC, ZAKZPHC, ZALMPHC, ZALMPPHC, ZALMPTHC,
ZAMPMBHC, ZAMPMHC, ZANCHC, ZANWHC, ZAWCHC,
ZAIC, ZALAC, ZALC, ZALCCT, ZALCJHB, ZALCPE, ZALCD, ZACCMA,
ZACAC, ZACCP, ZACOMMC, ZACONAF, ZAEC, ZAEQC,
ZALCC, ZARMC, ZATC, ZACT, COMPTRI, ZACGSO,
ZANCT, ZAST, ZAWT
```

### Resolution Logic
```
1. If code is in VALID_COURT_CODES → return as-is
2. If code is in ALIASES → return mapped value
3. Try prepending "ZA" → if in VALID_COURT_CODES, return that
4. Otherwise return as-is (best effort)
```

---

## Part 5: Citation Display Formatting

```
standard_sa:      "{name} {year} ({vol}) SA {page} ({court})"
bclr:             "{name} {year} ({vol}) BCLR {page} ({court})"
sacr:             "{name} {year} ({vol}) SACR {page} ({court})"
all_sa:           "{name} {year} ({vol}) All SA {page} ({court})"
old_provincial:   "{name} {year} {division} {page}"
neutral_zasca:    "{name} [{year}] ZASCA {number}"
neutral_zacc:     "{name} [{year}] ZACC {number}"
neutral_regional: "{name} [{year}] {court} {number}"
loose_sa:         "{name} {year} ({vol}) SA {page}" (vol may be empty)
```

---

## Part 6: Document Text Extraction

### DOCX
1. Extract all paragraph text
2. Extract footnotes separately (via the footnotes XML part)
3. Combine paragraphs + footnotes with newline separators

### PDF
Use a PDF text extraction library (pdfplumber for Python, pdf-parse for Node.js).
Extract text page by page, join with newlines.

---

## Part 7: Certificate of Accuracy

Generate a markdown report containing:
1. **Executive Summary** — overall accuracy score: `(exact + partial) / total * 100`
2. **Confidence Breakdown** — count per tier
3. **Citation Verification Log** — table of all citations with source, status, confidence, ref ID
4. **Discrepancies Detected** — list of year discrepancies (document year vs SAFLII year)
5. **Declaration** — certification statement

---

## Part 8: UI Design Language

### Color Palette (Anthropic / Claude inspired)
```css
--cream:       #FAF6F1   /* warm background */
--sand:        #F0EBE4   /* card backgrounds */
--clay:        #E8E0D8   /* borders, dividers */
--stone:       #B8AFA6   /* muted text */
--ink:         #3D3929   /* primary text */
--espresso:    #2A2520   /* headings, dark backgrounds */
--terracotta:  #D4714E   /* primary accent (buttons, links) */
--sage:        #5B8C6F   /* success / verified */
--amber:       #C49132   /* warning / partial match */
--sky:         #5B8FB9   /* info / potential match */
--plum:        #8B6DAF   /* cited elsewhere */
--rust:        #C45B4A   /* error / not found */
```

### Typography
- Headings: Source Serif 4 (serif), weight 600
- Body: Inter (sans-serif)
- Code/citations: JetBrains Mono (monospace)

### Key UI Components
- **Extraction log**: dark terminal-style panel (espresso bg, monospace font)
- **Audit table**: dark header row (espresso), hover effects, status badges color-coded by tier
- **Stats cards**: row of tier-count cards with left border color-coded
- **Discrepancy panels**: expandable, 2-column (typo) or 3-column (mismatch) layout
- **Progress bar**: terracotta colored

---

## Part 9: Anti-Hallucination Safeguards

These are **non-negotiable design rules**:

1. EXACT_MATCH requires a **confirmed SAFLII URL** — never from AI inference alone
2. No server-side URL verification when cloud IPs are blocked — links are for the user's browser
3. Pre-1994 citations (old provincial) are NOT automatically classified as "Cited Elsewhere" — only if search actually finds citing cases
4. When in doubt → NOT_FOUND (false negative is safer than false positive)
5. Year discrepancies are flagged visibly but don't block confidence scoring
6. Search trail logged and displayed as breadcrumb (e.g. "SAFLII (direct): Found → SAFLII (search): Found")

---

## Part 10: Throttling & Error Handling

- **2-second delay** between SAFLII requests
- **3 retries** for server errors (5xx) and timeouts, with progressive backoff (5s, 10s, 15s)
- **HTTP 410** (Gone): retry with backoff (SAFLII sometimes returns this temporarily)
- **HTTP 404**: don't retry, return not_found
- **Connection errors**: retry with backoff
- **Encoding**: SAFLII pages use `windows-1252` encoding — convert to UTF-8

---

## Dependencies (Python)

```
requests           # HTTP client
beautifulsoup4     # HTML parsing
lxml               # XML/HTML parser backend
rapidfuzz          # Fuzzy string matching (token_set_ratio)
python-docx        # DOCX text extraction
pdfplumber         # PDF text extraction
```

For JavaScript equivalent:
```
node-fetch or axios    # HTTP client
cheerio               # HTML parsing
fuzzball              # Fuzzy matching
mammoth or docx       # DOCX parsing
pdf-parse             # PDF text extraction
```
