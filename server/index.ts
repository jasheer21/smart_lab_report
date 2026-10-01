import './loadEnv';
import { createApp } from './app';
import { config } from './config';
import { isGeminiConfigured } from './ocr/gemini';

const server = createApp().listen(config.port, () => {
  console.log(`[smart-report-api] listening on http://localhost:${config.port}`);
  console.log(
    `[smart-report-api] Gemini Vision OCR fallback: ${isGeminiConfigured() ? `enabled (${config.geminiModel})` : 'disabled (set SMART_REPORT_GEMINI_API_KEY)'}`,
  );
});

const shutdown = () => server.close(() => process.exit(0));
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
