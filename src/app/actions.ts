'use server'

if (typeof global.DOMMatrix === 'undefined') {
  (global as any).DOMMatrix = class DOMMatrix {};
}
if (typeof global.DOMPoint === 'undefined') {
  (global as any).DOMPoint = class DOMPoint {};
}

import mammoth from 'mammoth';
const pdfParse = require('pdf-parse');
import { CitationEngine, CitationMatch } from '@/lib/extractor';
import { lookupCitation, SafliiResult, classifyConfidence, ConfidenceTier } from '@/lib/saflii';

export interface ProcessedCitation extends CitationMatch {
  id: string;
  result: SafliiResult | null;
  tier: ConfidenceTier | null;
}

export async function parseDocument(formData: FormData): Promise<{ text: string, citations: CitationMatch[], error?: string }> {
  const file = formData.get('file') as File;
  if (!file) return { text: '', citations: [], error: 'No file provided' };

  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    let extractedText = '';

    if (file.name.endsWith('.pdf')) {
      const data = await pdfParse(buffer);
      extractedText = data.text;
    } else if (file.name.endsWith('.docx')) {
      const result = await mammoth.extractRawText({ buffer });
      extractedText = result.value;
    } else {
      return { text: '', citations: [], error: 'Unsupported file format. Please upload PDF or DOCX.' };
    }

    const citations = CitationEngine.extractCitations(extractedText);
    return { text: extractedText, citations };

  } catch (error: any) {
    console.error("Parse Error:", error);
    return { text: '', citations: [], error: error.message || 'Error parsing document' };
  }
}

export async function verifyCitations(citations: CitationMatch[]): Promise<ProcessedCitation[]> {
  const results: ProcessedCitation[] = [];
  
  // Verify sequentially to avoid hitting SAFLII too hard and respecting delay
  for (let i = 0; i < citations.length; i++) {
    const match = citations[i];
    const safliiResult = await lookupCitation(match);
    const tier = classifyConfidence(safliiResult.status, safliiResult.match_confidence, safliiResult.found_via);
    
    results.push({
      ...match,
      id: `cit-${i}-${Date.now()}`,
      result: safliiResult,
      tier
    });
  }
  
  return results;
}
