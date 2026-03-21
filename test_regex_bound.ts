import { CitationEngine } from './src/lib/extractor';

const text = "Hello world. This is a paragraph. The court said in Independent Institute of Education (Pty) Ltd v KwaZulu-Natal Law Society and Others 2020 (2) SA 325 (CC) that things are okay.";
console.log(JSON.stringify(CitationEngine.extractCitations(text), null, 2));
