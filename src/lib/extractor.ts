const NP = "[A-Za-z0-9\\s&()\\-',\u2018\u2019\u201C\u201D/]";
const NPLIM = `(?:${NP}|\\.(?!\\s)){1,150}?`;

export interface CitationMatch {
  type: string;
  data: string[]; // Capture groups: [caseName, year, ...]
}

export class CitationEngine {
  private static readonly PATTERNS: Record<string, RegExp> = {
    standard_sa: new RegExp(`([A-Z]${NPLIM}v\\.?\\s${NPLIM})\\s(\\d{4})\\s\\((\\d+)\\)\\sSA\\s(\\d+)(?:\\s\\(([A-Z]+)\\))?`, 'g'),
    bclr: new RegExp(`([A-Z]${NPLIM}v\\.?\\s${NPLIM})\\s(\\d{4})\\s\\((\\d+)\\)\\sBCLR\\s(\\d+)(?:\\s\\(([A-Z]+)\\))?`, 'g'),
    sacr: new RegExp(`([A-Z]${NPLIM}v\\.?\\s${NPLIM})\\s(\\d{4})\\s\\((\\d+)\\)\\sSACR\\s(\\d+)(?:\\s\\(([A-Z]+)\\))?`, 'g'),
    all_sa: new RegExp(`([A-Z]${NPLIM}v\\.?\\s${NPLIM})\\s(\\d{4})\\s\\((\\d+)\\)\\sAll\\sSA\\s(\\d+)(?:\\s\\(([A-Z]+)\\))?`, 'g'),
    bllr: new RegExp(`([A-Z]${NPLIM}v\\.?\\s${NPLIM})\\s\\[(\\d{4})\\]\\s(\\d*)\\s*BLLR\\s(\\d+)(?:\\s\\(([A-Z]+)\\))?`, 'g'),
    ilj: new RegExp(`([A-Z]${NPLIM}v\\.?\\s${NPLIM})\\s*(?:\\(?(\\d{4})\\)?)?\\s+(\\d*)\\s*\\(?ILJ\\)?\\s+(\\d+)(?:\\s*\\(([A-Z]+)\\))?`, 'g'),
    old_provincial: new RegExp(`([A-Z]${NPLIM}),?\\s(\\d{4})\\s(CPD|TPD|WLD|NPD|OPD|EPD|AD|SCA|DCLD|SECLD|NCHC|BCHC|ECD|NCD)\\s(\\d+)`, 'g'),
    neutral_zasca: new RegExp(`([A-Z]${NPLIM})\\s\\[(\\d{4})\\]\\sZASCA\\s(\\d+)`, 'g'),
    neutral_zacc: new RegExp(`([A-Z]${NPLIM})\\s\\[(\\d{4})\\]\\sZACC\\s(\\d+)`, 'g'),
    neutral_regional: new RegExp(`([A-Z]${NPLIM})\\s\\[(\\d{4})\\]\\s(ZA[A-Z]{2,8})\\s(\\d+)`, 'g'),
    loose_sa: new RegExp(`([A-Z]${NPLIM})\\s(\\d{4})\\s+(\\d*)\\s*(?:SA|BCLR|SACR)\\s(\\d+)`, 'g'),
  };

  private static readonly FOOTNOTE_PATTERNS: Record<string, RegExp> = {
    standard_sa: /(\d{4})\s\((\d+)\)\sSA\s(\d+)(?:\s\(([A-Z]+)\))?/,
    bclr: /(\d{4})\s\((\d+)\)\sBCLR\s(\d+)(?:\s\(([A-Z]+)\))?/,
    sacr: /(\d{4})\s\((\d+)\)\sSACR\s(\d+)(?:\s\(([A-Z]+)\))?/,
    all_sa: /(\d{4})\s\((\d+)\)\sAll\sSA\s(\d+)(?:\s\(([A-Z]+)\))?/,
    bllr: /\[(\d{4})\]\s(\d*)\s*BLLR\s(\d+)(?:\s\(([A-Z]+)\))?/,
  };

  private static cleanPartyName(rawName: string): string {
    const vMatch = rawName.match(/\s+v\.?\s+/);
    if (!vMatch) return rawName;

    const vIndex = vMatch.index!;
    const partyA = rawName.substring(0, vIndex).trim();
    const partyB = rawName.substring(vIndex + vMatch[0].length).trim();

    const allowedLower = ['of', 'and', 'or', 'the', 'a', 'for', 'in', 'on', 'to', 'under', 't/a', 'de', 'van', 'der', 'le', 'la', 'du', 'di', 'mac', 'mc', 'op', 'te', 'ten', 'another', 'others', 'et', 'al'];
    const words = partyA.split(/\s+/);
    let startIdx = 0;
    
    for (let i = words.length - 1; i >= 0; i--) {
      const w = words[i];
      if (/^[a-z]+$/.test(w) && !allowedLower.includes(w.toLowerCase())) {
        startIdx = i + 1;
        break;
      }
      if (/^[a-z]+[\.;:]+$/.test(w) && !allowedLower.includes(w.replace(/[\.;:]+$/, '').toLowerCase())) {
        startIdx = i + 1;
        break;
      }
      if (/^\(?\d+\)?$/.test(w)) {
        startIdx = i + 1;
        break;
      }
      if (/^\(?[A-Z]{1,4}\)?$/.test(w) && w.startsWith('(')) {
        // pure uppercase abbr in parenthesis like (LC), (CC), (A)
        startIdx = i + 1;
        break;
      }
      if (/^\(?(?:BLLR|BCLR|SACR|ILJ|All|ZACC|ZASCA|ZA[A-Z]+)\)?$/i.test(w)) {
        startIdx = i + 1;
        break;
      }
    }
    
    while (startIdx < words.length) {
      const w = words[startIdx].toLowerCase();
      if (['in', 'on', 'to', 'under', 'for', 'and', 'a', 'of'].includes(w)) {
        startIdx++;
      } else {
        break;
      }
    }
    
    const cleanedPartyA = words.slice(startIdx).join(' ').trim();
    return `${cleanedPartyA}${vMatch[0]}${partyB}`;
  }

  public static extractCitations(text: string): CitationMatch[] {
    const found: CitationMatch[] = [];
    const seen = new Set<string>();

    const normalizedText = text
      .replace(/[ \t]{2,}/g, ' ')
      .replace(/([^\r\n])\r?\n([^\r\n])/g, '$1 $2')
      .replace(/(\b[A-Za-z]+)\s+([a-z]+-)/g, '$1$2')
      .replace(/(\b[A-Za-z]+)-\s+([a-z])/g, '$1-$2');
    const lines = normalizedText.split('\n');
    const orderedKeys = [
      'standard_sa', 'bclr', 'sacr', 'all_sa', 'bllr', 'ilj', 'old_provincial',
      'neutral_zasca', 'neutral_zacc', 'neutral_regional',
      'loose_sa',
    ];

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;

      for (const label of orderedKeys) {
        const pattern = this.PATTERNS[label];
        const matches = Array.from(line.matchAll(pattern));
        
        for (const m of matches) {
          const rawPartyName = m[1].trim().replace(/[,.\s]+$/, '');
          const caseName = this.cleanPartyName(rawPartyName);
          const year = m[2];
          const dedupKey = `${caseName.toLowerCase()}|${year}`;

          if (label === 'neutral_regional' && seen.has(dedupKey)) continue;
          if (['bclr', 'sacr', 'all_sa'].includes(label) && seen.has(dedupKey)) continue;

          seen.add(dedupKey);
          
          const data = [caseName, ...m.slice(2)];
          found.push({ type: label, data });
        }
      }
    }

    // Footnote recovery
    for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
      const lineStripped = lines[lineIdx].trim();
      if (!lineStripped) continue;

      for (const [fnLabel, fnPattern] of Object.entries(this.FOOTNOTE_PATTERNS)) {
        const fnMatch = lineStripped.match(fnPattern);
        if (!fnMatch || fnMatch.index === undefined) continue;

        const beforeCitation = lineStripped.substring(0, fnMatch.index);
        if (/\bv\.?\s/.test(beforeCitation)) continue;

        const year = fnMatch[1];
        const page = fnMatch[3];
        const alreadyFound = found.some(
          r => r.data[1] === year && r.type === fnLabel && r.data.includes(page)
        );
        if (alreadyFound) continue;

        let partyName: string | null = null;
        for (let back = 1; back <= Math.min(100, lineIdx); back++) {
           const prevLine = lines[lineIdx - back].trim();
           if (!prevLine) continue;
           const nameMatch = prevLine.match(/([A-Z][A-Za-z\s&()\-'.,\u2019/]+?v\.?\s[A-Za-z\s&()\-'.,\u2019/]+?)(?:\s*\d*\s*$)/);
           if (nameMatch) {
             partyName = this.cleanPartyName(nameMatch[1].trim().replace(/[,.\s0-9]+$/, ''));
             break;
           }
        }

        if (partyName) {
           const data = [partyName, ...fnMatch.slice(1)];
           const dedupKey = `${partyName.toLowerCase()}|${year}`;
           if (!seen.has(dedupKey)) {
             seen.add(dedupKey);
             found.push({ type: fnLabel, data });
           }
        }
      }
    }
    return found;
  }
}

export function formatCitationDisplay(match: CitationMatch): string {
  const t = match.type;
  const d = match.data;
  
  switch(t) {
    case 'standard_sa': return `${d[0]} ${d[1]} (${d[2]}) SA ${d[3]}${d[4] ? ` (${d[4]})` : ''}`;
    case 'bclr': return `${d[0]} ${d[1]} (${d[2]}) BCLR ${d[3]}${d[4] ? ` (${d[4]})` : ''}`;
    case 'sacr': return `${d[0]} ${d[1]} (${d[2]}) SACR ${d[3]}${d[4] ? ` (${d[4]})` : ''}`;
    case 'all_sa': return `${d[0]} ${d[1]} (${d[2]}) All SA ${d[3]}${d[4] ? ` (${d[4]})` : ''}`;
    case 'bllr': return `${d[0]} [${d[1]}] ${d[2] ? d[2] + ' ' : ''}BLLR ${d[3]}${d[4] ? ` (${d[4]})` : ''}`;
    case 'ilj': {
      const yearStr = d[1] ? ` (${d[1]})` : '';
      const volStr = d[2] ? ` ${d[2]}` : '';
      const courtStr = d[4] ? ` (${d[4]})` : '';
      return `${d[0].trim()}${yearStr}${volStr} ILJ ${d[3]}${courtStr}`;
    }
    case 'old_provincial': return `${d[0]} ${d[1]} ${d[2]} ${d[3]}`;
    case 'neutral_zasca': return `${d[0]} [${d[1]}] ZASCA ${d[2]}`;
    case 'neutral_zacc': return `${d[0]} [${d[1]}] ZACC ${d[2]}`;
    case 'neutral_regional': return `${d[0]} [${d[1]}] ${d[2]} ${d[3]}`;
    case 'loose_sa': return `${d[0]} ${d[1]} ${d[2] ? `(${d[2]}) ` : ''}SA ${d[3]}`;
    default: return `${d[0]} ${d[1]}`;
  }
}
