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
  try {
    let extractedText = '';
    
    // Check if the user pasted text directly
    const textInput = formData.get('text') as string;
    if (textInput?.trim()) {
      extractedText = textInput;
    } else {
      // Otherwise, parse the file
      const file = formData.get('file') as File;
      if (!file) return { text: '', citations: [], error: 'No file or text provided' };

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      if (file.name.toLowerCase().endsWith('.pdf')) {
        try {
          const options = {
            pagerender: async function(pageData: any) {
              const textContent = await pageData.getTextContent();
              let text = '';
              for (let item of textContent.items) {
                 text += item.str + ' ';
              }
              if (typeof pageData.cleanup === 'function') {
                 pageData.cleanup();
              }
              return text + '\\n';
            }
          };
          const data = await pdfParse(buffer, options);
          extractedText = data.text;
        } catch (err: any) {
          return { text: '', citations: [], error: 'PDF Parsing failed: ' + (err.message || err.toString()) };
        }
      } else if (file.name.endsWith('.docx')) {
        const result = await mammoth.extractRawText({ buffer });
        extractedText = result.value;
      } else {
        return { text: '', citations: [], error: 'Unsupported file format. Please upload PDF or DOCX.' };
      }
    }

    const citations = CitationEngine.extractCitations(extractedText);
    return { text: extractedText, citations };

  } catch (error: any) {
    console.error("Parse Error:", error);
    return { text: '', citations: [], error: error.message || 'Error parsing document' };
  }
}

const verificationCache = new Map<string, Omit<ProcessedCitation, 'id'>>();

export async function verifyCitations(citations: CitationMatch[]): Promise<ProcessedCitation[]> {
  const results: ProcessedCitation[] = [];
  const concurrencyLimit = 5;

  for (let i = 0; i < citations.length; i += concurrencyLimit) {
    const chunk = citations.slice(i, i + concurrencyLimit);
    
    const chunkPromises = chunk.map(async (match, chunkIndex) => {
      const globalIndex = i + chunkIndex;
      const cacheKey = JSON.stringify({ type: match.type, data: match.data });
      
      if (verificationCache.has(cacheKey)) {
        const cached = verificationCache.get(cacheKey)!;
        return { ...cached, id: `cit-${globalIndex}-${Date.now()}` } as ProcessedCitation;
      }

      const safliiResult = await lookupCitation(match);
      const tier = classifyConfidence(safliiResult.status, safliiResult.match_confidence, safliiResult.found_via);
      
      const processedCore = {
        ...match,
        result: safliiResult,
        tier
      };
      
      verificationCache.set(cacheKey, processedCore);
      return { ...processedCore, id: `cit-${globalIndex}-${Date.now()}` } as ProcessedCitation;
    });

    const chunkResults = await Promise.all(chunkPromises);
    results.push(...chunkResults);
    
    // Brief delay between concurrent chunks to respect SAFLII limits
    if (i + concurrencyLimit < citations.length) {
      await new Promise(res => setTimeout(res, 500));
    }
  }
  
  return results;
}
