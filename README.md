# Smart Lab Report

Turns a lab result PDF into a patient-friendly report: biomarkers grouped into panels, in-range /
out-of-range status, plain-language explanations, questions for the doctor, and trend history.

- `src/` — React frontend (Vite).
- `server/` — Express API: OCR, validation, biomarker parsing, smart report building, multi-report insights.
- `src/modules/smart-report/` — parser, catalog, builder and insights, shared by the frontend and the server.

The server keeps **no database and no file storage**. Uploaded files are processed in memory and discarded;
only parsed results are kept in process memory (default 2 hours) so reports can be re-fetched and earlier
orders of the same patient show up as trend history. Restarting the server clears them.

## Run locally

**Prerequisites:** Node.js 20+

1. Install dependencies: `npm install --legacy-peer-deps`
2. Copy `.env.example` to `.env.local`. Set `SMART_REPORT_GEMINI_API_KEY` (or `GEMINI_API_KEY`) to enable
   OCR of scanned PDFs and image scans; text PDFs work without it.
3. Start the API: `npm run dev:server` (http://localhost:4000)
4. In a second terminal, start the frontend: `npm run dev` (http://localhost:3000, proxies `/api` to the API)

Production: `npm run build && npm start` — the API also serves the built frontend from `dist/`.

## OCR pipeline

1. File type is detected from its bytes (PDF, PNG, JPEG, WEBP, or `.txt`), not from the extension.
2. PDFs are read with `pdf-parse`. If fewer than 400 characters come out (scanned PDF), the file is sent to
   Gemini Vision, which transcribes it in the format the parser expects. Images always go to Gemini.
3. Results are cached by SHA-256 of the file, so the same document is never OCR'd twice per process.
4. The text must look like a lab report and contain at least one catalog biomarker, otherwise 422.

## API

All responses are `{ success, data }` or `{ success: false, message }`.

| Method | Path | Body | Purpose |
|---|---|---|---|
| GET | `/api/health` | | Status and whether Gemini OCR is enabled |
| GET | `/api/catalog` | | Recognised biomarkers and reference ranges |
| POST | `/api/lab-reports` | multipart `file`, optional `orderId` + `patientId`, `patientName`, `orderNumber` | Upload one report, returns the smart report |
| GET | `/api/reports/smart/:orderId/:patientId` | | Smart report for an order, with trend history |
| GET | `/api/reports/:reportId` | | Re-fetch a report returned by an upload |
| POST | `/api/reports/parse-text` | JSON `{ text }` | Build a report from already-extracted text |
| POST | `/api/reports/insights` | multipart `files` (repeat, max 10) | Multi-report longitudinal insights |
| POST | `/api/ocr/extract` | multipart `file` | Extracted text only, no parsing |

Errors: 400 invalid input, 404 report not found or expired, 413 file too large, 415 unsupported file type,
422 unreadable document / not a lab report / no recognised biomarkers, 429 rate limited.

## Checks

- `npm run lint` — type-checks the frontend and the server
- `npm run test:server` — parser and API tests (uses generated PDFs; never calls Gemini)
