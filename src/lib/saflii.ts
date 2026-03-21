import * as cheerio from 'cheerio';
// @ts-ignore
import * as fuzz from 'fuzzball';
import { CitationMatch, formatCitationDisplay } from './extractor';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const PROXY_URL = 'https://script.google.com/macros/s/AKfycbzTelo_9-wPw2gp3Fzc1cuLcwG0KihoQ2Yxo1n4z388DQX3i-N00CpVFcj9CtAyB9Ag/exec?url=';
const BASE_URL = 'https://www.saflii.org';
const SEARCH_URL = 'https://www.saflii.org/cgi-bin/sinosrch-adw.cgi';

export const COURT_ALIASES: Record<string, string> = {
  "CC": "ZACC", "SCA": "ZASCA", "ConCourt": "ZACC", "WCC": "ZAWCHC",
  "GJ": "ZAGPJHC", "GSJ": "ZAGPJHC", "GP": "ZAGPPHC", "OPD": "ZAFSHC",
  "KZD": "ZAKZDHC", "KZP": "ZAKZPHC", "EC": "ZAECHC", "FS": "ZAFSHC",
  "NC": "ZANCHC", "NW": "ZANWHC", "LP": "ZALMPHC", "MP": "ZAMPMBHC",
  "LAC": "ZALAC", "LC": "ZALC", "LCC": "ZALCC", "A": "ZASCA", "W": "ZAWCHC",
  "N": "ZAKZDHC", "C": "ZAWCHC", "T": "ZAGPPHC", "D": "ZAKZDHC",
  "AD": "ZASCA", "CPD": "ZAWCHC", "TPD": "ZAGPPHC", "WLD": "ZAGPJHC", "NPD": "ZAKZDHC"
};

export const VALID_COURT_CODES = new Set([
  "ZACC", "ZASCA", "ZAECBHC", "ZAECGHC", "ZAECQBHC", "ZAECMKHC", "ZAECMHC", "ZAECELLC",
  "ZAECPEHC", "ZAECHC", "ZAFSHC", "ZAGPHC", "ZAGPPHC", "ZAGPJHC",
  "ZAKZHC", "ZAKZDHC", "ZAKZPHC", "ZALMPHC", "ZALMPPHC", "ZALMPTHC",
  "ZAMPMBHC", "ZAMPMHC", "ZANCHC", "ZANWHC", "ZAWCHC",
  "ZAIC", "ZALAC", "ZALC", "ZALCCT", "ZALCJHB", "ZALCPE", "ZALCD", "ZACCMA",
  "ZACAC", "ZACCP", "ZACOMMC", "ZACONAF", "ZAEC", "ZAEQC",
  "ZALCC", "ZARMC", "ZATC", "ZACT", "COMPTRI", "ZACGSO",
  "ZANCT", "ZAST", "ZAWT"
]);

export function resolveCourtCode(code: string): string {
  if (!code) return '';
  const upper = code.toUpperCase().trim();
  if (VALID_COURT_CODES.has(upper)) return upper;
  if (COURT_ALIASES[upper]) return COURT_ALIASES[upper];
  const withZa = `ZA${upper}`;
  if (VALID_COURT_CODES.has(withZa)) return withZa;
  return upper;
}

export function extractPartyNames(display: string): [string | null, string | null] {
  // Regex to match "Party A v Party B" avoiding greediness when multiple citations exist
  // We use lookahead to ensure we stop before typical citation year/court patterns
  const match = display.match(/([A-Z][A-Za-z\s&()\-'.,\u2019]*?)\s+v\.?\s+([A-Z][A-Za-z\s&()\-'.,\u2019]*?)(?=\s*[\[\(]|\s*\d{4}|\s*SA\b|\s*BCLR\b|\s*SACR\b|\s*ILJ\b|\s*All\s|\s*ZA[A-Z]|\s*CCT|\s*,?\s*\d{4}|\s*$)/);
  if (match) {
    let pA = match[1].trim();
    let pB = match[2].trim();

    pA = pA.replace(/^(\(?(?:CC|LAC|LC|SCA|HC|WLD|SA|BCLR)\)?|in|see)\s+/i, '');

    return [pA, pB];
  }
  return [null, null];
}

export function safliiUrlNormalize(url: string): string {
  if (url.includes('?file=')) {
    const file = new URL(url, BASE_URL).searchParams.get('file');
    if (file) return `${BASE_URL}/${file}`;
  }
  if (url.startsWith('/')) return `${BASE_URL}${url}`;
  return url.replace('http://', 'https://').replace('://saflii.org', '://www.saflii.org');
}

export function extractCitationFromUrl(url: string): string | null {
  const m = url.match(/\/za\/cases\/([A-Z]+)\/(\d{4})\/(\d+)/);
  if (m) return `[${m[2]}] ${m[1]} ${m[3]}`;
  return null;
}

export interface SafliiResult {
  status: 'found' | 'not_found' | 'typo_detected' | 'mismatch_resolved' | 'cited_in_other_cases';
  saflii_citation: string | null;
  match_confidence: number;
  year_discrepancy: any | null;
  found_via: 'SAFLII' | null;
  cited_case_title?: string;
  cited_case_url?: string;
  cited_case_citation?: string;
  suggested_citation?: string;
  top_citing_title?: string;
  top_citing_url?: string;
  citing_cases_count?: number;
  search_trail: Array<{ source: string; result: string }>;
  title?: string;
  url?: string;
}

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

async function fetchHtml(url: string, useProxy: boolean = false): Promise<{ status: number; html: string }> {
  if (!useProxy) {
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
        }
      });
      // Accept 200 and 404; if Vercel IPs get 403 or 410, it falls through to proxy
      if (res.status === 200 || res.status === 404) {
        const html = await res.text();
        return { status: res.status, html };
      }
    } catch (err) {
      // Direct fetch failed (e.g. connection refused), fall through to proxy
    }
  }

  const fetchUrl = `${PROXY_URL}${encodeURIComponent(url)}`;
  try {
    const res = await fetch(fetchUrl);
    const html = await res.text();
    // Guard against Google Apps Script throwing a 200 OK error page
    if (html.includes('Exception: Address unavailable')) {
      return { status: 502, html: '' };
    }
    return { status: res.status, html };
  } catch (err) {
    return { status: 500, html: '' };
  }
}

async function checkDirectUrl(url: string): Promise<SafliiResult | null> {
  const { status, html } = await fetchHtml(url);
  if (status === 200 && html && !html.includes('404 Not Found')) {
    const $ = cheerio.load(html);
    const title = $('title').text().trim() || $('h1').first().text().trim();
    return {
      status: 'found',
      saflii_citation: null,
      match_confidence: 0,
      year_discrepancy: null,
      found_via: 'SAFLII',
      search_trail: [],
      title,
      url
    };
  }
  return null;
}

export async function lookupCitation(citationMatch: CitationMatch): Promise<SafliiResult> {
  const ctype = citationMatch.type;
  const data = citationMatch.data;
  const display = formatCitationDisplay(citationMatch);
  
  const [partyA, partyB] = extractPartyNames(display);
  const docYear = data[1];
  
  const searchTrail: Array<{ source: string, result: string }> = [];
  let mismatchInfo: any = null;

  if (['neutral_zasca', 'neutral_zacc', 'neutral_regional'].includes(ctype)) {
    const court = ctype === 'neutral_regional' ? data[2] : (ctype === 'neutral_zasca' ? 'ZASCA' : 'ZACC');
    const safeCourt = resolveCourtCode(court);
    const num = ctype === 'neutral_regional' ? data[3] : data[2];
    const directUrl = `${BASE_URL}/za/cases/${safeCourt}/${docYear}/${num}.html`;
    
    await delay(2000);
    const hit = await checkDirectUrl(directUrl);
    
    if (hit) {
      const directCitation = extractCitationFromUrl(directUrl);
      if (partyA && partyB) {
        const title = hit.title || "";
        const nameScore = fuzz.token_set_ratio(`${partyA} v ${partyB}`.toLowerCase(), title.toLowerCase());
        
        if (nameScore >= 50) {
          searchTrail.push({ source: 'SAFLII (direct)', result: 'Found' });
          return {
            ...hit,
            search_trail: searchTrail,
            saflii_citation: directCitation,
            match_confidence: Math.min(nameScore + 10, 100),
          };
        } else {
          mismatchInfo = { title, url: directUrl, citation: directCitation };
          searchTrail.push({ source: 'SAFLII (direct)', result: `Found wrong case (${title.substring(0,40)}...)` });
        }
      } else {
        searchTrail.push({ source: 'SAFLII (direct)', result: 'Found' });
        return {
          ...hit,
          search_trail: searchTrail,
          saflii_citation: directCitation,
          match_confidence: 100
        };
      }
    } else {
      searchTrail.push({ source: 'SAFLII (direct)', result: 'Not found' });
    }
  }

  let query = '';
  if (partyA && partyB) {
    query = `${partyA} v ${partyB}`;
  } else {
    query = display;
  }
  
  if (ctype === 'old_provincial') {
    query = display;
  }
  
  query = query.replace(/\bv\.\s/g, 'v ');
  
  const safeQuery = query.replace(/&/g, 'and')
    .replace(/\b(and\s+another|and\s+others|et\s+al)\b/gi, '')
    .replace(/\([^)]+\)/g, '')
    .replace(/\[[^\]]+\]/g, '')
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  let searchUrl = `${SEARCH_URL}?query=${encodeURIComponent(safeQuery)}&method=all&results=20`;
  
  await delay(1000);
  let { status, html } = await fetchHtml(searchUrl);
  
  let $ = cheerio.load(html || '');
  let searchResults: any[] = [];
  
  const parseResults = () => {
    searchResults = [];
    $('li').each((_, el) => {
      const a = $(el).find('a').first();
      let href = a.attr('href') || '';
      if (href.includes('/za/cases/') || href.includes('/cases/')) {
        searchResults.push({
          title: a.text().trim(),
          url: safliiUrlNormalize(href)
        });
      }
    });
  };

  if (status === 200 && html) parseResults();

  if (searchResults.length === 0 && partyB) {
    searchUrl = `${SEARCH_URL}?query=${encodeURIComponent(partyB)}&method=all&results=20`;
    await delay(1000);
    const fb = await fetchHtml(searchUrl);
    if (fb.status === 200 && fb.html) {
      status = fb.status;
      html = fb.html;
      $ = cheerio.load(html);
      parseResults();
    }
  }

  if (searchResults.length > 0) {
    let bestScore = 0;
    let bestMatch: any = null;
    let bestYearDiscrepancy: any = null;

    let expectedCourt = '';
    if (['standard_sa', 'bclr', 'sacr', 'all_sa'].includes(ctype)) {
      expectedCourt = resolveCourtCode(data[4]);
    } else if (ctype === 'ilj') {
      expectedCourt = resolveCourtCode(data[5]);
    } else if (ctype === 'bllr') {
      expectedCourt = resolveCourtCode(data[4]);
    } else if (ctype === 'old_provincial') {
      expectedCourt = resolveCourtCode(data[2]);
    } else if (ctype === 'neutral_regional') {
      expectedCourt = resolveCourtCode(data[2]);
    } else if (ctype === 'neutral_zasca') {
      expectedCourt = 'ZASCA';
    } else if (ctype === 'neutral_zacc') {
      expectedCourt = 'ZACC';
    }

    if (partyA && partyB) {
      const docStr = `${partyA} v ${partyB}`.toLowerCase();
      const docStrNoV = `${partyA} ${partyB}`.toLowerCase(); // Compare purely names just in case SAFLII Title omits 'v' or 'and' etc.
      
      for (const res of searchResults) {
        let score = fuzz.token_set_ratio(docStr, res.title.toLowerCase());
        
        const citationInUrl = extractCitationFromUrl(res.url);
        let resYear = null;
        let resCourt : string | null = null;
        if (citationInUrl) {
          const ym = citationInUrl.match(/\[(\d{4})\]\s+([A-Z]+)\s+(\d+)/);
          if (ym) {
             resYear = ym[1];
             resCourt = ym[2];
          } else {
             const fallbackYm = citationInUrl.match(/\[(\d{4})\]/);
             if (fallbackYm) resYear = fallbackYm[1];
          }
        }
        let yearDiscrepancy = null;
        if (resYear) {
          if (resYear === docYear) score += 10;
          else yearDiscrepancy = { document: docYear, saflii: resYear };
        }
        
        if (expectedCourt) {
          if ((resCourt && expectedCourt === resCourt) || res.url.includes(`/${expectedCourt}/`)) {
            score += 20;
          }
        }

        if (score > bestScore) {
          bestScore = score;
          bestMatch = { ...res, citation: citationInUrl };
          bestYearDiscrepancy = yearDiscrepancy;
        }
      }
    } else {
      let maxScore = -1;
      for (const res of searchResults) {
        const citationInUrl = extractCitationFromUrl(res.url);
        let currentScore = 50;
        let resYear = null;
        let resCourt = null;
        
        if (citationInUrl) {
          const ym = citationInUrl.match(/\[(\d{4})\]\s+([A-Z]+)\s+(\d+)/);
          if (ym) {
             resYear = ym[1];
             resCourt = ym[2];
          } else {
             const fallbackYm = citationInUrl.match(/\[(\d{4})\]/);
             if (fallbackYm) resYear = fallbackYm[1];
          }
        }
        
        let yearDiscrepancy = null;
        if (resYear) {
           if (resYear === docYear) currentScore = 70;
           else {
             currentScore = 60;
             yearDiscrepancy = { document: docYear, saflii: resYear };
           }
        }

        if (expectedCourt) {
          if ((resCourt && expectedCourt === resCourt) || res.url.includes(`/${expectedCourt}/`)) {
            currentScore += 20;
          }
        }

        if (currentScore > maxScore) {
          maxScore = currentScore;
          bestScore = currentScore;
          bestMatch = { ...res, citation: citationInUrl };
          bestYearDiscrepancy = yearDiscrepancy;
        }
      }

      if (!bestMatch && searchResults.length > 0) {
         bestScore = 50;
         bestMatch = { ...searchResults[0], citation: extractCitationFromUrl(searchResults[0].url) };
      }
    }

    if (bestMatch && bestScore >= (partyA ? 75 : 50)) {
      searchTrail.push({ source: 'SAFLII (search)', result: 'Found match' });
      const sameAsMismatch = mismatchInfo && bestMatch.url.replace(/\/$/, '') === mismatchInfo.url.replace(/\/$/, '');
      
      if (!sameAsMismatch) {
        const resolvedResult = {
          saflii_citation: bestMatch.citation,
          match_confidence: bestScore,
          year_discrepancy: bestYearDiscrepancy,
          found_via: 'SAFLII' as const,
          search_trail: searchTrail,
          title: bestMatch.title,
          url: bestMatch.url
        };
        
        if (mismatchInfo) {
          return {
            ...resolvedResult,
            status: 'mismatch_resolved',
            cited_case_title: mismatchInfo.title,
            cited_case_url: mismatchInfo.url,
            cited_case_citation: mismatchInfo.citation,
            suggested_citation: bestMatch.citation
          };
        } else {
          return {
            ...resolvedResult,
            status: bestYearDiscrepancy ? 'typo_detected' : 'found'
          };
        }
      } else {
        searchTrail.push({ source: 'SAFLII (search)', result: 'Same wrong case found' });
      }
    } else {
      searchTrail.push({ source: 'SAFLII (search)', result: 'No matching case' });
      const citingCount = searchResults.length;
      searchTrail.push({ source: 'SAFLII (cited-by)', result: `Referenced in ${citingCount} other case(s)` });
      return {
        status: 'cited_in_other_cases',
        saflii_citation: null,
        match_confidence: 0,
        year_discrepancy: null,
        found_via: 'SAFLII',
        search_trail: searchTrail,
        citing_cases_count: citingCount,
        top_citing_title: searchResults[0].title,
        top_citing_url: searchResults[0].url
      };
    }
  } else {
    searchTrail.push({ source: 'SAFLII (search)', result: 'No results' });
  }

  if (mismatchInfo) {
    return {
      status: 'typo_detected',
      saflii_citation: mismatchInfo.citation,
      match_confidence: 0,
      year_discrepancy: { document: `${partyA} v ${partyB}`, saflii: mismatchInfo.title.substring(0,80) },
      found_via: 'SAFLII',
      cited_case_title: mismatchInfo.title,
      cited_case_url: mismatchInfo.url,
      cited_case_citation: mismatchInfo.citation,
      search_trail: searchTrail,
      title: mismatchInfo.title,
      url: mismatchInfo.url
    };
  }

  return {
    status: 'not_found',
    saflii_citation: null,
    match_confidence: 0,
    year_discrepancy: null,
    found_via: null,
    search_trail: searchTrail
  };
}

export type ConfidenceTier = 'EXACT_MATCH' | 'PARTIAL_MATCH' | 'POTENTIAL_MATCH' | 'CITED_IN_OTHER_CASES' | 'NOT_FOUND';

export function classifyConfidence(status: SafliiResult['status'], matchConfidence: number, foundVia: string | null): ConfidenceTier {
  if (status === 'found' && foundVia === 'SAFLII' && matchConfidence >= 80) return 'EXACT_MATCH';
  if ((status === 'found' || status === 'typo_detected') && foundVia === 'SAFLII' && matchConfidence >= 50) return 'PARTIAL_MATCH';
  if (status === 'mismatch_resolved') return 'PARTIAL_MATCH';
  if ((status === 'found' || status === 'typo_detected') && foundVia === 'SAFLII') return 'POTENTIAL_MATCH';
  if (status === 'cited_in_other_cases') return 'CITED_IN_OTHER_CASES';
  return 'NOT_FOUND';
}
