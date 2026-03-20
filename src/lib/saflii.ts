import * as cheerio from 'cheerio';
// @ts-ignore
import * as fuzz from 'fuzzball';
import { CitationMatch, formatCitationDisplay } from './extractor';

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
  const match = display.match(/([A-Z][A-Za-z\s&()]*?)\s+v\.?\s+([A-Z][A-Za-z\s&()]*?)(?=\s*[\[\(]|\s*\d{4}|\s*SA\b|\s*BCLR\b|\s*SACR\b|\s*All\s|\s*ZA[A-Z]|\s*CCT|\s*,?\s*\d{4}|\s*$)/);
  if (match) {
    return [match[1].trim(), match[2].trim()];
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

async function fetchHtml(url: string, useProxy: boolean = true): Promise<{ status: number; html: string }> {
  const fetchUrl = useProxy ? `${PROXY_URL}${encodeURIComponent(url)}` : url;
  try {
    const res = await fetch(fetchUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
      }
    });
    const html = await res.text();
    return { status: res.status, html };
  } catch (err) {
    return { status: 500, html: '' };
  }
}

async function checkDirectUrl(url: string): Promise<SafliiResult | null> {
  const { status, html } = await fetchHtml(url, true);
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
  
  let searchUrl = `${SEARCH_URL}?query=${encodeURIComponent(query)}&method=all&results=20`;
  
  await delay(1000);
  let { status, html } = await fetchHtml(searchUrl, true);
  
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
    const fb = await fetchHtml(searchUrl, true);
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

    if (partyA && partyB) {
      const docStr = `${partyA} v ${partyB}`.toLowerCase();
      const docStrNoV = `${partyA} ${partyB}`.toLowerCase(); // Compare purely names just in case SAFLII Title omits 'v' or 'and' etc.
      
      for (const res of searchResults) {
        let score = fuzz.token_set_ratio(docStr, res.title.toLowerCase());
        
        const citationInUrl = extractCitationFromUrl(res.url);
        let resYear = null;
        if (citationInUrl) {
          const ym = citationInUrl.match(/\[(\d{4})\]/);
          if (ym) resYear = ym[1];
        }
        let yearDiscrepancy = null;
        if (resYear) {
          if (resYear === docYear) score += 10;
          else yearDiscrepancy = { document: docYear, saflii: resYear };
        }

        if (score > bestScore) {
          bestScore = score;
          bestMatch = { ...res, citation: citationInUrl };
          bestYearDiscrepancy = yearDiscrepancy;
        }
      }
    } else {
      for (const res of searchResults) {
        const citationInUrl = extractCitationFromUrl(res.url);
        if (citationInUrl) {
          const ym = citationInUrl.match(/\[(\d{4})\]/);
          if (ym) {
            if (ym[1] === docYear) { bestScore = 70; bestMatch = { ...res, citation: citationInUrl }; break; }
            else { bestScore = 60; bestMatch = { ...res, citation: citationInUrl }; bestYearDiscrepancy = { document: docYear, saflii: ym[1] }; break; }
          }
        }
      }
      if (!bestMatch) {
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
