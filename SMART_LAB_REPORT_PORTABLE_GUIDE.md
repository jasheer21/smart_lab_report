# Smart Lab Report — Portable Implementation Guide

A self-contained guide to rebuild the **Smart Lab Report** feature in another project.

Stack: **React (TypeScript) + Node.js / Express + PostgreSQL (Knex) + Google Cloud Storage**, with
**pdf-parse** for text extraction and optional **Gemini Vision** fallback for scanned PDFs.

> The feature turns an uploaded lab result PDF into a patient-friendly report: biomarkers grouped
> into panels, in-range / out-of-range status, plain-language explanations, questions for the doctor,
> and trend history from the patient's previous reports.

---

## 1. How it works

```
Staff uploads PDF ──► POST /api/lab-reports (multipart)
                         │
                         ├─ store PDF in GCS  (lab-reports/{bookingId}/...)
                         └─ upsert row in lab_reports (encrypted gcs path)
                                         + mark booking/order completed

Staff/patient clicks "Smart Report" ──► GET /api/reports/smart/:orderId/:patientId
                         │
                         ├─ auth + permission + patient-ownership check
                         ├─ list PDFs for (order, patient)
                         ├─ download from GCS ──► extract text (pdf-parse → Gemini fallback)
                         ├─ parse text against biomarker catalog ──► markers + status
                         ├─ repeat for up to 5 past orders of the same patient (trend history)
                         └─ build payload: summary, panels, questions, disclaimer

React modal ──► summary cards, panel/marker cards, search, abnormal filter, trend chart, print
```

Design decisions:

| Decision | Reason |
|---|---|
| Smart report is computed **on demand**, not stored | Always reflects the latest uploaded PDF; no stale data after re-upload/delete. |
| Text extraction cached by **SHA-256 of the PDF** | Same PDF is never parsed twice (per process). Use Redis for multi-instance deployments. |
| Biomarkers matched against a **catalog** (aliases + units) | Deterministic, auditable, no LLM hallucinations in results. |
| Catalog reference range preferred over printed range | Consistent status across different labs. |
| Only store the **GCS object path** (encrypted), never a signed URL | Signed URLs expire; paths don't. |

---

## 2. Folder structure

```
backend/
  migrations/
    20260101000000_create_lab_reports.js
  src/
    config/env.js
    db/knex.js
    helpers/encryption.js
    helpers/appError.js
    middlewares/auth.js               (existing in your project)
    middlewares/requirePermission.js
    middlewares/validate.js
    utils/gcs.js
    modules/lab-reports/
      labReport.routes.js
      labReport.controller.js
      labReport.repository.js
      labReport.schema.js
    modules/smart-report/
      smartReport.routes.js
      smartReport.controller.js
      smartReport.service.js
      smartReport.repository.js
      smartReport.catalog.js
      smartReport.parser.js
      smartReport.builder.js
      smartReport.schema.js
      ocr.service.js
      __tests__/smartReport.parser.test.js
frontend/
  src/api/httpClient.ts               (existing in your project)
  src/api/smartReport.api.ts
  src/api/labReport.api.ts
  src/components/smart-report/SmartReportModal.tsx
  src/components/smart-report/TrendChart.tsx
  src/components/smart-report/MarkerCard.tsx
  src/components/smart-report/LabReportUploadButton.tsx
```

---

## 3. Dependencies

```bash
# backend
npm i express knex pg joi multer @google-cloud/storage pdf-parse axios
npm i -D jest

# frontend (axios only if your project doesn't already have an HTTP client)
npm i axios lucide-react
```

> `pdf-parse` v2 exposes `PDFParse` (class API). If you use v1 (`require('pdf-parse')(buffer)`),
> adapt `ocr.service.js` accordingly — see the comment there.

---

## 4. Environment variables

```dotenv
DATABASE_URL=postgres://user:pass@localhost:5432/app

GCS_BUCKET=your-bucket
GCS_PROJECT_ID=your-project
# Either GOOGLE_APPLICATION_CREDENTIALS=/path/key.json or workload identity

# 32-byte key, base64 (openssl rand -base64 32)
FILE_PATH_ENCRYPTION_KEY=

# Optional: scanned-PDF fallback
SMART_REPORT_GEMINI_API_KEY=
SMART_REPORT_GEMINI_MODEL=gemini-2.0-flash

SMART_REPORT_HISTORY_ORDERS=5
LAB_REPORT_MAX_FILE_MB=15
```

---

## 5. Database

### 5.1 Assumed existing tables

The feature plugs into your order model. Minimum columns it relies on:

```sql
-- orders:    id, patient_id (primary account), order_number, order_date, scheduled_date, status
-- bookings:  id, order_id, patient_id (actual patient; family member or primary), test_id, status
-- patients:  id, parent_patient_id (nullable; family member → primary account)
```

Rename columns in the repository files if your schema differs.

### 5.2 Migration — `backend/migrations/20260101000000_create_lab_reports.js`

```js
/** @param {import('knex').Knex} knex */
exports.up = async (knex) => {
  await knex.schema.createTable('lab_reports', (t) => {
    t.increments('id').primary();
    t.integer('booking_id').notNullable().references('id').inTable('bookings').onDelete('CASCADE');
    t.integer('test_id').notNullable();
    t.text('file_path_enc').nullable(); // encrypted GCS object path
    t.string('file_sha256', 64).nullable(); // lets you skip re-download/parse when unchanged
    t.string('upload_group_id', 36).nullable(); // one upload applied to many tests
    t.boolean('is_deleted').notNullable().defaultTo(false);
    t.timestamp('uploaded_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.integer('uploaded_by').nullable();
    t.timestamps(true, true);
  });

  await knex.raw(`
    CREATE UNIQUE INDEX lab_reports_booking_test_active_uq
      ON lab_reports (booking_id, test_id) WHERE is_deleted = false
  `);
  await knex.schema.alterTable('lab_reports', (t) => {
    t.index(['booking_id'], 'lab_reports_booking_idx');
  });
  // Used by the smart-report lookups
  await knex.schema.alterTable('bookings', (t) => {
    t.index(['order_id', 'patient_id'], 'bookings_order_patient_idx');
  });
  await knex.schema.alterTable('orders', (t) => {
    t.index(['patient_id', 'order_date'], 'orders_patient_date_idx');
  });
};

/** @param {import('knex').Knex} knex */
exports.down = async (knex) => {
  await knex.schema.alterTable('orders', (t) => t.dropIndex(['patient_id', 'order_date'], 'orders_patient_date_idx'));
  await knex.schema.alterTable('bookings', (t) => t.dropIndex(['order_id', 'patient_id'], 'bookings_order_patient_idx'));
  await knex.schema.dropTableIfExists('lab_reports');
};
```

### 5.3 Permission seed (adapt to your RBAC)

```sql
INSERT INTO permissions (key, description) VALUES
  ('LAB_REPORT_UPLOAD', 'Upload lab result PDFs'),
  ('SMART_REPORT_VIEW', 'View smart lab report')
ON CONFLICT (key) DO NOTHING;
```

---

## 6. Backend — shared helpers

### 6.1 `src/config/env.js`

```js
const required = (name) => {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var ${name}`);
  return v;
};

module.exports = {
  gcsBucket: required('GCS_BUCKET'),
  gcsProjectId: process.env.GCS_PROJECT_ID,
  fileKey: required('FILE_PATH_ENCRYPTION_KEY'),
  geminiKey: (process.env.SMART_REPORT_GEMINI_API_KEY || '').trim(),
  geminiModel: (process.env.SMART_REPORT_GEMINI_MODEL || 'gemini-2.0-flash').trim(),
  historyOrders: Number(process.env.SMART_REPORT_HISTORY_ORDERS || 5),
  labReportMaxBytes: Number(process.env.LAB_REPORT_MAX_FILE_MB || 15) * 1024 * 1024,
};
```

### 6.2 `src/db/knex.js`

```js
const knex = require('knex');

module.exports = knex({
  client: 'pg',
  connection: process.env.DATABASE_URL,
  pool: { min: 0, max: 10 },
});
```

### 6.3 `src/helpers/appError.js`

```js
class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
  }
}

module.exports = { AppError };
```

Central error handler (register last in `app.js`):

```js
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  const status = err.statusCode || 500;
  if (status >= 500) console.error(err);
  res.status(status).json({
    success: false,
    message: status >= 500 ? 'Internal server error' : err.message,
  });
});
```

### 6.4 `src/helpers/encryption.js` (AES-256-GCM)

```js
const crypto = require('crypto');
const { fileKey } = require('../config/env');

const KEY = Buffer.from(fileKey, 'base64');
if (KEY.length !== 32) throw new Error('FILE_PATH_ENCRYPTION_KEY must be 32 bytes (base64)');

function encrypt(plain) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', KEY, iv);
  const data = Buffer.concat([cipher.update(String(plain), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv, tag, data].map((b) => b.toString('base64')).join('.');
}

function decrypt(payload) {
  if (!payload) return null;
  const [iv, tag, data] = String(payload).split('.').map((p) => Buffer.from(p, 'base64'));
  const decipher = crypto.createDecipheriv('aes-256-gcm', KEY, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
}

module.exports = { encrypt, decrypt };
```

### 6.5 `src/middlewares/validate.js`

```js
module.exports = (schema, source = 'body') => (req, res, next) => {
  const { error, value } = schema.validate(req[source], { abortEarly: false, stripUnknown: true });
  if (error) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: error.details.map((d) => d.message),
    });
  }
  req[source] = value;
  return next();
};
```

### 6.6 `src/middlewares/requirePermission.js`

```js
/**
 * Assumes your auth middleware sets req.user.permissions (array of keys).
 * Replace with your project's RBAC lookup.
 */
module.exports = (...keys) => (req, res, next) => {
  const granted = new Set(req.user?.permissions || []);
  if (keys.some((k) => granted.has(k))) return next();
  return res.status(403).json({ success: false, message: 'Forbidden' });
};
```

### 6.7 `src/utils/gcs.js`

```js
const crypto = require('crypto');
const { Storage } = require('@google-cloud/storage');
const { gcsBucket, gcsProjectId } = require('../config/env');

const bucket = new Storage({ projectId: gcsProjectId }).bucket(gcsBucket);

async function uploadBuffer(buffer, folder, { contentType = 'application/pdf', ext = 'pdf' } = {}) {
  const path = `${folder}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
  await bucket.file(path).save(buffer, { contentType, resumable: false });
  return path;
}

async function downloadBuffer(path) {
  const [buffer] = await bucket.file(path).download();
  return buffer;
}

async function signedReadUrl(path, seconds = 300) {
  const [url] = await bucket.file(path).getSignedUrl({
    version: 'v4',
    action: 'read',
    expires: Date.now() + seconds * 1000,
  });
  return url;
}

module.exports = { uploadBuffer, downloadBuffer, signedReadUrl };
```

---

## 7. Backend — lab report upload

### 7.1 `modules/lab-reports/labReport.schema.js`

```js
const Joi = require('joi');

const uploadLabReportSchema = Joi.object({
  // multipart field: JSON string of [{ bookingId, testId }]
  items: Joi.string().required(),
});

const itemsSchema = Joi.array()
  .items(Joi.object({
    bookingId: Joi.number().integer().positive().required(),
    testId: Joi.number().integer().positive().required(),
  }))
  .min(1)
  .max(50)
  .required();

module.exports = { uploadLabReportSchema, itemsSchema };
```

### 7.2 `modules/lab-reports/labReport.repository.js`

```js
const crypto = require('crypto');
const db = require('../../db/knex');
const { encrypt } = require('../../helpers/encryption');

const BOOKING_COMPLETED = 10;
const BOOKING_CANCELLED = -1;
const ORDER_COMPLETED = 2;

/**
 * One transaction per upload action:
 * upsert lab_reports rows → mark bookings completed → complete order when all bookings done.
 */
async function saveLabReports({ items, filePath, fileSha256, userId }) {
  const groupId = crypto.randomUUID();
  const encPath = encrypt(filePath);

  return db.transaction(async (trx) => {
    const saved = [];
    for (const { bookingId, testId } of items) {
      const existing = await trx('lab_reports')
        .where({ booking_id: bookingId, test_id: testId, is_deleted: false })
        .first('id');

      const row = {
        file_path_enc: encPath,
        file_sha256: fileSha256,
        upload_group_id: groupId,
        uploaded_at: trx.fn.now(),
        uploaded_by: userId,
        updated_at: trx.fn.now(),
      };

      const [report] = existing
        ? await trx('lab_reports').where('id', existing.id).update(row).returning(['id', 'booking_id', 'test_id'])
        : await trx('lab_reports')
          .insert({ ...row, booking_id: bookingId, test_id: testId })
          .returning(['id', 'booking_id', 'test_id']);

      await trx('bookings').where('id', bookingId).update({ status: BOOKING_COMPLETED });
      saved.push(report);
    }

    const orderIds = await trx('bookings')
      .whereIn('id', items.map((i) => i.bookingId))
      .distinct('order_id')
      .pluck('order_id');

    for (const orderId of orderIds) {
      const { pending } = await trx('bookings')
        .where('order_id', orderId)
        .whereNot('status', BOOKING_CANCELLED)
        .whereNot('status', BOOKING_COMPLETED)
        .count({ pending: '*' })
        .first();
      if (Number(pending) === 0) {
        await trx('orders').where('id', orderId).update({ status: ORDER_COMPLETED });
      }
    }

    return { groupId, reports: saved };
  });
}

async function assertBookingsExist(items) {
  const ids = [...new Set(items.map((i) => i.bookingId))];
  const found = await db('bookings').whereIn('id', ids).pluck('id');
  return found.length === ids.length;
}

module.exports = { saveLabReports, assertBookingsExist };
```

### 7.3 `modules/lab-reports/labReport.controller.js`

```js
const crypto = require('crypto');
const { AppError } = require('../../helpers/appError');
const { uploadBuffer } = require('../../utils/gcs');
const { itemsSchema } = require('./labReport.schema');
const repo = require('./labReport.repository');

const PDF_MAGIC = Buffer.from('%PDF-');

async function upload(req, res, next) {
  try {
    if (!req.file) throw new AppError('PDF file is required', 400);
    // Don't trust mimetype alone
    if (!req.file.buffer.subarray(0, 5).equals(PDF_MAGIC)) {
      throw new AppError('Only PDF files are allowed', 400);
    }

    let items;
    try {
      items = JSON.parse(req.body.items);
    } catch {
      throw new AppError('items must be a JSON array', 400);
    }
    const { error, value } = itemsSchema.validate(items);
    if (error) throw new AppError(error.message, 400);
    if (!(await repo.assertBookingsExist(value))) throw new AppError('Booking not found', 404);

    const fileSha256 = crypto.createHash('sha256').update(req.file.buffer).digest('hex');
    const folder = `lab-reports/${value[0].bookingId}`;
    const filePath = await uploadBuffer(req.file.buffer, folder);

    const result = await repo.saveLabReports({
      items: value,
      filePath,
      fileSha256,
      userId: req.user?.id ?? null,
    });

    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

module.exports = { upload };
```

### 7.4 `modules/lab-reports/labReport.routes.js`

```js
const express = require('express');
const multer = require('multer');
const { protect } = require('../../middlewares/auth');
const requirePermission = require('../../middlewares/requirePermission');
const validate = require('../../middlewares/validate');
const { labReportMaxBytes } = require('../../config/env');
const { uploadLabReportSchema } = require('./labReport.schema');
const controller = require('./labReport.controller');

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: labReportMaxBytes, files: 1 },
  fileFilter: (req, file, cb) => cb(null, file.mimetype === 'application/pdf'),
});

router.use(protect);

/**
 * @swagger
 * /api/lab-reports:
 *   post:
 *     summary: Upload one lab result PDF for one or more booking tests
 *     tags: [Lab Reports]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [items, file]
 *             properties:
 *               items:
 *                 type: string
 *                 example: '[{"bookingId":1,"testId":7}]'
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201: { description: Report saved; bookings marked completed }
 *       400: { description: Invalid file or items }
 *       403: { description: Missing LAB_REPORT_UPLOAD permission }
 *       404: { description: Booking not found }
 */
router.post(
  '/',
  requirePermission('LAB_REPORT_UPLOAD'),
  upload.single('file'),
  validate(uploadLabReportSchema, 'body'),
  controller.upload
);

module.exports = router;
```

---

## 8. Backend — text extraction (OCR)

### 8.1 `modules/smart-report/ocr.service.js`

```js
const crypto = require('crypto');
const axios = require('axios');
const { AppError } = require('../../helpers/appError');
const { geminiKey, geminiModel } = require('../../config/env');

// pdf-parse v2 bundles pdf.js which expects DOMMatrix in Node.
if (typeof globalThis.DOMMatrix === 'undefined') {
  globalThis.DOMMatrix = class DOMMatrix {
    constructor() { Object.assign(this, { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0, is2D: true, isIdentity: true }); }
    multiplySelf() { return this; }
    preMultiplySelf() { return this; }
    translateSelf() { return this; }
    scaleSelf() { return this; }
    invertSelf() { return this; }
    transformPoint(p) { return p || { x: 0, y: 0, z: 0, w: 1 }; }
  };
}
const { PDFParse } = require('pdf-parse');
// pdf-parse v1 alternative:
//   const pdfParse = require('pdf-parse');
//   const { text } = await pdfParse(buffer);

const MIN_USEFUL_TEXT_CHARS = 400;
const MIN_ACCEPTABLE_TEXT_CHARS = 80;

async function extractText(pdfBuffer) {
  if (!Buffer.isBuffer(pdfBuffer) || !pdfBuffer.length) throw new AppError('Empty PDF', 400);

  let text = '';
  let method = 'pdf-text';
  try {
    const parser = new PDFParse({ data: pdfBuffer });
    const result = await parser.getText();
    text = String(result?.text || '').trim();
    await parser.destroy?.();
  } catch (err) {
    console.warn('[smart-report] pdf-parse failed:', err.message);
  }

  if (text.length < MIN_USEFUL_TEXT_CHARS) {
    const vision = await tryGeminiVision(pdfBuffer);
    if (vision && vision.length > text.length) {
      text = vision;
      method = 'gemini-vision';
    }
  }

  if (text.length < MIN_ACCEPTABLE_TEXT_CHARS) {
    throw new AppError('Could not extract readable text from lab report PDF', 422);
  }

  return {
    text: normalize(text),
    method,
    fingerprint: crypto.createHash('sha256').update(pdfBuffer).digest('hex'),
  };
}

function normalize(text) {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

async function tryGeminiVision(pdfBuffer) {
  if (!geminiKey) return null;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent`;
  try {
    const { data } = await axios.post(
      url,
      {
        contents: [{
          parts: [
            {
              text: 'Extract every lab test name, numeric result, unit, and reference range from this lab report. '
                + 'Return plain text only, one result per line as: TestName | value | unit | reference',
            },
            { inline_data: { mime_type: 'application/pdf', data: pdfBuffer.toString('base64') } },
          ],
        }],
      },
      // Header keeps the key out of URLs/access logs
      { timeout: 90_000, headers: { 'x-goog-api-key': geminiKey } }
    );
    const parts = data?.candidates?.[0]?.content?.parts || [];
    return parts.map((p) => p?.text || '').join('\n').trim() || null;
  } catch (err) {
    console.warn('[smart-report] Gemini fallback failed:', err.message);
    return null;
  }
}

module.exports = { extractText, normalize };
```

---

## 9. Backend — biomarker catalog

### 9.1 `modules/smart-report/smartReport.catalog.js`

Each marker defines: panel, friendly name, **aliases** (exact label variants seen on lab PDFs — longest
first wins), **unitHints**, preferred **referenceRange**, `higherIsBetter`, explanations per status
and doctor questions. Add markers as you meet new lab formats.

```js
const DISCLAIMER =
  'Educational information only, not a diagnosis. Please discuss your results with a licensed clinician.';

const PANEL_ORDER = [
  'glycemic', 'lipid', 'iron', 'vitamins', 'thyroid',
  'inflammation', 'minerals', 'blood', 'kidney', 'liver',
];

/** Small helper to keep entries short. */
const m = (def) => ({
  questions: {
    high: [`What could be causing my ${def.name} to be high?`, 'Do I need a repeat test or any follow-up?'],
    low: [`What could be causing my ${def.name} to be low?`, 'Do I need a repeat test or any follow-up?'],
  },
  explanation: {
    high: `Your ${def.name} is above the usual range. It's worth discussing this with your doctor.`,
    low: `Your ${def.name} is below the usual range. It's worth discussing this with your doctor.`,
    normal: `Your ${def.name} is within the usual range. No action is needed for this result.`,
  },
  ...def,
});

const MARKERS = {
  hba1c: m({
    panel: 'glycemic', panelName: 'Blood sugar', name: 'HbA1c (average blood sugar)',
    aliases: ['HbA1c (Glycosylated hemoglobin A1)', 'Glycated Haemoglobin (HbA1C)', 'Glycated Haemoglobin', 'HbA1C', 'HbA1c'],
    unitHints: ['%'],
    referenceRange: { low: 4, high: 5.6 },
    explanation: {
      high: 'Your HbA1c reflects your average blood sugar over ~3 months and is above the usual range. Small diet and activity changes often help.',
      low: 'Your HbA1c is below the usual range. Discuss this with your doctor if you have symptoms of low blood sugar.',
      normal: 'Your HbA1c is within the usual range. No action is needed for this result.',
    },
    questions: {
      high: ["Does this HbA1c mean I'm at risk of diabetes?", 'Should I repeat this test, and when?'],
      low: ['Why might my HbA1c be low?', 'Do I need any follow-up for this result?'],
    },
  }),
  glucose_fasting: m({
    panel: 'glycemic', panelName: 'Blood sugar', name: 'Fasting glucose',
    aliases: ['Glucose Fasting (FBS), Fluoride Plasma', 'Glucose Fasting (FBS)', 'Fasting Blood Sugar', 'Fasting glucose', 'FBS'],
    unitHints: ['mg/dl', 'mg/dL'],
    referenceRange: { low: 70, high: 99 },
  }),
  cholesterol_total: m({
    panel: 'lipid', panelName: 'Cholesterol & fats', name: 'Total cholesterol',
    aliases: ['Cholesterol Total', 'Cholesterol, Total', 'Total cholesterol'],
    unitHints: ['mg/dl', 'mg/dL'],
    referenceRange: { low: null, high: 200 },
  }),
  triglycerides: m({
    panel: 'lipid', panelName: 'Cholesterol & fats', name: 'Triglycerides',
    aliases: ['Triglyceride Serum', 'Triglycerides', 'Triglyceride'],
    unitHints: ['mg/dl', 'mg/dL'],
    referenceRange: { low: null, high: 150 },
  }),
  ldl: m({
    panel: 'lipid', panelName: 'Cholesterol & fats', name: "LDL ('bad' cholesterol)",
    aliases: ['Cholesterol LDL Serum', 'LDL Cholesterol (calc.)', 'LDL Cholesterol', 'LDL Serum'],
    unitHints: ['mg/dl', 'mg/dL'],
    referenceRange: { low: null, high: 100 },
  }),
  hdl: m({
    panel: 'lipid', panelName: 'Cholesterol & fats', name: "HDL ('good' cholesterol)",
    aliases: ['Cholesterol HDL Serum', 'HDL Cholesterol', 'HDL Serum'],
    unitHints: ['mg/dl', 'mg/dL'],
    referenceRange: { low: 50, high: null },
    higherIsBetter: true,
  }),
  vitamin_d: m({
    panel: 'vitamins', panelName: 'Vitamins', name: 'Vitamin D',
    aliases: ['25-OH Vitamin D (Total)', '25 Hydroxy Vitamin D', 'Vitamin D Total', 'Vitamin D'],
    unitHints: ['ng/ml', 'ng/mL'],
    referenceRange: { low: 30, high: 100 },
  }),
  vitamin_b12: m({
    panel: 'vitamins', panelName: 'Vitamins', name: 'Vitamin B12',
    aliases: ['Vitamin B12 (Cyanocobalamin)', 'Vitamin B12', 'Cyanocobalamin'],
    unitHints: ['pg/ml', 'pg/mL'],
    referenceRange: { low: 200, high: 900 },
  }),
  tsh: m({
    panel: 'thyroid', panelName: 'Thyroid', name: 'TSH',
    aliases: ['Thyroid Stimulating Hormone (TSH)', 'TSH Ultrasensitive', 'TSH'],
    unitHints: ['uIU/mL', 'uiu/ml', 'mIU/L'],
    referenceRange: { low: 0.4, high: 4.0 },
  }),
  ferritin: m({
    panel: 'iron', panelName: 'Iron', name: 'Ferritin',
    aliases: ['Ferritin Serum', 'Ferritin'],
    unitHints: ['ng/ml', 'ng/mL'],
    referenceRange: { low: 30, high: 400 },
  }),
  hemoglobin: m({
    panel: 'blood', panelName: 'Blood count', name: 'Hemoglobin',
    aliases: ['Haemoglobin (Hb)', 'Hemoglobin (Hb)', 'Haemoglobin', 'Hemoglobin'],
    unitHints: ['g/dl', 'g/dL'],
    referenceRange: { low: 12, high: 17.5 },
  }),
  creatinine: m({
    panel: 'kidney', panelName: 'Kidney', name: 'Creatinine',
    aliases: ['Creatinine Serum', 'Serum Creatinine', 'Creatinine'],
    unitHints: ['mg/dl', 'mg/dL'],
    referenceRange: { low: 0.6, high: 1.3 },
  }),
  alt: m({
    panel: 'liver', panelName: 'Liver', name: 'ALT (liver enzyme)',
    aliases: ['ALT (SGPT)', 'SGPT (ALT)', 'Alanine Aminotransferase', 'SGPT', 'ALT'],
    unitHints: ['U/L'],
    referenceRange: { low: null, high: 41 },
  }),
};

module.exports = { DISCLAIMER, PANEL_ORDER, MARKERS };
```

> **Clinical ranges must be reviewed by your medical team.** Values above are typical adult ranges
> for illustration. For sex/age-specific ranges, extend `referenceRange` to a function
> `(patient) => ({ low, high })` and pass the patient into the parser.

---

## 10. Backend — parser

### 10.1 `modules/smart-report/smartReport.parser.js`

```js
const { MARKERS } = require('./smartReport.catalog');

const KNOWN_UNITS = [
  'ng/ml', 'ng/mL', 'pg/ml', 'pg/mL', 'mg/dl', 'mg/dL', 'mg /dL', 'mg/l', 'mg/L',
  'ug/dl', 'ug/dL', 'μg/dL', 'µg/dL', 'uiu/ml', 'uIU/mL', 'mIU/L', 'nmol/L', 'mmol/L',
  'U/L', 'g/dl', 'g/dL', 'mm', '%', 'fL', 'pg', '10^9/L', '10^12/L', 'ml/min/1.73m2', 'Ratio',
];

const escapeRegex = (v) => String(v).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const UNIT_PATTERN = [...KNOWN_UNITS]
  .sort((a, b) => b.length - a.length)
  .map((u) => escapeRegex(u).replace(/\\ /g, '\\s*').replace(/ /g, '\\s*'))
  .join('|');

/**
 * @param {string} text normalized extracted text
 * @returns {{ meta: object, markers: Array<object> }}
 */
function parseLabReportText(text) {
  const meta = extractReportMeta(text);
  const compact = String(text || '').replace(/\n+/g, ' ').replace(/\s{2,}/g, ' ');
  const markers = [];

  for (const [markerId, def] of Object.entries(MARKERS)) {
    const hit = matchMarker(compact, def);
    if (!hit) continue;

    const range = def.referenceRange
      ? { low: def.referenceRange.low ?? null, high: def.referenceRange.high ?? null }
      : { low: hit.rangeLow, high: hit.rangeHigh };

    markers.push({
      markerId,
      name: def.name,
      panel: def.panel,
      panelName: def.panelName,
      value: hit.value,
      unit: normalizeUnit(hit.unit || def.unitHints?.[0] || ''),
      referenceRange: range,
      printedRange: { low: hit.rangeLow, high: hit.rangeHigh },
      status: resolveStatus(hit.value, range),
      originalName: hit.originalName,
      confidence: hit.confidence,
      lab: meta.labName,
    });
  }

  return { meta, markers };
}

function matchMarker(compact, def) {
  const aliases = [...(def.aliases || [])].sort((a, b) => b.length - a.length);
  const hints = (def.unitHints || []).map(escapeRegex).join('|');
  const unitGroup = hints ? `(?:${hints}|${UNIT_PATTERN})` : `(?:${UNIT_PATTERN})`;
  const allowedUnits = new Set((def.unitHints || []).map(normalizeUnit));
  const valueRe = new RegExp(
    `^[\\s\\S]{0,120}?([<>]?\\s*\\d+(?:\\.\\d+)?)\\s*(${unitGroup})(?=[\\s,;)]|$)`,
    'i'
  );

  for (const alias of aliases) {
    // Word-boundary so "ALT" doesn't match inside "ALTERNATIVE"
    const aliasRe = new RegExp(`(?<![A-Za-z])${escapeRegex(alias).replace(/\s+/g, '\\s+')}(?![A-Za-z])`, 'ig');
    let match;
    while ((match = aliasRe.exec(compact)) !== null) {
      const from = match.index + match[0].length;
      const window = compact.slice(from, from + 160);
      const m = window.match(valueRe);
      if (!m) continue;

      const value = parseFloat(m[1].replace(/[<>\s]/g, ''));
      const unit = String(m[2] || '').trim();
      if (!Number.isFinite(value) || !unit) continue;
      // Prevents "Glycated Haemoglobin 6.1 %" being read as Hemoglobin (g/dL)
      if (allowedUnits.size && !allowedUnits.has(normalizeUnit(unit))) continue;

      const after = window.slice(m.index + m[0].length, m.index + m[0].length + 140);
      const range = parseNearbyRange(after);

      return {
        value,
        unit,
        originalName: alias,
        confidence: alias.length >= 12 ? 0.95 : 0.85,
        rangeLow: range?.low ?? null,
        rangeHigh: range?.high ?? null,
      };
    }
  }
  return null;
}

function parseNearbyRange(snippet) {
  const s = String(snippet || '');
  let m = s.match(/(\d+(?:\.\d+)?)\s*[-–—]\s*(\d+(?:\.\d+)?)/);
  if (m) return { low: parseFloat(m[1]), high: parseFloat(m[2]) };
  m = s.match(/<\s*=?\s*(\d+(?:\.\d+)?)/);
  if (m) return { low: null, high: parseFloat(m[1]) };
  m = s.match(/>\s*=?\s*(\d+(?:\.\d+)?)/);
  if (m) return { low: parseFloat(m[1]), high: null };
  return null;
}

function resolveStatus(value, { low, high }) {
  if (low != null && value < low) return 'low';
  if (high != null && value > high) return 'high';
  return 'normal';
}

function normalizeUnit(unit) {
  return String(unit || '').replace(/[μµ]/g, 'u').replace(/\s+/g, '').toLowerCase();
}

function extractReportMeta(text) {
  const src = String(text || '');
  const group = (re) => src.match(re)?.[1]?.trim() || null;

  // Add your partner labs' names here first; the generic pattern is a fallback.
  const labName =
    group(/(Gulf Diagnostics Lab)/i) ||
    group(/([A-Z][A-Za-z0-9&.-]*(?: [A-Za-z0-9&.-]+){0,6} (?:Laboratory|Diagnostics|Lab))(?!\s*ID)/);
  return {
    labName: labName ? labName.replace(/\s+/g, ' ') : null,
    labTag: labName ? labName.split(/\s+/)[0].slice(0, 12) : null,
    reportingDate: group(/Reporting Date\s*:\s*([0-9/,\s:APMapm-]+)/i) || group(/Collection Date\s*:\s*([0-9/,\s:APMapm-]+)/i),
    // Single-space-separated words, so "Name : JOHN DOE    Lab ID : X" stops before "Lab ID"
    patientName: group(/Name\s*:\s*([A-Za-z][A-Za-z.'-]*(?: [A-Za-z][A-Za-z.'-]*){0,6})/i),
    labId: group(/Lab ID\s*:\s*([A-Z0-9-]+)/i),
  };
}

module.exports = { parseLabReportText, resolveStatus, parseNearbyRange, normalizeUnit, extractReportMeta };
```

---

## 11. Backend — builder

### 11.1 `modules/smart-report/smartReport.builder.js`

```js
const crypto = require('crypto');
const { DISCLAIMER, MARKERS, PANEL_ORDER } = require('./smartReport.catalog');

/**
 * @param {{ currentMarkers: object[], meta: object, historyByOrder: Array<{orderId:number, reportingDate:string|null, markers:object[]}> }} p
 */
function buildSmartReportPayload({ currentMarkers = [], meta = {}, historyByOrder = [] }) {
  const markers = currentMarkers.map((mk) => {
    const def = MARKERS[mk.markerId];
    return {
      markerId: mk.markerId,
      name: mk.name,
      panel: mk.panel,
      panelName: mk.panelName,
      value: mk.value,
      unit: mk.unit,
      referenceRange: mk.referenceRange,
      status: mk.status,
      explanation: def?.explanation?.[mk.status] || def?.explanation?.normal || `Your ${mk.name} result has been recorded.`,
      lab: mk.lab || meta.labName || null,
      labTag: meta.labTag || null,
      originalName: mk.originalName,
      confidence: mk.confidence,
      needsReview: (mk.confidence ?? 1) < 0.9,
      history: historyFor(mk.markerId, historyByOrder),
    };
  });

  const byPanel = new Map();
  for (const mk of markers) {
    if (!byPanel.has(mk.panel)) byPanel.set(mk.panel, { panel: mk.panel, panelName: mk.panelName, markers: [] });
    byPanel.get(mk.panel).markers.push(mk);
  }
  const panels = [
    ...PANEL_ORDER.filter((id) => byPanel.has(id)),
    ...[...byPanel.keys()].filter((id) => !PANEL_ORDER.includes(id)),
  ].map((id) => byPanel.get(id));

  const abnormal = markers.filter((mk) => mk.status !== 'normal');

  return {
    reportId: `r_${crypto.randomBytes(6).toString('hex')}`,
    createdAt: new Date().toISOString(),
    summary: {
      total: markers.length,
      inRange: markers.length - abnormal.length,
      outOfRange: abnormal.length,
      needsReview: markers.filter((mk) => mk.needsReview).length,
      sourceLabs: [...new Set(markers.map((mk) => mk.lab).filter(Boolean))],
      reportingDate: meta.reportingDate || null,
      patientName: meta.patientName || null,
      orderNumber: meta.orderNumber || null,
    },
    disclaimer: DISCLAIMER,
    panels,
    questions: abnormal.map((mk) => ({
      markerId: mk.markerId,
      name: mk.name,
      status: mk.status,
      questions: MARKERS[mk.markerId]?.questions?.[mk.status] || [
        `What could be causing my ${mk.name} to be ${mk.status}?`,
        'Do I need a repeat test or any follow-up?',
      ],
    })),
    pastOrders: historyByOrder.map((h) => ({
      orderId: h.orderId,
      reportingDate: h.reportingDate,
      markerCount: h.markers.length,
    })),
  };
}

function historyFor(markerId, historyByOrder) {
  return historyByOrder
    .map((order) => {
      const hit = order.markers.find((mk) => mk.markerId === markerId);
      return hit
        ? { orderId: order.orderId, date: order.reportingDate, value: hit.value, unit: hit.unit, status: hit.status }
        : null;
    })
    .filter(Boolean)
    .reverse(); // oldest → newest for charting
}

module.exports = { buildSmartReportPayload };
```

---

## 12. Backend — repository, service, controller, routes

### 12.1 `modules/smart-report/smartReport.repository.js`

```js
const db = require('../../db/knex');
const { decrypt } = require('../../helpers/encryption');

async function findOrder(orderId) {
  return db('orders')
    .where('id', orderId)
    .first('id', 'patient_id as primaryPatientId', 'order_number as orderNumber', 'order_date as orderDate', 'scheduled_date as scheduledDate');
}

/** Patient belongs to the order if a booking is theirs, or they are the primary account holder. */
async function isPatientOnOrder(orderId, patientId, primaryPatientId) {
  if (Number(primaryPatientId) === Number(patientId)) return true;
  const hit = await db('bookings').where({ order_id: orderId, patient_id: patientId }).first('id');
  return Boolean(hit);
}

/**
 * Report files for ONE patient on ONE order (never mix family members).
 * The primary patient's own bookings may have patient_id = primary id.
 */
async function listReportFiles(orderId, patientId) {
  const rows = await db('bookings as b')
    .join('lab_reports as lr', 'lr.booking_id', 'b.id')
    .where('b.order_id', orderId)
    .andWhere('b.patient_id', patientId)
    .andWhere('lr.is_deleted', false)
    .whereNotNull('lr.file_path_enc')
    .orderBy('lr.uploaded_at', 'asc')
    .select('lr.id as reportId', 'lr.file_path_enc as filePathEnc', 'lr.file_sha256 as sha256');

  const seen = new Set();
  return rows
    .map((r) => ({ reportId: r.reportId, path: decrypt(r.filePathEnc), sha256: r.sha256 }))
    .filter((r) => r.path && !seen.has(r.path) && seen.add(r.path));
}

/**
 * Past orders for the same patient that have uploaded reports — single query, no N+1.
 * Returns up to `limit` orders, newest first.
 */
async function listPastReportFiles(patientId, excludeOrderId, limit) {
  const rows = await db('bookings as b')
    .join('orders as o', 'o.id', 'b.order_id')
    .join('lab_reports as lr', 'lr.booking_id', 'b.id')
    .where('b.patient_id', patientId)
    .andWhereNot('o.id', excludeOrderId)
    .andWhere('lr.is_deleted', false)
    .whereNotNull('lr.file_path_enc')
    .whereIn(
      'o.id',
      db('orders as o2')
        .join('bookings as b2', 'b2.order_id', 'o2.id')
        .join('lab_reports as lr2', 'lr2.booking_id', 'b2.id')
        .where('b2.patient_id', patientId)
        .andWhereNot('o2.id', excludeOrderId)
        .andWhere('lr2.is_deleted', false)
        .groupBy('o2.id', 'o2.order_date')
        .orderBy('o2.order_date', 'desc')
        .limit(limit)
        .select('o2.id')
    )
    .orderBy('o.order_date', 'desc')
    .select('o.id as orderId', 'o.order_date as orderDate', 'o.scheduled_date as scheduledDate',
      'lr.id as reportId', 'lr.file_path_enc as filePathEnc', 'lr.file_sha256 as sha256');

  const groups = new Map();
  for (const r of rows) {
    if (!groups.has(r.orderId)) {
      groups.set(r.orderId, { orderId: r.orderId, orderDate: r.scheduledDate || r.orderDate, reports: [], seen: new Set() });
    }
    const g = groups.get(r.orderId);
    const path = decrypt(r.filePathEnc);
    if (path && !g.seen.has(path)) {
      g.seen.add(path);
      g.reports.push({ reportId: r.reportId, path, sha256: r.sha256 });
    }
  }
  return [...groups.values()].map(({ seen, ...g }) => g);
}

module.exports = { findOrder, isPatientOnOrder, listReportFiles, listPastReportFiles };
```

### 12.2 `modules/smart-report/smartReport.service.js`

```js
const { AppError } = require('../../helpers/appError');
const { downloadBuffer } = require('../../utils/gcs');
const { historyOrders } = require('../../config/env');
const repo = require('./smartReport.repository');
const { extractText } = require('./ocr.service');
const { parseLabReportText } = require('./smartReport.parser');
const { buildSmartReportPayload } = require('./smartReport.builder');

/**
 * Parsed-result cache keyed by PDF sha256. Replace with Redis when running >1 instance:
 *   key `smart:parsed:{sha256}`, value JSON of parseLabReportText(), TTL ~30 days.
 */
const parsedCache = new Map();
const CACHE_MAX = 200;

async function getSmartReport({ orderId, patientId }) {
  const order = await repo.findOrder(orderId);
  if (!order) throw new AppError('Order not found', 404);

  if (!(await repo.isPatientOnOrder(orderId, patientId, order.primaryPatientId))) {
    throw new AppError('Patient is not associated with this order', 403);
  }

  const files = await repo.listReportFiles(orderId, patientId);
  if (!files.length) throw new AppError('No uploaded lab result PDF found for this patient', 404);

  const current = await parseFiles(files);
  const currentMarkers = mergeMarkers(current.map((p) => p.markers));
  if (!currentMarkers.length) {
    throw new AppError('Lab report was read but no recognized biomarkers were found', 422);
  }

  const past = await repo.listPastReportFiles(patientId, orderId, historyOrders);
  const historyByOrder = [];
  for (const group of past) {
    // History is best-effort: one unreadable old PDF must not break today's report
    try {
      const parsed = await parseFiles(group.reports);
      const markers = mergeMarkers(parsed.map((p) => p.markers));
      if (!markers.length) continue;
      historyByOrder.push({
        orderId: group.orderId,
        reportingDate: mergeMeta(parsed.map((p) => p.meta)).reportingDate || toIsoDate(group.orderDate),
        markers,
      });
    } catch (err) {
      console.warn(`[smart-report] history order ${group.orderId} skipped:`, err.message);
    }
  }

  return buildSmartReportPayload({
    currentMarkers,
    meta: { ...mergeMeta(current.map((p) => p.meta)), orderNumber: order.orderNumber },
    historyByOrder,
  });
}

async function parseFiles(files) {
  return Promise.all(files.map(async (file) => {
    // sha256 stored at upload time lets us skip the GCS download entirely on cache hit
    if (file.sha256 && parsedCache.has(file.sha256)) return parsedCache.get(file.sha256);

    const buffer = await downloadBuffer(file.path);
    const { text, fingerprint } = await extractText(buffer);
    const parsed = parseLabReportText(text);

    if (parsedCache.size >= CACHE_MAX) parsedCache.delete(parsedCache.keys().next().value);
    parsedCache.set(file.sha256 || fingerprint, parsed);
    return parsed;
  }));
}

function mergeMarkers(lists) {
  const byId = new Map();
  for (const list of lists) {
    for (const mk of list || []) {
      const prev = byId.get(mk.markerId);
      if (!prev || (mk.confidence || 0) >= (prev.confidence || 0)) byId.set(mk.markerId, mk);
    }
  }
  return [...byId.values()];
}

function mergeMeta(list) {
  const out = { labName: null, labTag: null, reportingDate: null, patientName: null, labId: null };
  for (const meta of list) {
    for (const k of Object.keys(out)) out[k] = out[k] || meta?.[k] || null;
  }
  return out;
}

const toIsoDate = (d) => (d ? new Date(d).toISOString().slice(0, 10) : null);

module.exports = { getSmartReport };
```

### 12.3 `modules/smart-report/smartReport.schema.js`

```js
const Joi = require('joi');

const smartReportParamsSchema = Joi.object({
  orderId: Joi.number().integer().positive().required(),
  patientId: Joi.number().integer().positive().required(),
});

module.exports = { smartReportParamsSchema };
```

### 12.4 `modules/smart-report/smartReport.controller.js`

```js
const service = require('./smartReport.service');

async function getSmartReport(req, res, next) {
  try {
    const data = await service.getSmartReport({
      orderId: req.params.orderId,
      patientId: req.params.patientId,
    });
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

module.exports = { getSmartReport };
```

### 12.5 `modules/smart-report/smartReport.routes.js`

```js
const express = require('express');
const { protect } = require('../../middlewares/auth');
const requirePermission = require('../../middlewares/requirePermission');
const validate = require('../../middlewares/validate');
const { smartReportParamsSchema } = require('./smartReport.schema');
const controller = require('./smartReport.controller');

const router = express.Router();
router.use(protect);

/**
 * @swagger
 * /api/reports/smart/{orderId}/{patientId}:
 *   get:
 *     summary: Smart lab report generated from uploaded result PDFs
 *     description: |
 *       Downloads the patient's uploaded lab PDFs for the order, extracts text (pdf-parse, optional
 *       Gemini Vision fallback), matches biomarkers against the catalog and returns panels,
 *       summary, doctor questions and trend history from up to N previous orders.
 *     tags: [Reports]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: orderId, required: true, schema: { type: integer } }
 *       - { in: path, name: patientId, required: true, schema: { type: integer } }
 *     responses:
 *       200: { description: Smart report payload }
 *       400: { description: Invalid path params }
 *       403: { description: Missing permission or patient not on order }
 *       404: { description: Order or uploaded PDF not found }
 *       422: { description: PDF unreadable or no recognized biomarkers }
 */
router.get(
  '/smart/:orderId/:patientId',
  requirePermission('SMART_REPORT_VIEW'),
  validate(smartReportParamsSchema, 'params'),
  controller.getSmartReport
);

module.exports = router;
```

> **Patient-app access:** if patients call this endpoint themselves, replace `requirePermission`
> with an ownership check: `req.user.patientId === patientId` or `patientId` is a family member
> whose `parent_patient_id === req.user.patientId`.

### 12.6 Mount in `app.js`

```js
app.use('/api/lab-reports', require('./modules/lab-reports/labReport.routes'));
app.use('/api/reports', require('./modules/smart-report/smartReport.routes'));
```

### 12.7 Response example

```json
{
  "success": true,
  "data": {
    "reportId": "r_4f1a9c2b7d10",
    "createdAt": "2026-09-30T13:10:00.000Z",
    "summary": {
      "total": 6, "inRange": 4, "outOfRange": 2, "needsReview": 1,
      "sourceLabs": ["Gulf Diagnostics Lab"],
      "reportingDate": "28/09/2026 10:15 AM",
      "patientName": "JOHN DOE",
      "orderNumber": "ORD-10231"
    },
    "disclaimer": "Educational information only, not a diagnosis. ...",
    "panels": [
      {
        "panel": "glycemic",
        "panelName": "Blood sugar",
        "markers": [
          {
            "markerId": "hba1c",
            "name": "HbA1c (average blood sugar)",
            "value": 6.1, "unit": "%",
            "referenceRange": { "low": 4, "high": 5.6 },
            "status": "high",
            "explanation": "Your HbA1c reflects your average blood sugar ...",
            "lab": "Gulf Diagnostics Lab", "labTag": "Gulf",
            "originalName": "HbA1c", "confidence": 0.85, "needsReview": true,
            "history": [
              { "orderId": 812, "date": "2026-03-02", "value": 5.8, "unit": "%", "status": "high" }
            ]
          }
        ]
      }
    ],
    "questions": [
      { "markerId": "hba1c", "name": "HbA1c (average blood sugar)", "status": "high",
        "questions": ["Does this HbA1c mean I'm at risk of diabetes?", "Should I repeat this test, and when?"] }
    ],
    "pastOrders": [{ "orderId": 812, "reportingDate": "2026-03-02", "markerCount": 5 }]
  }
}
```

---

## 13. Backend — tests

### 13.1 `modules/smart-report/__tests__/smartReport.parser.test.js`

```js
const { parseLabReportText, resolveStatus, parseNearbyRange } = require('../smartReport.parser');

const SAMPLE = `
Gulf Diagnostics Lab
Name : JOHN DOE     Lab ID : GD-99812
Reporting Date : 28/09/2026 10:15 AM
HbA1c 6.1 % 4.0 - 5.6
Cholesterol Total 185 mg/dL < 200
HDL Cholesterol 42 mg/dL > 50
Vitamin D 18.2 ng/mL 30 - 100
`;

describe('smart report parser', () => {
  const { meta, markers } = parseLabReportText(SAMPLE);
  const byId = Object.fromEntries(markers.map((m) => [m.markerId, m]));

  test('extracts meta', () => {
    expect(meta.labName).toBe('Gulf Diagnostics Lab');
    expect(meta.labId).toBe('GD-99812');
  });

  test('extracts values and status', () => {
    expect(byId.hba1c).toMatchObject({ value: 6.1, unit: '%', status: 'high' });
    expect(byId.cholesterol_total).toMatchObject({ value: 185, status: 'normal' });
    expect(byId.hdl).toMatchObject({ value: 42, status: 'low' });
    expect(byId.vitamin_d).toMatchObject({ value: 18.2, unit: 'ng/ml', status: 'low' });
  });

  test('does not invent markers that are absent', () => {
    expect(byId.tsh).toBeUndefined();
  });

  test('range helpers', () => {
    expect(parseNearbyRange('4.0 - 5.6')).toEqual({ low: 4, high: 5.6 });
    expect(parseNearbyRange('< 200')).toEqual({ low: null, high: 200 });
    expect(resolveStatus(3, { low: 4, high: null })).toBe('low');
  });
});
```

Keep a folder of **real, anonymized PDFs** from each partner lab and add a snapshot test per lab
(`extractText` → `parseLabReportText` → `expect(markers).toMatchSnapshot()`). This is the only
reliable way to catch regressions when you touch aliases or regexes.

---

## 14. Frontend — API layer

### 14.1 `src/api/httpClient.ts` (skip if your project already has one)

```ts
import axios from 'axios';

export const http = axios.create({ baseURL: import.meta.env.VITE_API_URL });

http.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
}

export function toErrorMessage(err: unknown, fallback: string): string {
  const e = err as { response?: { data?: { message?: string } }; message?: string };
  return e?.response?.data?.message || e?.message || fallback;
}
```

### 14.2 `src/api/labReport.api.ts`

```ts
import { http, ApiResponse } from './httpClient';

export interface LabReportUploadItem {
  bookingId: number;
  testId: number;
}

export async function uploadLabReport(file: File, items: LabReportUploadItem[]) {
  const form = new FormData();
  form.append('items', JSON.stringify(items));
  form.append('file', file);
  const { data } = await http.post<ApiResponse<{ groupId: string }>>('/api/lab-reports', form);
  return data;
}
```

### 14.3 `src/api/smartReport.api.ts`

```ts
import { http, ApiResponse } from './httpClient';

export type MarkerStatus = 'high' | 'low' | 'normal';

export interface ReferenceRange {
  low: number | null;
  high: number | null;
}

export interface MarkerHistoryPoint {
  orderId: number;
  date: string | null;
  value: number;
  unit?: string;
  status?: MarkerStatus;
}

export interface SmartReportMarker {
  markerId: string;
  name: string;
  panel: string;
  panelName: string;
  value: number;
  unit: string;
  referenceRange: ReferenceRange;
  status: MarkerStatus;
  explanation: string;
  lab: string | null;
  labTag?: string | null;
  originalName?: string;
  confidence?: number;
  needsReview?: boolean;
  history: MarkerHistoryPoint[];
}

export interface SmartReportPanel {
  panel: string;
  panelName: string;
  markers: SmartReportMarker[];
}

export interface SmartReport {
  reportId: string;
  createdAt: string;
  summary: {
    total: number;
    inRange: number;
    outOfRange: number;
    needsReview: number;
    sourceLabs: string[];
    reportingDate: string | null;
    patientName: string | null;
    orderNumber: string | null;
  };
  disclaimer: string;
  panels: SmartReportPanel[];
  questions: Array<{ markerId: string; name: string; status: MarkerStatus; questions: string[] }>;
  pastOrders: Array<{ orderId: number; reportingDate: string | null; markerCount: number }>;
}

export async function getSmartReport(orderId: number, patientId: number, signal?: AbortSignal) {
  const { data } = await http.get<ApiResponse<SmartReport>>(
    `/api/reports/smart/${orderId}/${patientId}`,
    { signal },
  );
  return data;
}
```

---

## 15. Frontend — components

Styling uses Tailwind classes; swap for your design system.

### 15.1 `src/components/smart-report/LabReportUploadButton.tsx`

```tsx
import React, { useRef, useState } from 'react';
import { uploadLabReport, LabReportUploadItem } from '../../api/labReport.api';
import { toErrorMessage } from '../../api/httpClient';

interface Props {
  items: LabReportUploadItem[];
  disabled?: boolean;
  onUploaded: () => void;
  onError: (message: string) => void;
}

export const LabReportUploadButton: React.FC<Props> = ({ items, disabled, onUploaded, onError }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
    const file = e.target.files?.[0];
    e.currentTarget.value = '';
    if (!file) return;
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      onError('Only PDF files are allowed for lab reports');
      return;
    }
    setUploading(true);
    try {
      const res = await uploadLabReport(file, items);
      if (!res.success) throw new Error(res.message || 'Upload failed');
      onUploaded();
    } catch (err) {
      onError(toErrorMessage(err, 'Upload failed'));
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <input ref={inputRef} type="file" accept="application/pdf" hidden onChange={handleFile} />
      <button
        type="button"
        disabled={disabled || uploading || items.length === 0}
        onClick={() => inputRef.current?.click()}
        className="rounded-lg bg-teal-700 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {uploading ? 'Uploading…' : 'Upload result'}
      </button>
    </>
  );
};
```

### 15.2 `src/components/smart-report/TrendChart.tsx`

```tsx
import React, { useMemo } from 'react';
import { ReferenceRange } from '../../api/smartReport.api';

export interface TrendPoint {
  label: string;
  value: number;
}

interface Props {
  points: TrendPoint[];
  range: ReferenceRange;
  unit: string;
}

const W = 320;
const H = 140;
const PAD = { top: 12, right: 12, bottom: 24, left: 36 };

export const TrendChart: React.FC<Props> = ({ points, range, unit }) => {
  const chart = useMemo(() => {
    const values = points.map((p) => p.value);
    const bounds = [...values, range.low, range.high].filter((v): v is number => v != null);
    const min = Math.min(...bounds);
    const max = Math.max(...bounds);
    const span = max - min || 1;
    const lo = min - span * 0.15;
    const hi = max + span * 0.15;

    const x = (i: number) =>
      PAD.left + (points.length === 1 ? (W - PAD.left - PAD.right) / 2 : (i * (W - PAD.left - PAD.right)) / (points.length - 1));
    const y = (v: number) => PAD.top + ((hi - v) / (hi - lo)) * (H - PAD.top - PAD.bottom);

    return {
      coords: points.map((p, i) => ({ ...p, cx: x(i), cy: y(p.value) })),
      bandTop: y(range.high ?? hi),
      bandBottom: y(range.low ?? lo),
    };
  }, [points, range]);

  if (!points.length) return null;
  const path = chart.coords.map((c, i) => `${i ? 'L' : 'M'}${c.cx},${c.cy}`).join(' ');

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`Trend in ${unit}`}>
      <rect
        x={PAD.left}
        width={W - PAD.left - PAD.right}
        y={chart.bandTop}
        height={Math.max(0, chart.bandBottom - chart.bandTop)}
        className="fill-emerald-100"
      />
      <path d={path} fill="none" strokeWidth={2} className="stroke-teal-700" />
      {chart.coords.map((c) => (
        <g key={`${c.label}-${c.cx}`}>
          <circle cx={c.cx} cy={c.cy} r={4} className="fill-teal-700" />
          <text x={c.cx} y={c.cy - 8} textAnchor="middle" className="fill-slate-700 text-[10px]">
            {c.value}
          </text>
          <text x={c.cx} y={H - 6} textAnchor="middle" className="fill-slate-500 text-[9px]">
            {c.label.slice(0, 10)}
          </text>
        </g>
      ))}
    </svg>
  );
};
```

### 15.3 `src/components/smart-report/MarkerCard.tsx`

```tsx
import React from 'react';
import { SmartReportMarker } from '../../api/smartReport.api';
import { TrendChart } from './TrendChart';

const STATUS_STYLE: Record<string, string> = {
  high: 'bg-rose-100 text-rose-700',
  low: 'bg-amber-100 text-amber-700',
  normal: 'bg-emerald-100 text-emerald-700',
};

const formatRange = ({ low, high }: SmartReportMarker['referenceRange']) => {
  if (low != null && high != null) return `${low} – ${high}`;
  if (high != null) return `< ${high}`;
  if (low != null) return `> ${low}`;
  return '—';
};

interface Props {
  marker: SmartReportMarker;
  currentLabel: string;
  isTrendOpen: boolean;
  onToggleTrend: () => void;
}

export const MarkerCard: React.FC<Props> = ({ marker, currentLabel, isTrendOpen, onToggleTrend }) => {
  const points = [
    ...marker.history.map((h) => ({ label: h.date || `#${h.orderId}`, value: h.value })),
    { label: currentLabel, value: marker.value },
  ];

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h4 className="font-semibold text-slate-900">{marker.name}</h4>
          {marker.labTag ? <span className="text-xs text-slate-500">{marker.labTag}</span> : null}
        </div>
        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${STATUS_STYLE[marker.status]}`}>
          {marker.status === 'normal' ? 'In range' : marker.status}
        </span>
      </header>

      <p className="mt-2 text-2xl font-bold text-slate-900">
        {marker.value} <span className="text-sm font-normal text-slate-500">{marker.unit}</span>
      </p>
      <p className="text-xs text-slate-500">Usual range: {formatRange(marker.referenceRange)} {marker.unit}</p>
      <p className="mt-2 text-sm text-slate-700">{marker.explanation}</p>
      {marker.needsReview ? (
        <p className="mt-1 text-xs text-amber-700">Read automatically — please verify against the original PDF.</p>
      ) : null}

      <button type="button" onClick={onToggleTrend} className="mt-3 text-sm font-medium text-rose-600">
        {isTrendOpen ? 'Hide trend' : `Trend${marker.history.length ? ` (${marker.history.length})` : ''}`}
      </button>
      {isTrendOpen ? (
        <div className="mt-2">
          {marker.history.length ? (
            <TrendChart points={points} range={marker.referenceRange} unit={marker.unit} />
          ) : (
            <p className="text-xs text-slate-500">No previous results for this marker yet.</p>
          )}
        </div>
      ) : null}
    </article>
  );
};
```

### 15.4 `src/components/smart-report/SmartReportModal.tsx`

```tsx
import React, { useEffect, useMemo, useState } from 'react';
import { getSmartReport, SmartReport } from '../../api/smartReport.api';
import { toErrorMessage } from '../../api/httpClient';
import { MarkerCard } from './MarkerCard';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  orderId: number | null;
  patientId: number | null;
}

type LoadState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; report: SmartReport };

export const SmartReportModal: React.FC<Props> = ({ isOpen, onClose, orderId, patientId }) => {
  const [state, setState] = useState<LoadState>({ kind: 'idle' });
  const [reloadKey, setReloadKey] = useState(0);
  const [search, setSearch] = useState('');
  const [abnormalOnly, setAbnormalOnly] = useState(false);
  const [trendMarkerId, setTrendMarkerId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return undefined;
    if (!orderId || !patientId) {
      setState({ kind: 'error', message: 'Order or patient is missing.' });
      return undefined;
    }

    const controller = new AbortController();
    setState({ kind: 'loading' });
    setSearch('');
    setAbnormalOnly(false);
    setTrendMarkerId(null);

    getSmartReport(orderId, patientId, controller.signal)
      .then((res) => {
        if (!res.success || !res.data) throw new Error(res.message || 'Failed to load smart report');
        setState({ kind: 'ready', report: res.data });
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        setState({ kind: 'error', message: toErrorMessage(err, 'Failed to load smart report') });
      });

    return () => controller.abort();
  }, [isOpen, orderId, patientId, reloadKey]);

  const report = state.kind === 'ready' ? state.report : null;

  const panels = useMemo(() => {
    if (!report) return [];
    const q = search.trim().toLowerCase();
    return report.panels
      .map((p) => ({
        ...p,
        markers: p.markers.filter((m) => {
          if (abnormalOnly && m.status === 'normal') return false;
          if (!q) return true;
          return [m.name, m.markerId, m.originalName || ''].some((s) => s.toLowerCase().includes(q));
        }),
      }))
      .filter((p) => p.markers.length > 0);
  }, [report, search, abnormalOnly]);

  if (!isOpen) return null;

  const currentLabel = report?.summary.reportingDate || report?.createdAt.slice(0, 10) || 'Now';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
      <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-slate-50">
        <header className="flex items-center justify-between bg-gradient-to-br from-slate-900 to-teal-800 px-6 py-4 text-white">
          <div>
            <h2 className="text-lg font-semibold">Smart Lab Report</h2>
            {report ? (
              <p className="text-xs text-teal-100">
                {report.summary.patientName || ''} {report.summary.orderNumber ? `• ${report.summary.orderNumber}` : ''}
                {report.summary.sourceLabs.length ? ` • ${report.summary.sourceLabs.join(', ')}` : ''}
              </p>
            ) : null}
          </div>
          <div className="flex gap-2">
            {report ? (
              <button type="button" onClick={() => window.print()} className="rounded-lg bg-white/10 px-3 py-1.5 text-sm">
                Print
              </button>
            ) : null}
            <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg bg-white/10 px-3 py-1.5 text-sm">
              ✕
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6">
          {state.kind === 'loading' ? (
            <div className="py-16 text-center text-slate-500">Reading your lab report…</div>
          ) : null}

          {state.kind === 'error' ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-700">
              <p>{state.message}</p>
              <button type="button" onClick={() => setReloadKey((k) => k + 1)} className="mt-2 text-sm font-medium underline">
                Try again
              </button>
            </div>
          ) : null}

          {report ? (
            <>
              <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <SummaryCard label="Tests read" value={report.summary.total} tone="slate" />
                <SummaryCard label="In range" value={report.summary.inRange} tone="emerald" />
                <SummaryCard label="Needs attention" value={report.summary.outOfRange} tone="rose" />
              </section>

              <section className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search a test…"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm sm:max-w-xs"
                />
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input type="checkbox" checked={abnormalOnly} onChange={(e) => setAbnormalOnly(e.target.checked)} />
                  Show only out-of-range
                </label>
              </section>

              {panels.length === 0 ? (
                <p className="mt-8 text-center text-slate-500">No tests match your filters.</p>
              ) : (
                panels.map((panel) => (
                  <section key={panel.panel} className="mt-6">
                    <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">{panel.panelName}</h3>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      {panel.markers.map((marker) => (
                        <MarkerCard
                          key={marker.markerId}
                          marker={marker}
                          currentLabel={currentLabel}
                          isTrendOpen={trendMarkerId === marker.markerId}
                          onToggleTrend={() =>
                            setTrendMarkerId((id) => (id === marker.markerId ? null : marker.markerId))
                          }
                        />
                      ))}
                    </div>
                  </section>
                ))
              )}

              {report.questions.length ? (
                <section className="mt-8 rounded-xl border border-slate-200 bg-white p-4">
                  <h3 className="font-semibold text-slate-900">Questions to ask your doctor</h3>
                  {report.questions.map((group) => (
                    <div key={group.markerId} className="mt-3">
                      <p className="text-sm font-medium text-slate-700">{group.name}</p>
                      <ul className="ml-5 list-disc text-sm text-slate-600">
                        {group.questions.map((q) => <li key={q}>{q}</li>)}
                      </ul>
                    </div>
                  ))}
                </section>
              ) : null}

              <p className="mt-6 text-xs text-slate-500">{report.disclaimer}</p>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
};

const TONES = {
  slate: 'text-slate-900',
  emerald: 'text-emerald-700',
  rose: 'text-rose-700',
} as const;

const SummaryCard: React.FC<{ label: string; value: number; tone: keyof typeof TONES }> = ({ label, value, tone }) => (
  <div className="rounded-xl border border-slate-200 bg-white p-4">
    <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
    <p className={`mt-1 text-3xl font-bold ${TONES[tone]}`}>{value}</p>
  </div>
);
```

### 15.5 Wiring into an order page

```tsx
import React, { lazy, Suspense, useState } from 'react';
import { LabReportUploadButton } from '../components/smart-report/LabReportUploadButton';

const SmartReportModal = lazy(() =>
  import('../components/smart-report/SmartReportModal').then((m) => ({ default: m.SmartReportModal })),
);

export function OrderLabReports({ order, selectedPatientId, selectedTests, hasPermission, reload, toast }) {
  const [isSmartOpen, setIsSmartOpen] = useState(false);
  const uploadedCount = selectedTests.filter((t) => t.reportId).length;
  const pending = selectedTests
    .filter((t) => !t.reportId)
    .map((t) => ({ bookingId: t.bookingId, testId: t.testId }));

  return (
    <div className="flex gap-2">
      {hasPermission('LAB_REPORT_UPLOAD') ? (
        <LabReportUploadButton
          items={pending}
          onUploaded={() => { toast.success('Result uploaded'); reload(); }}
          onError={toast.error}
        />
      ) : null}

      {hasPermission('SMART_REPORT_VIEW') && uploadedCount > 0 ? (
        <button type="button" onClick={() => setIsSmartOpen(true)} className="rounded-lg border px-3 py-2 text-sm">
          Smart Report
        </button>
      ) : null}

      <Suspense fallback={null}>
        {isSmartOpen ? (
          <SmartReportModal
            isOpen={isSmartOpen}
            onClose={() => setIsSmartOpen(false)}
            orderId={order.id}
            patientId={selectedPatientId ?? order.patientId}
          />
        ) : null}
      </Suspense>
    </div>
  );
}
```

---

## 16. Error contract

| Status | When | UI behaviour |
|---|---|---|
| 400 | Invalid ids / non-PDF upload | Show validation message |
| 403 | Missing permission, patient not on order | "You don't have access to this report" |
| 404 | Order missing, no uploaded PDF for patient | "No lab result uploaded yet" |
| 422 | PDF unreadable, or no catalog marker matched | Show message + link to open original PDF |
| 500 | Unexpected (GCS, DB) | Generic message + retry |

---

## 17. Checklist before going live

- [ ] Migration run; indexes present on `bookings(order_id, patient_id)` and `orders(patient_id, order_date)`.
- [ ] `FILE_PATH_ENCRYPTION_KEY` set per environment and backed up (losing it = unreadable paths).
- [ ] GCS bucket is **private**; service account has only `storage.objects.create/get`.
- [ ] Permissions `LAB_REPORT_UPLOAD` and `SMART_REPORT_VIEW` seeded and assigned.
- [ ] Catalog ranges reviewed and signed off by a clinician.
- [ ] Parser snapshot tests pass for a real anonymized PDF from **each** partner lab.
- [ ] Gemini fallback: confirm your data-processing agreement allows sending patient PDFs to Google; otherwise leave the key unset.
- [ ] Multi-instance deployment: move `parsedCache` to Redis.
- [ ] Rate-limit `GET /api/reports/smart/*` (each call may download and parse several PDFs).
- [ ] Swagger renders both endpoints.

## 18. Extending later

- **Arabic / i18n:** make `explanation` and `questions` objects keyed by language (`{ en, ar }`) and
  pick by `?lang=` in the builder.
- **Unit conversion:** add `convert: { 'mmol/l': (v) => v * 18 }` per marker and normalise before status.
- **Manual review:** persist markers with `needsReview` into a `smart_report_overrides` table so staff can
  correct values; merge overrides in the service before building.
- **Precompute:** run parsing in a queue job right after upload and store the parsed JSON keyed by
  `file_sha256`, so opening the report never waits for text extraction.
