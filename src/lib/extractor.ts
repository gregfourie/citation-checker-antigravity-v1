const NP = "[A-Za-z\\s&()\\-'.,]";

export interface CitationMatch {
  type: string;
  data: string[]; // Capture groups: [caseName, year, ...]
}

export class CitationEngine {
  private static readonly PATTERNS: Record<string, RegExp> = {
    standard_sa: new RegExp(`([A-Z]${NP}+?v\\.?\\s${NP}+?)\\s(\\d{4})\\s\\((\\d+)\\)\\sSA\\s(\\d+)\\s\\(([A-Z]+)\\)`, 'g'),
    bclr: new RegExp(`([A-Z]${NP}+?v\\.?\\s${NP}+?)\\s(\\d{4})\\s\\((\\d+)\\)\\sBCLR\\s(\\d+)\\s\\(([A-Z]+)\\)`, 'g'),
    sacr: new RegExp(`([A-Z]${NP}+?v\\.?\\s${NP}+?)\\s(\\d{4})\\s\\((\\d+)\\)\\sSACR\\s(\\d+)\\s\\(([A-Z]+)\\)`, 'g'),
    all_sa: new RegExp(`([A-Z]${NP}+?v\\.?\\s${NP}+?)\\s(\\d{4})\\s\\((\\d+)\\)\\sAll\\sSA\\s(\\d+)\\s\\(([A-Z]+)\\)`, 'g'),
    old_provincial: new RegExp(`([A-Z]${NP}+?v\\.?\\s${NP}+?),?\\s(\\d{4})\\s(CPD|TPD|WLD|NPD|OPD|EPD|AD|SCA|DCLD|SECLD|NCHC|BCHC|ECD|NCD)\\s(\\d+)`, 'g'),
    neutral_zasca: new RegExp(`([A-Z]${NP}+?v\\.?\\s${NP}+?)\\s\\[(\\d{4})\\]\\sZASCA\\s(\\d+)`, 'g'),
    neutral_zacc: new RegExp(`([A-Z]${NP}+?v\\.?\\s${NP}+?)\\s\\[(\\d{4})\\]\\sZACC\\s(\\d+)`, 'g'),
    neutral_regional: new RegExp(`([A-Z]${NP}+?v\\.?\\s${NP}+?)\\s\\[(\\d{4})\\]\\s(ZA[A-Z]{2,8})\\s(\\d+)`, 'g'),
    loose_sa: new RegExp(`([A-Z]${NP}+?v\\.?\\s${NP}+?)\\s(\\d{4})\\s+(\\d*)\\s*(?:SA|BCLR|SACR)\\s(\\d+)`, 'g'),
  };

  private static readonly FOOTNOTE_PATTERNS: Record<string, RegExp> = {
    standard_sa: /(\d{4})\s\((\d+)\)\sSA\s(\d+)\s\(([A-Z]+)\)/,
    bclr: /(\d{4})\s\((\d+)\)\sBCLR\s(\d+)\s\(([A-Z]+)\)/,
    sacr: /(\d{4})\s\((\d+)\)\sSACR\s(\d+)\s\(([A-Z]+)\)/,
    all_sa: /(\d{4})\s\((\d+)\)\sAll\sSA\s(\d+)\s\(([A-Z]+)\)/,
  };

  public static extractCitations(text: string): CitationMatch[] {
    const found: CitationMatch[] = [];
    const seen = new Set<string>();

    const lines = text.split('\n');
    const orderedKeys = [
      'standard_sa', 'bclr', 'sacr', 'all_sa', 'old_provincial',
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
          const caseName = m[1].trim().replace(/[,.\s]+$/, '');
          const year = m[2];
          const dedupKey = `${caseName.toLowerCase()}|${year}`;

          if (label === 'neutral_regional' && seen.has(dedupKey)) continue;
          if (['bclr', 'sacr', 'all_sa'].includes(label) && seen.has(dedupKey)) continue;

          seen.add(dedupKey);
          
          const data = m.slice(1);
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
           const nameMatch = prevLine.match(/([A-Z][A-Za-z\s&()\-'.,]+?v\.?\s[A-Za-z\s&()\-'.,]+?)(?:\s*\d*\s*$)/);
           if (nameMatch) {
             partyName = nameMatch[1].trim().replace(/[,.\s0-9]+$/, '');
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
    case 'standard_sa': return `${d[0]} ${d[1]} (${d[2]}) SA ${d[3]} (${d[4]})`;
    case 'bclr': return `${d[0]} ${d[1]} (${d[2]}) BCLR ${d[3]} (${d[4]})`;
    case 'sacr': return `${d[0]} ${d[1]} (${d[2]}) SACR ${d[3]} (${d[4]})`;
    case 'all_sa': return `${d[0]} ${d[1]} (${d[2]}) All SA ${d[3]} (${d[4]})`;
    case 'old_provincial': return `${d[0]} ${d[1]} ${d[2]} ${d[3]}`;
    case 'neutral_zasca': return `${d[0]} [${d[1]}] ZASCA ${d[2]}`;
    case 'neutral_zacc': return `${d[0]} [${d[1]}] ZACC ${d[2]}`;
    case 'neutral_regional': return `${d[0]} [${d[1]}] ${d[2]} ${d[3]}`;
    case 'loose_sa': return `${d[0]} ${d[1]} ${d[2] ? `(${d[2]}) ` : ''}SA ${d[3]}`;
    default: return `${d[0]} ${d[1]}`;
  }
}
