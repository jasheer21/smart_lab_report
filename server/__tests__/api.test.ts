import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { after, before, beforeEach, describe, test } from 'node:test';
import { labReportLines, makePdf, NON_LAB_TEXT } from './fixtures';

// Config is read at import time: make sure tests never call the real Gemini API.
process.env.SMART_REPORT_GEMINI_API_KEY = '';
process.env.GEMINI_API_KEY = '';
process.env.RATE_LIMIT_PER_MINUTE = '1000';

const { createApp } = await import('../app');
const { reportStore } = await import('../reports/reportStore');
const { clearOcrCache } = await import('../ocr/ocr.service');

let server: Server;
let baseUrl: string;

before(async () => {
  server = createApp({ serveFrontend: false }).listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

after(() => new Promise<void>((resolve) => server.close(() => resolve())));

beforeEach(() => {
  reportStore.clear();
  clearOcrCache();
});

type Fields = Record<string, string | number>;

const readJson = (res: Response): Promise<any> => res.json();
const getJson = async (url: string) => readJson(await fetch(url));

async function upload(path: string, files: Array<{ name: string; type: string; body: Buffer | string }>, fields: Fields = {}, field = 'file') {
  const form = new FormData();
  for (const [k, v] of Object.entries(fields)) form.append(k, String(v));
  for (const f of files) form.append(field, new Blob([f.body], { type: f.type }), f.name);
  const res = await fetch(`${baseUrl}${path}`, { method: 'POST', body: form });
  return { status: res.status, body: await readJson(res) };
}

const pdfFile = (opts?: Parameters<typeof labReportLines>[0]) => ({
  name: 'report.pdf',
  type: 'application/pdf',
  body: makePdf(labReportLines(opts)),
});

describe('health and catalog', () => {
  test('GET /api/health reports OCR capabilities', async () => {
    const body = await getJson(`${baseUrl}/api/health`);
    assert.equal(body.success, true);
    assert.equal(body.data.ocr.geminiVision, false);
  });

  test('GET /api/catalog lists markers', async () => {
    const body = await getJson(`${baseUrl}/api/catalog`);
    assert.ok(body.data.markers.some((m: { markerId: string }) => m.markerId === 'hba1c'));
  });

  test('unknown API route is a JSON 404', async () => {
    const res = await fetch(`${baseUrl}/api/nope`);
    assert.equal(res.status, 404);
    assert.equal((await readJson(res)).success, false);
  });
});

describe('POST /api/lab-reports', () => {
  test('reads a text PDF and returns a smart report', async () => {
    const { status, body } = await upload('/api/lab-reports', [pdfFile()], { orderId: 1, patientId: 101 });
    assert.equal(status, 201);
    assert.equal(body.data.extraction.method, 'pdf-text');
    assert.equal(body.data.report.summary.patientName, 'JOHN DOE');
    assert.ok(body.data.report.summary.total >= 6);
    assert.ok(body.data.report.questions.some((q: { markerId: string }) => q.markerId === 'hba1c'));
  });

  test('accepts .txt lab reports', async () => {
    const { status, body } = await upload('/api/lab-reports', [
      { name: 'report.txt', type: 'text/plain', body: labReportLines().join('\n') },
    ]);
    assert.equal(status, 201);
    assert.equal(body.data.extraction.method, 'text-file');
  });

  test('rejects non-lab documents with 422', async () => {
    const { status, body } = await upload('/api/lab-reports', [
      { name: 'contract.pdf', type: 'application/pdf', body: makePdf(NON_LAB_TEXT.split('\n')) },
    ]);
    assert.equal(status, 422);
    assert.match(body.message, /Document structure rejected/);
  });

  test('rejects files that are not PDF/image/text by content, not extension', async () => {
    const { status } = await upload('/api/lab-reports', [
      { name: 'fake.pdf', type: 'application/pdf', body: Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x00, 0x01]) },
    ]);
    assert.equal(status, 415);
  });

  test('scanned PDF without Gemini gives a clear 422', async () => {
    const { status, body } = await upload('/api/lab-reports', [
      { name: 'scan.pdf', type: 'application/pdf', body: makePdf([]) },
    ]);
    assert.equal(status, 422);
    assert.match(body.message, /SMART_REPORT_GEMINI_API_KEY/);
  });

  test('image scan without Gemini gives a clear 422', async () => {
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
    const { status, body } = await upload('/api/lab-reports', [{ name: 'scan.png', type: 'image/png', body: png }]);
    assert.equal(status, 422);
    assert.match(body.message, /Image scans need/);
  });

  test('requires orderId and patientId together', async () => {
    const { status } = await upload('/api/lab-reports', [pdfFile()], { orderId: 1 });
    assert.equal(status, 400);
  });

  test('requires a file', async () => {
    const { status } = await upload('/api/lab-reports', [], { orderId: 1, patientId: 2 });
    assert.equal(status, 400);
  });
});

describe('smart report retrieval and history', () => {
  test('earlier orders of the same patient become trend history', async () => {
    await upload('/api/lab-reports', [pdfFile({ hba1c: '6.8', date: '02/03/2026 09:00 AM' })], { orderId: 1, patientId: 101 });
    await upload('/api/lab-reports', [pdfFile({ hba1c: '6.1' })], { orderId: 2, patientId: 101 });
    // Different patient must never leak into history.
    await upload('/api/lab-reports', [pdfFile({ hba1c: '9.9' })], { orderId: 3, patientId: 202 });

    const res = await fetch(`${baseUrl}/api/reports/smart/2/101`);
    assert.equal(res.status, 200);
    const report = (await readJson(res)).data;
    const hba1c = report.panels.flatMap((p: { markers: unknown[] }) => p.markers).find((m: { markerId: string }) => m.markerId === 'hba1c');
    assert.equal(hba1c.value, 6.1);
    assert.deepEqual(hba1c.history.map((h: { value: number }) => h.value), [6.8]);
    assert.equal(report.pastOrders.length, 1);
  });

  test('re-uploading for the same order replaces the previous report', async () => {
    const first = await upload('/api/lab-reports', [pdfFile({ hba1c: '7.0' })], { orderId: 5, patientId: 9 });
    await upload('/api/lab-reports', [pdfFile({ hba1c: '5.2' })], { orderId: 5, patientId: 9 });

    const report = (await getJson(`${baseUrl}/api/reports/smart/5/9`)).data;
    const hba1c = report.panels[0].markers.find((m: { markerId: string }) => m.markerId === 'hba1c');
    assert.equal(hba1c.value, 5.2);
    assert.equal((await fetch(`${baseUrl}/api/reports/${first.body.data.reportId}`)).status, 404);
  });

  test('GET by report id and 404 for unknown order', async () => {
    const { body } = await upload('/api/lab-reports', [pdfFile()]);
    assert.equal((await fetch(`${baseUrl}/api/reports/${body.data.reportId}`)).status, 200);
    assert.equal((await fetch(`${baseUrl}/api/reports/smart/77/88`)).status, 404);
    assert.equal((await fetch(`${baseUrl}/api/reports/smart/abc/88`)).status, 400);
  });
});

describe('other endpoints', () => {
  test('POST /api/ocr/extract returns text without parsing', async () => {
    const { status, body } = await upload('/api/ocr/extract', [pdfFile()]);
    assert.equal(status, 200);
    assert.match(body.data.text, /HbA1c 6\.1 %/);
    assert.equal(body.data.fingerprint.length, 64);
  });

  test('POST /api/reports/parse-text builds a report from text', async () => {
    const res = await fetch(`${baseUrl}/api/reports/parse-text`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: labReportLines().join('\n') }),
    });
    assert.equal(res.status, 200);
    assert.ok((await readJson(res)).data.summary.total >= 6);
  });

  test('POST /api/reports/insights analyses a batch and reports per-file errors', async () => {
    const { status, body } = await upload(
      '/api/reports/insights',
      [
        { ...pdfFile({ hba1c: '6.8', date: '02/03/2026' }), name: 'march.pdf' },
        { ...pdfFile({ hba1c: '6.1', date: '09/28/2026' }), name: 'september.pdf' },
        { name: 'contract.txt', type: 'text/plain', body: NON_LAB_TEXT },
      ],
      {},
      'files',
    );
    assert.equal(status, 200);
    assert.equal(body.data.entries.length, 2);
    assert.deepEqual(body.data.errors.map((e: { fileName: string }) => e.fileName), ['contract.txt']);
    assert.ok(body.data.insights.trajectories.length > 0);
  });
});
