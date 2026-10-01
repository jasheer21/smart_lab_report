import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import cors from 'cors';
import express from 'express';
import { rateLimit } from 'express-rate-limit';
import { config } from './config';
import { errorHandler, notFoundHandler } from './errors';
import { isGeminiConfigured } from './ocr/gemini';
import { catalogRouter } from './routes/catalog.routes';
import { labReportsRouter } from './routes/labReports.routes';
import { ocrRouter } from './routes/ocr.routes';
import { reportsRouter } from './routes/reports.routes';

const distDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../dist');

export function createApp({ serveFrontend = true } = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  if (config.corsOrigins.length) app.use('/api', cors({ origin: config.corsOrigins }));
  app.use(express.json({ limit: '1mb' }));

  // Each upload can mean a PDF parse plus a paid Gemini call, so these routes are throttled per IP.
  const heavyLimiter = rateLimit({
    windowMs: 60_000,
    limit: config.rateLimitPerMinute,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { success: false, message: 'Too many requests, please try again in a minute.' },
  });

  app.get('/api/health', (_req, res) => {
    res.json({ success: true, data: { status: 'ok', ocr: { pdfText: true, geminiVision: isGeminiConfigured() } } });
  });
  app.use('/api/catalog', catalogRouter);
  app.use('/api/ocr', heavyLimiter, ocrRouter);
  app.use('/api/lab-reports', heavyLimiter, labReportsRouter);
  app.use('/api/reports/insights', heavyLimiter);
  app.use('/api/reports', reportsRouter);
  app.use('/api', notFoundHandler);

  if (serveFrontend && fs.existsSync(path.join(distDir, 'index.html'))) {
    app.use(express.static(distDir));
    app.get('*', (_req, res) => res.sendFile(path.join(distDir, 'index.html')));
  }

  app.use(errorHandler);
  return app;
}
