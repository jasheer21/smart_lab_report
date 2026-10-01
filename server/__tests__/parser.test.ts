import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  isAuthenticLabReport,
  parseLabReportText,
  parseNearbyRange,
  resolveStatus,
} from '../../src/modules/smart-report/smartReport.parser';
import { labReportLines, NON_LAB_TEXT } from './fixtures';

describe('smart report parser', () => {
  const { meta, markers } = parseLabReportText(labReportLines().join('\n'));
  const byId = Object.fromEntries(markers.map((m) => [m.markerId, m]));

  test('extracts report meta', () => {
    assert.equal(meta.labName, 'Gulf Diagnostics Lab');
    assert.equal(meta.labId, 'GD-99812');
    assert.equal(meta.patientName, 'JOHN DOE');
  });

  test('extracts values, units and status', () => {
    assert.equal(byId.hba1c.value, 6.1);
    assert.equal(byId.hba1c.unit, '%');
    assert.equal(byId.hba1c.status, 'high');
    assert.equal(byId.cholesterol_total.status, 'normal');
    assert.equal(byId.hdl.status, 'low');
    assert.equal(byId.vitamin_d.value, 18.2);
    assert.equal(byId.vitamin_d.status, 'low');
  });

  test('does not read Glycated Haemoglobin (%) as Hemoglobin (g/dL)', () => {
    const parsed = parseLabReportText('Glycated Haemoglobin 6.1 % 4.0 - 5.6');
    assert.equal(parsed.markers.find((m) => m.markerId === 'hemoglobin'), undefined);
  });

  test('does not invent markers that are absent', () => {
    assert.equal(byId.ferritin, undefined);
  });

  test('range helpers', () => {
    assert.deepEqual(parseNearbyRange('4.0 - 5.6'), { low: 4, high: 5.6 });
    assert.deepEqual(parseNearbyRange('< 200'), { low: null, high: 200 });
    assert.equal(resolveStatus(3, { low: 4, high: null }), 'low');
  });

  test('rejects non-lab documents', () => {
    assert.equal(isAuthenticLabReport(NON_LAB_TEXT), false);
    assert.equal(isAuthenticLabReport(labReportLines().join('\n')), true);
  });
});
