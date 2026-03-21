import { lookupCitation } from './src/lib/saflii';
import { CitationMatch } from './src/lib/extractor';

const citationMatch: CitationMatch = {
  type: 'standard_sa',
  data: [
    'The court said in Independent Institute of Education (Pty) Ltd v KwaZulu-Natal Law Society and Others',
    '2020',
    '2',
    '325',
    'CC'
  ]
};

async function run() {
  const result = await lookupCitation(citationMatch);
  console.log(JSON.stringify(result, null, 2));
}

run();
