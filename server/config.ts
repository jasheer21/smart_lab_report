const num = (name: string, fallback: number): number => {
  const raw = process.env[name];
  if (raw == null || raw.trim() === '') return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) throw new Error(`Env var ${name} must be a positive number`);
  return value;
};

const list = (name: string): string[] =>
  (process.env[name] || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

export const config = {
  port: num('API_PORT', num('PORT', 4000)),
  // AI Studio injects GEMINI_API_KEY; SMART_REPORT_GEMINI_API_KEY wins when both are set.
  geminiKey: (process.env.SMART_REPORT_GEMINI_API_KEY || process.env.GEMINI_API_KEY || '').trim(),
  geminiModel: (process.env.SMART_REPORT_GEMINI_MODEL || 'gemini-2.5-flash').trim(),
  geminiTimeoutMs: num('SMART_REPORT_GEMINI_TIMEOUT_MS', 90_000),
  historyOrders: num('SMART_REPORT_HISTORY_ORDERS', 5),
  maxFileBytes: num('LAB_REPORT_MAX_FILE_MB', 15) * 1024 * 1024,
  maxBatchFiles: num('LAB_REPORT_MAX_BATCH_FILES', 10),
  reportTtlMs: num('REPORT_STORE_TTL_MINUTES', 120) * 60 * 1000,
  reportStoreMax: num('REPORT_STORE_MAX_ENTRIES', 500),
  ocrCacheMax: num('OCR_CACHE_MAX_ENTRIES', 200),
  rateLimitPerMinute: num('RATE_LIMIT_PER_MINUTE', 30),
  corsOrigins: list('CORS_ORIGIN'),
};

export const isPlaceholderKey = (key: string) => !key || /^MY_.*KEY$/i.test(key);
