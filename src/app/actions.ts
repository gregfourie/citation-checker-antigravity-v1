'use server'

// Polyfills needed by pdfjs-dist in Node.js
if (typeof globalThis.DOMMatrix === 'undefined') {
  (globalThis as any).DOMMatrix = class DOMMatrix {};
}
if (typeof globalThis.DOMPoint === 'undefined') {
  (globalThis as any).DOMPoint = class DOMPoint {};
}

import mammoth from 'mammoth';
import { CitationEngine, CitationMatch } from '@/lib/extractor';
import { lookupCitation, SafliiResult, classifyConfidence, ConfidenceTier } from '@/lib/saflii';


export interface ProcessedCitation extends CitationMatch {
  id: string;
  result: SafliiResult | null;
  tier: ConfidenceTier | null;
}

/**
 * Extract text from a PDF buffer using pdfjs-dist directly.
 *
 * Avoids pdf-parse which pulls in @napi-rs/canvas (a native addon that
 * crashes on Vercel serverless). We only need text extraction, not rendering,
 * so canvas is unnecessary.
 */
async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  // Dynamic import to avoid loading pdfjs-dist at module level
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');

  // Disable web worker completely for Vercel
  pdfjsLib.GlobalWorkerOptions.workerSrc = '';

  const uint8Array = new Uint8Array(buffer);
  const loadingTask = pdfjsLib.getDocument({
    data: uint8Array,
    useSystemFonts: true,
    // Disable canvas — we only need text
    disableFontFace: true,
    // Disable worker entirely
    isEvalSupported: false,
    useWorkerFetch: false,
  });

  const doc = await loadingTask.promise;
  const textParts: string[] = [];

  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();

    let pageText = '';
    let lastY: number | null = null;

    for (const item of content.items) {
      if ('str' in item) {
        // Detect line breaks by checking Y-position changes
        const currentY = (item as any).transform?.[5];
        if (lastY !== null && currentY !== undefined && Math.abs(currentY - lastY) > 2) {
          pageText += '\n';
        }
        pageText += item.str;
        if (currentY !== undefined) {
          lastY = currentY;
        }
      }
    }

    textParts.push(pageText);
    page.cleanup();  // Release page resources to keep memory bounded
  }

  doc.destroy();
  return textParts.join('\n');
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
          extractedText = await extractTextFromPdf(buffer);
        } catch (err: any) {
          console.error('PDF parse error:', err);
          return { text: '', citations: [], error: 'PDF parsing failed: ' + (err.message || err.toString()) };
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

    if (i + concurrencyLimit < citations.length) {
      await new Promise(res => setTimeout(res, 500));
    }
  }

  return results;
}
