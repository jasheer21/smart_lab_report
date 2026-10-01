import { DISCLAIMER, MARKERS, PANEL_ORDER } from './smartReport.catalog';
import {
  LabReportMeta,
  MarkerHistoryPoint,
  QuestionItem,
  SmartReport,
  SmartReportMarker,
  SmartReportPanel,
} from './smartReport.types';

export interface HistoryOrderData {
  orderId: number;
  reportingDate: string | null;
  markers: Array<{
    markerId: string;
    value: number;
    unit: string;
    status: 'high' | 'low' | 'normal';
  }>;
}

export interface BuildPayloadParams {
  currentMarkers: Array<
    Omit<SmartReportMarker, 'history' | 'explanation'> & { printedRange?: { low: number | null; high: number | null } }
  >;
  meta?: LabReportMeta;
  historyByOrder?: HistoryOrderData[];
  customReportId?: string;
}

/**
 * Builds the complete Smart Report payload ready for visualization, filtering, and printing.
 */
export function buildSmartReportPayload({
  currentMarkers = [],
  meta = {
    labName: null,
    reportingDate: null,
    patientName: null,
    labId: null,
  },
  historyByOrder = [],
  customReportId,
}: BuildPayloadParams): SmartReport {
  const markers: SmartReportMarker[] = currentMarkers.map((mk) => {
    const def = MARKERS[mk.markerId];
    const explanation =
      def?.explanation?.[mk.status] ||
      def?.explanation?.normal ||
      `Your ${mk.name} result has been recorded.`;

    return {
      markerId: mk.markerId,
      name: mk.name,
      panel: mk.panel,
      panelName: mk.panelName,
      value: mk.value,
      unit: mk.unit,
      referenceRange: mk.referenceRange,
      printedRange: mk.printedRange,
      status: mk.status,
      explanation,
      lab: mk.lab || meta.labName || null,
      labTag: mk.labTag || meta.labTag || (meta.labName ? meta.labName.split(/\s+/)[0] : null),
      originalName: mk.originalName,
      confidence: mk.confidence,
      needsReview: (mk.confidence ?? 1) < 0.9,
      history: historyFor(mk.markerId, historyByOrder),
    };
  });

  const byPanel = new Map<string, SmartReportPanel>();
  for (const mk of markers) {
    if (!byPanel.has(mk.panel)) {
      byPanel.set(mk.panel, {
        panel: mk.panel,
        panelName: mk.panelName,
        markers: [],
      });
    }
    byPanel.get(mk.panel)!.markers.push(mk);
  }

  const panels: SmartReportPanel[] = [
    ...PANEL_ORDER.filter((id) => byPanel.has(id)),
    ...[...byPanel.keys()].filter((id) => !PANEL_ORDER.includes(id)),
  ].map((id) => byPanel.get(id)!);

  const abnormal = markers.filter((mk) => mk.status !== 'normal');

  const questions: QuestionItem[] = abnormal.map((mk) => {
    const qList =
      mk.status === 'high' || mk.status === 'low'
        ? MARKERS[mk.markerId]?.questions?.[mk.status]
        : undefined;

    return {
      markerId: mk.markerId,
      name: mk.name,
      status: mk.status,
      questions: qList || [
        `What could be causing my ${mk.name} to be ${mk.status}?`,
        'Do I need a repeat test, medication review, or further follow-up?',
      ],
    };
  });

  const randomSuffix = Math.random().toString(16).substring(2, 8);
  const reportId = customReportId || `r_${Date.now().toString(16).slice(-6)}${randomSuffix}`;

  return {
    reportId,
    createdAt: new Date().toISOString(),
    summary: {
      total: markers.length,
      inRange: markers.length - abnormal.length,
      outOfRange: abnormal.length,
      needsReview: markers.filter((mk) => mk.needsReview).length,
      sourceLabs: [...new Set(markers.map((mk) => mk.lab).filter((l): l is string => Boolean(l)))],
      reportingDate: meta.reportingDate || null,
      patientName: meta.patientName || null,
      orderNumber: meta.orderNumber || null,
      labId: meta.labId || null,
      cprNumber: meta.cprNumber || null,
      contact: meta.contact || null,
      email: meta.email || null,
      sex: meta.sex || null,
      age: meta.age || null,
      bloodType: meta.bloodType || null,
      patientIdCode: meta.patientIdCode || null,
    },
    disclaimer: DISCLAIMER,
    panels,
    questions,
    pastOrders: historyByOrder.map((h) => ({
      orderId: h.orderId,
      reportingDate: h.reportingDate,
      markerCount: h.markers.length,
    })),
  };
}

function historyFor(markerId: string, historyByOrder: HistoryOrderData[]): MarkerHistoryPoint[] {
  const points: MarkerHistoryPoint[] = [];

  for (const order of historyByOrder) {
    const hit = order.markers.find((mk) => mk.markerId === markerId);
    if (hit) {
      points.push({
        orderId: order.orderId,
        date: order.reportingDate,
        value: hit.value,
        unit: hit.unit,
        status: hit.status,
      });
    }
  }

  return points.reverse(); // oldest → newest for chronological chart display
}
