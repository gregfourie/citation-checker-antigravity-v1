import { CitationEngine } from './src/lib/extractor';
import { lookupCitation } from './src/lib/saflii';

async function test() {
  const tests = [
    'Metallurgical and Commercial Consultants (Pty) Ltd v Metal Sales Co (Pty) Ltd 1971 (2) SA 388 (W)',
    'Blotnick v. Turecki 1944 CPD 100',
    'S v Makwanyane 1994 (3) SA 391 (CC)'
  ];

  for (const text of tests) {
    console.log('\\n--- Testing:', text);
    const citations = CitationEngine.extractCitations(text);
    if (citations.length > 0) {
      const result = await lookupCitation(citations[0]);
      console.log('Result Status:', result.status);
      console.log('Match Confidence:', result.match_confidence);
      console.log('Year Discrepancy:', result.year_discrepancy);
      console.log('Citing Count:', result.citing_cases_count);
    } else {
      console.log('Failed to extract');
    }
  }
}

test();
