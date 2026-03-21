import { CitationEngine } from './src/lib/extractor';

const text = "Independent Institute of Education (Pty) Ltd v KwaZulu-Natal Law Society and Others 2020 (2) SA 325 (CC)";
const results = CitationEngine.extractCitations(text);
console.log(JSON.stringify(results, null, 2));
