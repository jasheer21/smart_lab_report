import { GoogleGenAI } from '@google/genai';
import { config, isPlaceholderKey } from '../config';

// The parser looks for "<test name> <value> <unit>" with only whitespace between value and unit,
// so the model must not use pipes, tables or markdown.
const TRANSCRIBE_PROMPT = [
  'You are transcribing a clinical laboratory report. Copy only what is printed; never guess or invent values.',
  'Output plain text with no markdown, tables, pipes or commentary.',
  'First, copy the header fields that are present, one per line, as "Label : value"',
  '(for example: laboratory name, Name, Patient ID, Age, Sex, Lab ID, Order No, Collection Date, Reporting Date).',
  'Then output one test result per line in exactly this order, separated by single spaces:',
  'TestName Value Unit ReferenceRange',
  'Example: "HbA1c 6.1 % 4.0 - 5.6" or "HDL Cholesterol 42 mg/dL > 50".',
  'Keep the test names, units and ranges exactly as printed. Skip results that are illegible.',
].join('\n');

let client: GoogleGenAI | null = null;

export const isGeminiConfigured = () => !isPlaceholderKey(config.geminiKey);

function getClient(): GoogleGenAI {
  client ??= new GoogleGenAI({
    apiKey: config.geminiKey,
    httpOptions: { timeout: config.geminiTimeoutMs },
  });
  return client;
}

/** Returns transcribed text, or null when Gemini is not configured or the call fails. */
export async function transcribeWithGemini(buffer: Buffer, mimeType: string): Promise<string | null> {
  if (!isGeminiConfigured()) return null;
  try {
    const response = await getClient().models.generateContent({
      model: config.geminiModel,
      contents: [
        {
          role: 'user',
          parts: [{ text: TRANSCRIBE_PROMPT }, { inlineData: { mimeType, data: buffer.toString('base64') } }],
        },
      ],
      config: { temperature: 0 },
    });
    return response.text?.trim() || null;
  } catch (err) {
    console.warn('[ocr] Gemini Vision fallback failed:', err instanceof Error ? err.message : err);
    return null;
  }
}
