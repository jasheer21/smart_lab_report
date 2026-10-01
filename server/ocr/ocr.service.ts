import crypto from 'node:crypto';
import { PDFParse } from 'pdf-parse';
import { normalize } from '../../src/modules/smart-report/smartReport.parser';
import { config } from '../config';
import { AppError } from '../errors';
import type { DetectedFile } from '../upload';
import { isGeminiConfigured, transcribeWithGemini } from './gemini';

export type ExtractionMethod = 'text-file' | 'pdf-text' | 'gemini-vision';

export interface ExtractionResult {
  text: string;
  method: ExtractionMethod;
  pageCount: number | null;
  fingerprint: string;
}

/** Below this, the PDF is probably scanned (or mostly images), so Gemini Vision is tried. */
export const MIN_USEFUL_TEXT_CHARS = 400;
/** Below this, nothing meaningful could be read. */
export const MIN_ACCEPTABLE_TEXT_CHARS = 80;

/** Keyed by SHA-256 of the file so the same document is never OCR'd twice (per process). */
const cache = new Map<string, Omit<ExtractionResult, 'fingerprint'>>();

export function clearOcrCache() {
  cache.clear();
}

export async function extractText(buffer: Buffer, file: DetectedFile): Promise<ExtractionResult> {
  const fingerprint = crypto.createHash('sha256').update(buffer).digest('hex');
  const cached = cache.get(fingerprint);
  if (cached) {
    // Re-insert to keep the most recently used entries at the end (LRU eviction order).
    cache.delete(fingerprint);
    cache.set(fingerprint, cached);
    return { ...cached, fingerprint };
  }

  const result = await extractUncached(buffer, file);
  if (result.text.length < MIN_ACCEPTABLE_TEXT_CHARS) {
    const hint =
      file.kind === 'pdf' && !isGeminiConfigured()
        ? ' It looks like a scanned PDF; scanned reports need SMART_REPORT_GEMINI_API_KEY to be configured on the server.'
        : '';
    throw new AppError(`Could not read enough text from the document.${hint}`, 422);
  }

  if (cache.size >= config.ocrCacheMax) cache.delete(cache.keys().next().value!);
  cache.set(fingerprint, result);
  return { ...result, fingerprint };
}

async function extractUncached(buffer: Buffer, file: DetectedFile): Promise<Omit<ExtractionResult, 'fingerprint'>> {
  if (file.kind === 'text') {
    return { text: normalize(buffer.toString('utf8')), method: 'text-file', pageCount: null };
  }

  if (file.kind === 'image') {
    if (!isGeminiConfigured()) {
      throw new AppError('Image scans need SMART_REPORT_GEMINI_API_KEY to be configured on the server.', 422);
    }
    const vision = await transcribeWithGemini(buffer, file.mimeType);
    return { text: normalize(vision || ''), method: 'gemini-vision', pageCount: 1 };
  }

  const pdf = await readPdfText(buffer);
  if (pdf.text.length >= MIN_USEFUL_TEXT_CHARS) return { ...pdf, method: 'pdf-text' };

  const vision = normalize((await transcribeWithGemini(buffer, file.mimeType)) || '');
  if (vision.length > pdf.text.length) return { text: vision, method: 'gemini-vision', pageCount: pdf.pageCount };
  return { ...pdf, method: 'pdf-text' };
}

async function readPdfText(buffer: Buffer): Promise<{ text: string; pageCount: number | null }> {
  // pdf.js may transfer (detach) the buffer it's given, so pass a copy and keep the original for Gemini.
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  try {
    const result = await parser.getText();
    return { text: normalize(result.text || ''), pageCount: result.pages?.length ?? null };
  } catch (err) {
    const name = err instanceof Error ? err.name : '';
    if (name === 'PasswordException') throw new AppError('Password-protected PDFs are not supported.', 422);
    if (name === 'InvalidPDFException') throw new AppError('The PDF file is corrupted or invalid.', 422);
    console.warn('[ocr] pdf-parse failed:', err instanceof Error ? err.message : err);
    return { text: '', pageCount: null };
  } finally {
    await parser.destroy().catch(() => undefined);
  }
}
