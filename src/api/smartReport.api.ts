import { ApiResponse, apiRequest } from './httpClient';
import { SmartReport } from '../modules/smart-report/smartReport.types';

// Re-export common types from smartReport.types
export type {
  MarkerStatus,
  ReferenceRange,
  MarkerHistoryPoint,
  SmartReportMarker,
  SmartReportPanel,
  SmartReportSummary,
  QuestionItem,
  PastOrderSummary,
  SmartReport,
} from '../modules/smart-report/smartReport.types';

/**
 * Endpoint: GET /api/reports/smart/:orderId/:patientId
 *
 * Returns the smart report for the order/patient, including trend history from earlier orders.
 */
export async function getSmartReport(
  orderId?: number,
  patientId?: number,
  signal?: AbortSignal
): Promise<ApiResponse<SmartReport>> {
  if (!orderId || !patientId) {
    return {
      success: false,
      message: 'No lab report uploaded yet. Please upload an authentic lab result PDF.',
    };
  }
  return apiRequest<SmartReport>(`/api/reports/smart/${orderId}/${patientId}`, { signal });
}

/** Endpoint: GET /api/reports/:reportId */
export async function getSmartReportById(reportId: string, signal?: AbortSignal): Promise<ApiResponse<SmartReport>> {
  return apiRequest<SmartReport>(`/api/reports/${encodeURIComponent(reportId)}`, { signal });
}
