import { MARKERS } from './smartReport.catalog';
import { LabReportMeta, MarkerCatalogDefinition, MarkerStatus, ReferenceRange, SmartReportMarker } from './smartReport.types';

export const KNOWN_UNITS = [
  'ng/ml',
  'ng/mL',
  'pg/ml',
  'pg/mL',
  'mg/dl',
  'mg/dL',
  'mg /dL',
  'mg/l',
  'mg/L',
  'ug/dl',
  'ug/dL',
  'μg/dL',
  'µg/dL',
  'uiu/ml',
  'uIU/mL',
  'mIU/L',
  'nmol/L',
  'mmol/L',
  'U/L',
  'g/dl',
  'g/dL',
  'mm',
  '%',
  'fL',
  'pg',
  '10^9/L',
  '10^12/L',
  'ml/min/1.73m2',
  'Ratio',
];

const escapeRegex = (v: string): string =>
  String(v).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const UNIT_PATTERN = [...KNOWN_UNITS]
  .sort((a, b) => b.length - a.length)
  .map((u) => escapeRegex(u).replace(/\\ /g, '\\s*').replace(/ /g, '\\s*'))
  .join('|');

export interface ParsedReportResult {
  meta: LabReportMeta;
  markers: Array<Omit<SmartReportMarker, 'history' | 'explanation'> & { printedRange: ReferenceRange }>;
  rawText?: string;
}

/**
 * Normalizes multi-line OCR or raw extracted text
 */
export function normalize(text: string): string {
  return String(text || '')
    .replace(/\r\n/g, '\n')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

/**
 * Parses raw text extracted from a lab report against the deterministic catalog.
 */
export function parseLabReportText(text: string): ParsedReportResult {
  const normalizedText = normalize(text);
  const meta = extractReportMeta(normalizedText);
  const compact = String(normalizedText || '').replace(/\n+/g, ' ').replace(/\s{2,}/g, ' ');
  const markers: Array<Omit<SmartReportMarker, 'history' | 'explanation'> & { printedRange: ReferenceRange }> = [];

  for (const [markerId, def] of Object.entries(MARKERS)) {
    const hit = matchMarker(compact, def);
    if (!hit) continue;

    const range: ReferenceRange = def.referenceRange
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
      status: resolveStatus(hit.value, range, def.higherIsBetter),
      originalName: hit.originalName,
      confidence: hit.confidence,
      lab: meta.labName,
      labTag: meta.labTag,
      needsReview: hit.confidence < 0.9,
    });
  }

  return { meta, markers, rawText: normalizedText };
}

export function matchMarker(
  compact: string,
  def: MarkerCatalogDefinition
): {
  value: number;
  unit: string;
  originalName: string;
  confidence: number;
  rangeLow: number | null;
  rangeHigh: number | null;
} | null {
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
    const aliasRe = new RegExp(
      `(?<![A-Za-z])${escapeRegex(alias).replace(/\s+/g, '\\s+')}(?![A-Za-z])`,
      'ig'
    );
    let match: RegExpExecArray | null;
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

      const matchIndex = m.index ?? 0;
      const after = window.slice(matchIndex + m[0].length, matchIndex + m[0].length + 140);
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

export function parseNearbyRange(snippet: string): ReferenceRange | null {
  const s = String(snippet || '');
  let m = s.match(/(\d+(?:\.\d+)?)\s*[-–—]\s*(\d+(?:\.\d+)?)/);
  if (m) return { low: parseFloat(m[1]), high: parseFloat(m[2]) };

  m = s.match(/<\s*=?\s*(\d+(?:\.\d+)?)/);
  if (m) return { low: null, high: parseFloat(m[1]) };

  m = s.match(/>\s*=?\s*(\d+(?:\.\d+)?)/);
  if (m) return { low: parseFloat(m[1]), high: null };

  return null;
}

export function resolveStatus(
  value: number,
  { low, high }: ReferenceRange,
  higherIsBetter?: boolean
): MarkerStatus {
  if (higherIsBetter) {
    if (low != null && value < low) return 'low';
    return 'normal';
  }
  if (low != null && value < low) return 'low';
  if (high != null && value > high) return 'high';
  return 'normal';
}

export function normalizeUnit(unit: string): string {
  return String(unit || '')
    .replace(/[μµ]/g, 'u')
    .replace(/\s+/g, '')
    .toLowerCase();
}

export function isAuthenticLabReport(text: string): boolean {
  const normalized = normalize(text).toLowerCase();
  
  // Must contain clinical laboratory indicators
  const hasLabIndicators =
    normalized.includes('result') ||
    normalized.includes('reference') ||
    normalized.includes('unit') ||
    normalized.includes('specimen') ||
    normalized.includes('laboratory') ||
    normalized.includes('diagnostics') ||
    normalized.includes('reporting date') ||
    normalized.includes('collection date') ||
    normalized.includes('fasting') ||
    normalized.includes('hba1c') ||
    normalized.includes('glucose') ||
    normalized.includes('cholesterol');

  // Reject clearly irrelevant document types
  const isInvoiceOrContract =
    (normalized.includes('invoice') && !normalized.includes('blood')) ||
    normalized.includes('purchase order') ||
    normalized.includes('curriculum vitae') ||
    normalized.includes('resume') ||
    normalized.includes('agreement between') ||
    normalized.includes('rental agreement');

  return hasLabIndicators && !isInvoiceOrContract;
}

// normalize() collapses column spacing, so "Name : JOHN DOE     Lab ID : X" arrives as "JOHN DOE Lab ID".
const TRAILING_HEADER_LABEL =
  /\s+(?:Lab|Patient|Sample|Order|Requisition|Ref(?:erred)?|Age|Sex|Gender|DOB|Date|CPR|Civil|National|Contact|Phone|Mobile|Email|Blood|Barcode|Reporting|Collection|ID)\b.*$/i;

function stripTrailingHeaderLabel(name: string | null): string | null {
  return name?.replace(TRAILING_HEADER_LABEL, '').trim() || null;
}

export function extractReportMeta(text: string): LabReportMeta {
  const src = String(text || '');
  const group = (re: RegExp): string | null => src.match(re)?.[1]?.trim() || null;

  // Recognized partner labs first, generic fallback
  const labName =
    group(/(Tasheel(?: Medical)?(?: Center| Lab)?)/i) ||
    group(/(Gulf Diagnostics Lab(?:oratory)?)/i) ||
    group(/(Quest Diagnostics)/i) ||
    group(/(Metropolis Healthcare)/i) ||
    group(/(Mayo Clinic Laboratories)/i) ||
    group(/(Apex Clinical Diagnostics)/i) ||
    group(/([A-Z][A-Za-z0-9&.-]*(?: [A-Za-z0-9&.-]+){0,6} (?:Laboratory|Diagnostics|Lab|Medical Center|Clinic))(?!\s*ID)/);

  const reportingDate =
    group(/Reporting Date\s*:\s*([0-9/,\s:APMapm-]+)/i) ||
    group(/Collection Date\s*:\s*([0-9/,\s:APMapm-]+)/i) ||
    group(/Date\s*:\s*([0-9]{1,2}[/-][0-9]{1,2}[/-][0-9]{2,4}(?:,\s*[0-9]{1,2}:[0-9]{2}\s*(?:AM|PM)?)?)/i);

  const patientName = stripTrailingHeaderLabel(
    group(/Name\s*:\s*([A-Za-z][A-Za-z.'-]*(?: [A-Za-z][A-Za-z.'-]*){0,6})/i) ||
      group(/Patient Name\s*:\s*([A-Za-z][A-Za-z.'-]*(?: [A-Za-z][A-Za-z.'-]*){0,6})/i) ||
      group(/Patient\s*:\s*([A-Za-z][A-Za-z.'-]*(?: [A-Za-z][A-Za-z.'-]*){0,6})/i)
  );

  const labId =
    group(/Lab ID\s*:\s*([A-Z0-9-]+)/i) ||
    group(/Sample ID\s*:\s*([A-Z0-9-]+)/i) ||
    group(/Barcode\s*:\s*([A-Z0-9-]+)/i);

  const orderNumber =
    group(/Order (?:No|Number|#)\s*:\s*([A-Z0-9-]+)/i) ||
    group(/Requisition (?:No|Number|#)\s*:\s*([A-Z0-9-]+)/i);

  const cprNumber =
    group(/CPR (?:NUMBER|NO|#)?\s*:\s*([0-9]{6,12})/i) ||
    group(/Civil ID\s*:\s*([0-9]{6,14})/i) ||
    group(/National ID\s*:\s*([0-9]{6,14})/i);

  const contact =
    group(/CONTACT\s*:\s*(\+?[0-9\s-]{8,18})/i) ||
    group(/Phone\s*:\s*(\+?[0-9\s-]{8,18})/i) ||
    group(/Mobile\s*:\s*(\+?[0-9\s-]{8,18})/i);

  const email =
    group(/EMAIL\s*:\s*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i);

  const sex =
    group(/SEX\s*:\s*(Male|Female|Other)/i) ||
    group(/Gender\s*:\s*(Male|Female|Other)/i) ||
    group(/\b(Male|Female)\b/i);

  const age =
    group(/AGE\s*:\s*([0-9]{1,3}\s*(?:years|yrs|y)?)/i) ||
    group(/Age\s*\/\s*Gender\s*:\s*([0-9]{1,3}\s*Y?)/i);

  const bloodType =
    group(/BLOOD TYPE\s*:\s*([A|B|AB|O][+-])/i) ||
    group(/Blood Group\s*:\s*([A|B|AB|O][+-])/i);

  const patientIdCode =
    group(/Patient ID\s*:\s*([A-Z0-9-]+)/i) ||
    group(/ID\s*:\s*(TSH-[0-9]+|[A-Z]{2,3}-[0-9]+)/i);

  return {
    labName: labName ? labName.replace(/\s+/g, ' ') : null,
    labTag: labName ? labName.split(/\s+/)[0].slice(0, 12).toUpperCase() : null,
    reportingDate: reportingDate || null,
    patientName: patientName || null,
    labId: labId || null,
    orderNumber: orderNumber || null,
    cprNumber: cprNumber || null,
    contact: contact || null,
    email: email || null,
    sex: sex ? (sex.toLowerCase().startsWith('m') ? 'Male' : 'Female') : null,
    age: age ? (age.includes('year') ? age : `${age.replace(/[^0-9]/g, '')} years`) : null,
    bloodType: bloodType || null,
    patientIdCode: patientIdCode || null,
  };
}
