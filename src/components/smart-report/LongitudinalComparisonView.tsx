import React, { useState } from 'react';
import { SAMPLE_CASES } from '../../data/sampleReports';
import { MARKERS } from '../../modules/smart-report/smartReport.catalog';
import { TrendingUp, ArrowUpRight, ArrowDownRight, CheckCircle2, History } from 'lucide-react';

interface Props {
  patientKey: string;
}

export const LongitudinalComparisonView: React.FC<Props> = ({ patientKey }) => {
  const currentCase = SAMPLE_CASES[patientKey] || SAMPLE_CASES.gulf_metabolic;
  const { patient, historyOrders } = currentCase;

  const [activeMarkerId, setActiveMarkerId] = useState<string>('hba1c');

  // Collect all unique order dates
  const orders = [
    { orderId: currentCase.currentOrderId, date: patient.orders[0].orderDate, label: 'Latest Visit (2026)' },
    ...historyOrders.map((h, i) => ({
      orderId: h.orderId,
      date: h.reportingDate || 'Previous',
      label: `Visit #${i + 1} (${h.reportingDate?.slice(0, 7) || 'Past'})`,
    })),
  ];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
              <History className="h-4 w-4" />
            </span>
            <h3 className="font-semibold text-slate-900">Multi-Order Longitudinal Health Tracker</h3>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Compare biometric trends across previous orders for {patient.name} (Patient ID: #{patient.id}).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-medium">
            {orders.length} Total Visits Recorded
          </span>
        </div>
      </div>

      {/* Overview Table */}
      <div className="mt-5 overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-600">
              <th className="py-3 px-3 font-semibold">Biomarker</th>
              <th className="py-3 px-3 font-semibold">Reference Range</th>
              {orders.map((o, idx) => (
                <th key={o.orderId} className="py-3 px-3 font-semibold text-right">
                  <span>{o.label}</span>
                  <div className="font-mono text-[10px] text-slate-400 font-normal">{o.date}</div>
                </th>
              ))}
              <th className="py-3 px-3 font-semibold text-center">Net Direction</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {Object.entries(MARKERS).slice(0, 9).map(([markerId, def]) => {
              // Find values for each order
              const pastValues = historyOrders.map((ho) => {
                const found = ho.markers.find((m) => m.markerId === markerId);
                return found ? found.value : null;
              });

              // Latest value simulation from case
              let latestVal: number | null = null;
              if (markerId === 'hba1c') latestVal = patientKey === 'gulf_metabolic' ? 6.1 : 5.1;
              else if (markerId === 'glucose_fasting') latestVal = patientKey === 'gulf_metabolic' ? 104 : 86;
              else if (markerId === 'cholesterol_total') latestVal = patientKey === 'gulf_metabolic' ? 215 : 192;
              else if (markerId === 'triglycerides') latestVal = patientKey === 'gulf_metabolic' ? 178 : 110;
              else if (markerId === 'ldl') latestVal = patientKey === 'gulf_metabolic' ? 138 : 98;
              else if (markerId === 'hdl') latestVal = patientKey === 'gulf_metabolic' ? 42 : 56;
              else if (markerId === 'vitamin_d') latestVal = patientKey === 'gulf_metabolic' ? 18.2 : 26.5;
              else if (markerId === 'tsh') latestVal = patientKey === 'quest_thyroid_anemia' ? 5.4 : 2.15;
              else if (markerId === 'hemoglobin') latestVal = patientKey === 'quest_thyroid_anemia' ? 11.4 : 14.8;

              const allValues = [latestVal, ...pastValues];
              if (allValues.every((v) => v === null)) return null;

              const oldest = pastValues[pastValues.length - 1];
              const delta = latestVal !== null && oldest !== null ? latestVal - oldest : null;

              return (
                <tr
                  key={markerId}
                  className="hover:bg-slate-50/50 transition-colors"
                >
                  <td className="py-3 px-3 font-medium text-slate-900">
                    <div>{def.name}</div>
                    <span className="text-[10px] text-slate-400 capitalize">{def.panelName}</span>
                  </td>
                  <td className="py-3 px-3 font-mono text-slate-500">
                    {def.referenceRange.low != null && def.referenceRange.high != null
                      ? `${def.referenceRange.low} – ${def.referenceRange.high}`
                      : def.referenceRange.high != null
                      ? `< ${def.referenceRange.high}`
                      : `> ${def.referenceRange.low}`}{' '}
                    {def.unitHints[0]}
                  </td>

                  {/* Latest Visit */}
                  <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                    {latestVal !== null ? (
                      <span className="inline-block rounded-md bg-teal-50 px-2 py-0.5 text-teal-800">
                        {latestVal} {def.unitHints[0]}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>

                  {/* Past Visits */}
                  {pastValues.map((val, i) => (
                    <td key={i} className="py-3 px-3 text-right font-mono text-slate-600">
                      {val !== null ? `${val} ${def.unitHints[0]}` : '—'}
                    </td>
                  ))}

                  {/* Delta trajectory */}
                  <td className="py-3 px-3 text-center">
                    {delta !== null ? (
                      <span
                        className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                          delta < 0
                            ? 'bg-emerald-50 text-emerald-700'
                            : delta > 0
                            ? 'bg-rose-50 text-rose-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {delta > 0 ? (
                          <ArrowUpRight className="h-3 w-3" />
                        ) : delta < 0 ? (
                          <ArrowDownRight className="h-3 w-3" />
                        ) : null}
                        <span>{delta > 0 ? `+${delta.toFixed(1)}` : delta.toFixed(1)}</span>
                      </span>
                    ) : (
                      <span className="text-slate-400 text-[11px]">Baseline</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
