import crypto from 'node:crypto';
import {
  isAuthenticLabReport,
  parseLabReportText,
  type ParsedReportResult,
} from '../../src/modules/smart-report/smartReport.parser';
import { buildSmartReportPayload, type HistoryOrderData } from '../../src/modules/smart-report/smartReport.builder';
import {
  buildOptimizedMultiReportInsights,
  type MultiReportEntry,
  type OptimizedInsightsResult,
} from '../../src/modules/smart-report/multiReportInsights.service';
import type { LabReportMeta, SmartReport } from '../../src/modules/smart-report/smartReport.types';
import { config } from '../config';
import { AppError } from '../errors';
import { extractText, type ExtractionResult } from '../ocr/ocr.service';
import { detectFileKind } from '../upload';
import { reportStore, type StoredReport } from './reportStore';

export interface ReportContext {
  orderId?: number | null;
  patientId?: number | null;
  patientName?: string | null;
  orderNumber?: string | null;
}

export interface ExtractionSummary {
  method: ExtractionResult['method'];
  pageCount: number | null;
  fingerprint: string;
}

export interface LabReportUploadResult {
  groupId: string;
  reportId: string;
  report: SmartReport;
  extraction: ExtractionSummary;
}

/** Validates the text looks like a lab report and contains at least one catalog biomarker. */
export function parseValidatedText(text: string): ParsedReportResult {
  if (!isAuthenticLabReport(text)) {
    throw new AppError(
      'Document structure rejected: This file does not match the required clinical lab report structure. Non-lab PDFs and other document types cannot be accepted.',
      422,
    );
  }
  const parsed = parseLabReportText(text);
  if (!parsed.markers.length) {
    throw new AppError(
      'Document rejected: No recognized clinical biomarkers found in the uploaded document. Please upload an authentic lab result PDF with valid test names and reference intervals.',
      422,
    );
  }
  return parsed;
}

async function analyzeFile(file: Express.Multer.File) {
  const extraction = await extractText(file.buffer, detectFileKind(file));
  const parsed = parseValidatedText(extraction.text);
  return { extraction, parsed };
}

function effectiveMeta(meta: LabReportMeta, ctx: ReportContext): LabReportMeta {
  // Values printed on the document win over values supplied by the caller.
  return {
    ...meta,
    patientName: meta.patientName || ctx.patientName || null,
    orderNumber: meta.orderNumber || ctx.orderNumber || null,
  };
}

function buildFromStored(entry: StoredReport): SmartReport {
  const historyByOrder: HistoryOrderData[] = reportStore
    .listPastOrders(entry, config.historyOrders)
    .map((past) => ({
      orderId: past.orderId!,
      reportingDate: past.meta.reportingDate || new Date(past.createdAt).toISOString().slice(0, 10),
      markers: past.markers,
    }));

  return buildSmartReportPayload({
    currentMarkers: entry.markers,
    meta: entry.meta,
    historyByOrder,
    customReportId: entry.reportId,
  });
}

const newReportId = () => `r_${crypto.randomBytes(6).toString('hex')}`;

export function buildReportFromText(text: string, ctx: ReportContext = {}): SmartReport {
  const parsed = parseValidatedText(text);
  return buildSmartReportPayload({
    currentMarkers: parsed.markers,
    meta: effectiveMeta(parsed.meta, ctx),
    customReportId: newReportId(),
  });
}

export async function createLabReport(file: Express.Multer.File, ctx: ReportContext): Promise<LabReportUploadResult> {
  const { extraction, parsed } = await analyzeFile(file);

  const entry: StoredReport = {
    reportId: newReportId(),
    orderId: ctx.orderId ?? null,
    patientId: ctx.patientId ?? null,
    meta: effectiveMeta(parsed.meta, ctx),
    markers: parsed.markers,
    fileName: file.originalname,
    extraction: { method: extraction.method, pageCount: extraction.pageCount, fingerprint: extraction.fingerprint },
    createdAt: Date.now(),
  };
  reportStore.save(entry);

  return {
    groupId: `grp_${crypto.randomUUID()}`,
    reportId: entry.reportId,
    report: buildFromStored(entry),
    extraction: entry.extraction,
  };
}

export function getSmartReportForOrder(orderId: number, patientId: number): SmartReport {
  const entry = reportStore.getByOrder(orderId, patientId);
  if (!entry) throw new AppError('No lab report uploaded yet for this order and patient.', 404);
  return buildFromStored(entry);
}

export function getSmartReportById(reportId: string): SmartReport {
  const entry = reportStore.getById(reportId);
  if (!entry) throw new AppError('Report not found or expired. Please upload the lab report again.', 404);
  return buildFromStored(entry);
}

export interface BatchInsightsResult {
  entries: MultiReportEntry[];
  insights: OptimizedInsightsResult;
  errors: Array<{ fileName: string; message: string }>;
}

/** Multi-report flow: every file is analysed independently; one bad file doesn't fail the batch. */
export async function analyzeBatch(files: Express.Multer.File[], ctx: ReportContext = {}): Promise<BatchInsightsResult> {
  const uploadedAt = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const settled = await Promise.allSettled(
    files.map(async (file, index): Promise<MultiReportEntry> => {
      const { parsed } = await analyzeFile(file);
      const report = buildSmartReportPayload({
        currentMarkers: parsed.markers,
        meta: effectiveMeta(parsed.meta, ctx),
        customReportId: newReportId(),
      });
      return {
        id: `rep_${Date.now()}_${index}_${crypto.randomBytes(2).toString('hex')}`,
        fileName: file.originalname,
        fileSize: file.size,
        uploadedAt,
        report,
        reportingDate: report.summary.reportingDate || 'Recent',
        labName: report.summary.sourceLabs[0] || 'Clinical Diagnostic Lab',
        markerCount: report.summary.total,
        outOfRangeCount: report.summary.outOfRange,
      };
    }),
  );

  const entries: MultiReportEntry[] = [];
  const errors: BatchInsightsResult['errors'] = [];
  settled.forEach((result, i) => {
    if (result.status === 'fulfilled') {
      entries.push(result.value);
    } else {
      const err = result.reason;
      if (!(err instanceof AppError)) console.error('[smart-report-api] batch file failed:', err);
      errors.push({
        fileName: files[i].originalname,
        message: err instanceof AppError ? err.message : 'Failed to analyse this file',
      });
    }
  });

  return { entries, insights: buildOptimizedMultiReportInsights(entries), errors };
}
