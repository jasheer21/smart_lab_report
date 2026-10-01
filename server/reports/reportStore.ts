import type { ParsedReportResult } from '../../src/modules/smart-report/smartReport.parser';
import type { LabReportMeta } from '../../src/modules/smart-report/smartReport.types';
import { config } from '../config';
import type { ExtractionMethod } from '../ocr/ocr.service';

export interface StoredReport {
  reportId: string;
  orderId: number | null;
  patientId: number | null;
  meta: LabReportMeta;
  markers: ParsedReportResult['markers'];
  fileName: string;
  extraction: { method: ExtractionMethod; pageCount: number | null; fingerprint: string };
  createdAt: number;
  /** Assigned by the store; orders uploads even when several land in the same millisecond. */
  sequence?: number;
}

/**
 * Process-local, time-limited store of parsed results only (no PDFs, no raw text).
 * It exists so GET /api/reports/smart/:orderId/:patientId and trend history work between requests;
 * everything is lost on restart by design.
 */
class ReportStore {
  private byId = new Map<string, StoredReport>();
  private byOrder = new Map<string, string>();
  private nextSequence = 1;

  private static orderKey(orderId: number, patientId: number) {
    return `${orderId}:${patientId}`;
  }

  /** Saving for an order/patient that already has a report replaces it (re-upload). */
  save(report: StoredReport): void {
    this.purgeExpired();
    report.sequence = this.nextSequence++;
    if (report.orderId != null && report.patientId != null) {
      const key = ReportStore.orderKey(report.orderId, report.patientId);
      const previousId = this.byOrder.get(key);
      if (previousId) this.byId.delete(previousId);
      this.byOrder.set(key, report.reportId);
    }
    this.byId.set(report.reportId, report);

    while (this.byId.size > config.reportStoreMax) {
      this.remove(this.byId.keys().next().value!);
    }
  }

  getById(reportId: string): StoredReport | undefined {
    this.purgeExpired();
    return this.byId.get(reportId);
  }

  getByOrder(orderId: number, patientId: number): StoredReport | undefined {
    this.purgeExpired();
    const id = this.byOrder.get(ReportStore.orderKey(orderId, patientId));
    return id ? this.byId.get(id) : undefined;
  }

  /** Earlier orders of the same patient, newest first. */
  listPastOrders(current: StoredReport, limit: number): StoredReport[] {
    if (current.patientId == null) return [];
    this.purgeExpired();
    return [...this.byId.values()]
      .filter(
        (r) =>
          r.patientId === current.patientId &&
          r.orderId != null &&
          r.orderId !== current.orderId &&
          r.sequence! < current.sequence!,
      )
      .sort((a, b) => b.sequence! - a.sequence!)
      .slice(0, limit);
  }

  clear(): void {
    this.byId.clear();
    this.byOrder.clear();
  }

  private remove(reportId: string): void {
    const report = this.byId.get(reportId);
    this.byId.delete(reportId);
    if (report?.orderId != null && report.patientId != null) {
      const key = ReportStore.orderKey(report.orderId, report.patientId);
      if (this.byOrder.get(key) === reportId) this.byOrder.delete(key);
    }
  }

  private purgeExpired(): void {
    const cutoff = Date.now() - config.reportTtlMs;
    for (const [id, report] of this.byId) {
      if (report.createdAt >= cutoff) break; // insertion order == creation order
      this.remove(id);
    }
  }
}

export const reportStore = new ReportStore();
