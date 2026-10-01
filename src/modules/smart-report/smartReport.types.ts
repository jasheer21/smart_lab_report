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
  printedRange?: ReferenceRange;
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

export interface QuestionItem {
  markerId: string;
  name: string;
  status: MarkerStatus;
  questions: string[];
}

export interface PastOrderSummary {
  orderId: number;
  reportingDate: string | null;
  markerCount: number;
}

export interface SmartReportSummary {
  total: number;
  inRange: number;
  outOfRange: number;
  needsReview: number;
  sourceLabs: string[];
  reportingDate: string | null;
  patientName: string | null;
  orderNumber: string | null;
  labId?: string | null;
  cprNumber?: string | null;
  contact?: string | null;
  email?: string | null;
  sex?: string | null;
  age?: string | null;
  bloodType?: string | null;
  patientIdCode?: string | null;
}

export interface SmartReport {
  reportId: string;
  createdAt: string;
  summary: SmartReportSummary;
  disclaimer: string;
  panels: SmartReportPanel[];
  questions: QuestionItem[];
  pastOrders: PastOrderSummary[];
}

export interface LabReportMeta {
  labName: string | null;
  labTag?: string | null;
  reportingDate: string | null;
  patientName: string | null;
  labId: string | null;
  orderNumber?: string | null;
  cprNumber?: string | null;
  contact?: string | null;
  email?: string | null;
  sex?: string | null;
  age?: string | null;
  bloodType?: string | null;
  patientIdCode?: string | null;
}

export interface PatientRecord {
  id: number;
  name: string;
  age: number;
  gender: 'Male' | 'Female' | 'Other';
  dob: string;
  relationship?: 'Self' | 'Spouse' | 'Child' | 'Parent';
  primaryPatientId: number;
  orders: OrderRecord[];
}

export interface OrderRecord {
  id: number;
  orderNumber: string;
  orderDate: string;
  scheduledDate: string;
  status: 'completed' | 'in_progress' | 'scheduled';
  labName: string;
  uploadedPdfName?: string;
  rawText?: string;
}

export interface MarkerCatalogDefinition {
  panel: string;
  panelName: string;
  name: string;
  aliases: string[];
  unitHints: string[];
  referenceRange: ReferenceRange;
  higherIsBetter?: boolean;
  explanation: {
    high: string;
    low: string;
    normal: string;
  };
  questions: {
    high: string[];
    low: string[];
  };
  clinicalImportance?: string;
}
