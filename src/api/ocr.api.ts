import { ApiResponse, apiRequest } from './httpClient';

export interface OcrResult {
  text: string;
  method: 'text-file' | 'pdf-text' | 'gemini-vision';
  pageCount: number | null;
  fingerprint: string;
  chars: number;
}

/** Endpoint: POST /api/ocr/extract — text of a PDF, image scan or .txt, without parsing. */
export async function extractDocumentText(file: File): Promise<ApiResponse<OcrResult>> {
  const form = new FormData();
  form.append('file', file);
  return apiRequest<OcrResult>('/api/ocr/extract', { method: 'POST', body: form });
}
