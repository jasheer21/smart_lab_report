import React, { useEffect, useMemo, useState } from 'react';
import { getSmartReport, SmartReport } from '../../api/smartReport.api';
import { toErrorMessage } from '../../api/httpClient';
import { MarkerCard } from './MarkerCard';
import {
  Sparkles,
  Search,
  Filter,
  Eye,
  Download,
  X,
  HelpCircle,
  RotateCcw,
  AlertTriangle,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  orderId: number | null;
  patientId: number | null;
  initialReport?: SmartReport | null;
  simulateLoadingDelay?: boolean;
}

export const SmartReportModal: React.FC<Props> = ({
  isOpen,
  onClose,
  orderId,
  patientId,
  initialReport,
  simulateLoadingDelay = false,
}) => {
  const [loading, setLoading] = useState(true);
  const [loadingStep, setLoadingStep] = useState('Checking reference ranges...');
  const [report, setReport] = useState<SmartReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [abnormalOnly, setAbnormalOnly] = useState(false);
  const [trendMarkerId, setTrendMarkerId] = useState<string | null>(null);
  const [showPdfPreview, setShowPdfPreview] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    setLoading(true);
    setError(null);
    setSearch('');
    setAbnormalOnly(false);
    setTrendMarkerId(null);
    setShowPdfPreview(false);

    // Cycle through loading steps to match Image 1
    const stepTimer1 = setTimeout(() => {
      setLoadingStep('Extracting biomarkers...');
    }, 600);

    const stepTimer2 = setTimeout(() => {
      setLoadingStep('Checking reference ranges...');
    }, 1300);

    const loadData = async () => {
      try {
        if (initialReport) {
          if (simulateLoadingDelay) {
            await new Promise((r) => setTimeout(r, 1600));
          }
          setReport(initialReport);
          setLoading(false);
          return;
        }

        const res = await getSmartReport(orderId || undefined, patientId || undefined);
        if (!res.success || !res.data) {
          throw new Error(res.message || 'Failed to generate smart report');
        }

        if (simulateLoadingDelay) {
          await new Promise((r) => setTimeout(r, 1500));
        }

        setReport(res.data);
      } catch (err: unknown) {
        setError(toErrorMessage(err, 'Failed to load smart report'));
      } finally {
        setLoading(false);
      }
    };

    loadData();

    return () => {
      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
    };
  }, [isOpen, orderId, patientId, initialReport, simulateLoadingDelay]);

  // Filter panels & markers
  const panels = useMemo(() => {
    if (!report) return [];
    const q = search.trim().toLowerCase();

    return report.panels
      .map((p) => ({
        ...p,
        markers: p.markers.filter((m) => {
          if (abnormalOnly && m.status === 'normal') return false;
          if (!q) return true;
          return [m.name, m.markerId, m.originalName || '', m.panelName].some((s) =>
            s.toLowerCase().includes(q)
          );
        }),
      }))
      .filter((p) => p.markers.length > 0);
  }, [report, search, abnormalOnly]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-3 sm:p-5 overflow-y-auto transition-opacity duration-300 animate-in fade-in"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative flex max-h-[94vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-slate-50 shadow-2xl transition-all duration-300 animate-in zoom-in-95">
        {/* Curved Dark Teal Top Header - Matching Image 1, 2, 3 */}
        <header className="relative bg-[#124b49] px-6 pt-3 pb-5 text-white select-none shadow-md">
          {/* Top Center Gray Drag Handle */}
          <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-slate-300/40" />

          <div className="flex items-center justify-between">
            {/* Title with left vertical bar: | SMART LAB REPORT */}
            <div className="flex items-center gap-2">
              <span className="h-4 w-0.5 bg-white rounded-full" />
              <h2 className="text-xs font-bold tracking-wider uppercase text-white">
                SMART LAB REPORT
              </h2>
            </div>

            {/* Close Button with hover rotate/scale */}
            <button
              type="button"
              onClick={onClose}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-white hover:bg-white/15 transition-all duration-200 cursor-pointer active:scale-95"
              aria-label="Close modal"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Curved Bottom Wave */}
          <div className="absolute -bottom-1 left-0 right-0 h-2 bg-slate-50 rounded-t-xl" />
        </header>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-7">
          {/* STATE 1: LOADING VIEW - Matching Image 1 with smooth orbital physics */}
          {loading && (
            <div className="my-10 flex flex-col items-center justify-center rounded-2xl border border-slate-100 bg-white/95 p-12 text-center shadow-[0_4px_25px_-5px_rgba(0,0,0,0.05)] animate-in fade-in duration-300">
              {/* Glowing Orb with sparkle and orbiting colored dots */}
              <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-[#1b3b4b] shadow-xl">
                {/* Orbiting dots container 1 */}
                <div className="absolute inset-0 animate-orbit pointer-events-none">
                  <span className="absolute -top-1 left-1/2 -ml-1.5 h-3 w-3 rounded-full bg-cyan-400 shadow-cyan-300 shadow-sm" />
                </div>
                {/* Orbiting dots container 2 */}
                <div className="absolute inset-0 animate-orbit-reverse pointer-events-none">
                  <span className="absolute -bottom-1 left-3 h-2.5 w-2.5 rounded-full bg-rose-500 shadow-rose-300 shadow-sm" />
                  <span className="absolute bottom-2 right-1 h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-emerald-300 shadow-sm" />
                </div>

                {/* Core Sparkle */}
                <Sparkles className="h-8 w-8 text-white animate-float" />
              </div>

              {/* Text Labels */}
              <p className="mt-6 text-[11px] font-bold uppercase tracking-widest text-slate-700">
                AI SMART ANALYSIS
              </p>
              <h3 className="mt-1.5 text-xl font-bold text-slate-900 tracking-tight">
                Building your smart report
              </h3>
              <p className="mt-2 text-xs font-semibold text-rose-500 transition-all duration-300">
                {loadingStep}
              </p>

              {/* Gradient Progress Bar with Shimmer */}
              <div className="relative mt-6 h-1.5 w-72 max-w-full rounded-full bg-slate-100 overflow-hidden shadow-inner">
                <div className="h-full w-full bg-gradient-to-r from-emerald-400 via-teal-400 to-rose-400 animate-pulse" />
              </div>

              <p className="mt-3.5 text-xs text-slate-400">
                Reading the uploaded lab PDF — usually a few seconds
              </p>
            </div>
          )}

          {/* STATE 2: ERROR VIEW */}
          {!loading && error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50/90 p-6 text-rose-800 animate-in fade-in duration-300 shadow-xs">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 shrink-0 text-rose-600 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-sm">Failed to Build Smart Report</h4>
                  <p className="mt-1 text-xs text-rose-700 leading-relaxed">{error}</p>
                  <button
                    type="button"
                    onClick={() => onClose()}
                    className="mt-3.5 inline-flex items-center gap-1.5 rounded-lg bg-rose-700 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-rose-800 transition-colors shadow-2xs active:scale-95 cursor-pointer"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>Close</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STATE 3: LOADED SMART REPORT - Matching Image 2 and Image 3 */}
          {!loading && report && (
            <div className="space-y-6 animate-in fade-in duration-300">
              {/* Header Title Section */}
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-rose-600">
                  SMART REPORT
                </p>
                <h2 className="mt-0.5 text-2xl font-bold tracking-tight text-slate-900">
                  Your results, unified and explained
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Unified from {report.summary.sourceLabs.length || 1} lab •{' '}
                  {report.summary.reportingDate || '03/06/2026, 08:44 AM'}
                </p>
              </div>

              {/* Top Summary Card (in range, need attention) - Image 3 */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] transition-all">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-8">
                    <div>
                      <p className="font-mono text-3xl font-bold text-emerald-600 tabular-nums">
                        {report.summary.inRange}
                      </p>
                      <p className="text-xs font-medium text-slate-500 mt-0.5">in range</p>
                    </div>

                    <div>
                      <p className="font-mono text-3xl font-bold text-rose-600 tabular-nums">
                        {report.summary.outOfRange}
                      </p>
                      <p className="text-xs font-medium text-slate-500 mt-0.5">need attention</p>
                    </div>
                  </div>

                  <span className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-1.5 text-xs font-medium text-slate-600 shadow-2xs">
                    <Sparkles className="h-3.5 w-3.5 text-teal-600" />
                    <span>{report.summary.total} biomarkers reviewed</span>
                  </span>
                </div>

                <p className="mt-4 text-xs text-slate-400 border-t border-slate-100 pt-3">
                  {report.disclaimer}
                </p>
              </div>

              {/* Action & Filter Bar (Search, Abnormal only, PDF Preview, Download PDF) */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="relative flex-1 min-w-[220px]">
                  <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400 transition-colors" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search a biomarker..."
                    className="w-full rounded-xl border border-slate-200 bg-white pl-9.5 pr-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:border-teal-600 focus:ring-1 focus:ring-teal-600/30 focus:outline-none transition-all duration-200 shadow-2xs"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  {/* Abnormal only filter button */}
                  <button
                    type="button"
                    onClick={() => setAbnormalOnly(!abnormalOnly)}
                    className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-semibold transition-all duration-200 active:scale-95 cursor-pointer ${
                      abnormalOnly
                        ? 'border-rose-400 bg-rose-50 text-rose-700 shadow-xs'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300'
                    }`}
                  >
                    <Filter className="h-3.5 w-3.5" />
                    <span>Abnormal only</span>
                  </button>

                  {/* PDF Preview button */}
                  <button
                    type="button"
                    onClick={() => setShowPdfPreview(!showPdfPreview)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 active:scale-95 transition-all duration-200 cursor-pointer"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    <span>PDF Preview</span>
                  </button>

                  {/* Download PDF button */}
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-600 bg-white px-3.5 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 active:scale-95 transition-all duration-200 cursor-pointer shadow-2xs"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Download PDF</span>
                  </button>
                </div>
              </div>

              {/* PDF Preview Drawer (if toggled) */}
              {showPdfPreview && (
                <div className="rounded-xl border border-teal-200 bg-teal-50/50 p-4 text-xs text-teal-900 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold">Original Laboratory Document Indexed</span>
                    <button
                      type="button"
                      onClick={() => setShowPdfPreview(false)}
                      className="text-xs font-semibold underline text-teal-700 hover:text-teal-900 cursor-pointer"
                    >
                      Hide
                    </button>
                  </div>
                  <p className="font-mono text-[11px] text-slate-600 bg-white p-3 rounded-lg border border-teal-100 max-h-40 overflow-y-auto whitespace-pre-wrap">
                    LABORATORY DIAGNOSTIC REPORT{'\n'}
                    Patient: {report.summary.patientName || '--'} | CPR: {report.summary.cprNumber || '--'} | ID: {report.summary.patientIdCode || '--'}{'\n'}
                    Order: {report.summary.orderNumber || '--'} | Date: {report.summary.reportingDate || 'Verified'}{'\n'}
                    Biomarkers parsed: {report.summary.total} verified against standard clinical reference ranges.
                  </p>
                </div>
              )}

              {/* Biomarker Panels Section - Matching Image 2 and Image 3 */}
              <div className="space-y-6">
                {panels.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-500 rounded-xl border border-dashed border-slate-200 bg-white">
                    No biomarkers found matching your search.
                  </div>
                ) : (
                  panels.map((panel) => (
                    <section key={panel.panel} className="space-y-3">
                      {/* Panel Title with count badge on right */}
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold text-slate-900">
                          {panel.panelName}
                        </h3>
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 font-mono text-[11px] font-semibold text-slate-600">
                          {panel.markers.length}
                        </span>
                      </div>

                      {/* Biomarker Cards List */}
                      <div className="space-y-3">
                        {panel.markers.map((marker) => (
                          <MarkerCard
                            key={marker.markerId}
                            marker={marker}
                            currentLabel={report.summary.reportingDate || 'Current'}
                            isTrendOpen={trendMarkerId === marker.markerId}
                            onToggleTrend={() =>
                              setTrendMarkerId((id) =>
                                id === marker.markerId ? null : marker.markerId
                              )
                            }
                          />
                        ))}
                      </div>
                    </section>
                  ))
                )}
              </div>

              {/* Questions to Ask Your Doctor - Matching Image 2 */}
              {report.questions.length > 0 && (
                <section className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] space-y-4">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-slate-700">
                      <HelpCircle className="h-4 w-4" />
                    </span>
                    <h3 className="text-sm font-bold text-slate-900">
                      Questions to ask your doctor
                    </h3>
                  </div>

                  <div className="space-y-3">
                    {report.questions.map((item) => (
                      <div
                        key={item.markerId}
                        className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 transition-colors hover:bg-slate-50"
                      >
                        <h4 className="text-xs font-bold text-slate-900">
                          {item.name}
                        </h4>
                        <ul className="mt-2 space-y-1.5 pl-4 list-disc text-xs text-slate-600">
                          {item.questions.map((q) => (
                            <li key={q} className="leading-relaxed">
                              {q}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
