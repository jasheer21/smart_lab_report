import { ApiResponse, apiRequest } from './httpClient';
import { SmartReport } from '../modules/smart-report/smartReport.types';

export interface LabReportUploadItem {
  bookingId: number;
  testId: number;
}

export interface LabReportUploadResult {
  groupId: string;
  reportId: string;
  report: SmartReport;
  extraction: { method: 'text-file' | 'pdf-text' | 'gemini-vision'; pageCount: number | null; fingerprint: string };
}

/**
 * Endpoint: POST /api/lab-reports
 *
 * The server extracts text (pdf-parse, Gemini Vision fallback for scans), validates the document,
 * parses biomarkers against the catalog and returns the smart report.
 */
export async function uploadLabReport(
  file: File,
  items: LabReportUploadItem[],
  customMetadata?: { patientName?: string; orderNumber?: string; patientId?: number; orderId?: number }
): Promise<ApiResponse<LabReportUploadResult>> {
  const form = new FormData();
  form.append('file', file);
  form.append('items', JSON.stringify(items));
  // The server needs both ids to link the report to an order and build trend history.
  if (customMetadata?.orderId && customMetadata?.patientId) {
    form.append('orderId', String(customMetadata.orderId));
    form.append('patientId', String(customMetadata.patientId));
  }
  if (customMetadata?.patientName) form.append('patientName', customMetadata.patientName);
  if (customMetadata?.orderNumber) form.append('orderNumber', customMetadata.orderNumber);

  return apiRequest<LabReportUploadResult>('/api/lab-reports', { method: 'POST', body: form });
}
