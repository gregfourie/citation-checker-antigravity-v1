import mammoth from 'mammoth';
import * as fs from 'fs';
import { CitationEngine } from './src/lib/extractor';

async function test() {
  const buffer = fs.readFileSync('./test heads v3.docx');
  const result = await mammoth.extractRawText({ buffer });
  const text = result.value;
  
  const citations = CitationEngine.extractCitations(text);
  console.log("Total extracted:", citations.length);
  citations.forEach((c, i) => console.log(`[${i+1}] ${c.data[0]} ${c.data[1]}`));
}
test();
