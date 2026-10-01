import React, { useRef, useState } from 'react';
import {
  CloudUpload,
  Sparkles,
  Loader2,
  Upload,
  FileText,
  Trash2,
  Plus,
  CheckCircle2,
  Calendar,
  Layers,
} from 'lucide-react';
import { uploadLabReport } from '../../api/labReport.api';
import { MultiReportEntry } from '../../modules/smart-report/multiReportInsights.service';

interface Props {
  uploadedReports: MultiReportEntry[];
  onReportsUpdated: (reports: MultiReportEntry[]) => void;
  onOpenOptimizedInsights: () => void;
  onError: (message: string) => void;
}

export const MultipleUploadActionBanner: React.FC<Props> = ({
  uploadedReports,
  onReportsUpdated,
  onOpenOptimizedInsights,
  onError,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [uploadProgressText, setUploadProgressText] = useState('');

  const hasReports = uploadedReports.length > 0;

  const processFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    setIsUploading(true);
    const newEntries: MultiReportEntry[] = [...uploadedReports];
    const errors: string[] = [];

    for (let i = 0; i < fileArray.length; i++) {
      const file = fileArray[i];
      setUploadProgressText(`Processing (${i + 1}/${fileArray.length}): ${file.name}…`);

      try {
        const res = await uploadLabReport(file, [{ bookingId: i + 1, testId: i + 1 }]);
        if (!res.success || !res.data) {
          throw new Error(res.message || `Validation failed for ${file.name}`);
        }

        const rep = res.data.report;
        newEntries.push({
          id: `rep_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 6)}`,
          fileName: file.name,
          fileSize: file.size,
          uploadedAt: new Date().toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          }),
          report: rep,
          reportingDate: rep.summary.reportingDate || 'Recent',
          labName: rep.summary.sourceLabs[0] || 'Clinical Diagnostic Lab',
          markerCount: rep.summary.total,
          outOfRangeCount: rep.summary.outOfRange,
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : `Failed to process ${file.name}`;
        errors.push(msg);
      }
    }

    if (newEntries.length > uploadedReports.length) {
      onReportsUpdated(newEntries);
    }

    if (errors.length > 0) {
      onError(errors.join(' | '));
    }

    setIsUploading(false);
    setUploadProgressText('');
  };

  const handleFileChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    if (e.target.files) {
      processFiles(e.target.files);
    }
    e.currentTarget.value = '';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!isUploading) {
      setDragActive(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (isUploading) return;
    if (e.dataTransfer.files) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleRemoveReport = (id: string) => {
    const filtered = uploadedReports.filter((r) => r.id !== id);
    onReportsUpdated(filtered);
  };

  // Demo sample batch for fast evaluation
  const handleLoadSampleBatch = () => {
    // Generate 3 sample visits: 6 months ago, 3 months ago, and today
    const sampleDates = ['Oct 12, 2025', 'Jan 15, 2026', 'Mar 28, 2026'];
    const sampleNames = [
      'Comprehensive_Metabolic_Oct2025.pdf',
      'Lipid_Profile_Jan2026.pdf',
      'Unified_Followup_Mar2026.pdf',
    ];

    import('../../data/sampleReports').then(({ SAMPLE_CASES }) => {
      Promise.all([
        import('../../modules/smart-report/smartReport.parser'),
        import('../../modules/smart-report/smartReport.builder'),
      ]).then(([{ parseLabReportText }, { buildSmartReportPayload }]) => {
        const baseCase = SAMPLE_CASES.gulf_metabolic;
        const parsed = parseLabReportText(baseCase.rawReportText);

        const syntheticBatch: MultiReportEntry[] = sampleNames.map((name, idx) => {
          const report = buildSmartReportPayload({
            currentMarkers: parsed.markers.map((m) => {
              // Vary values to show longitudinal progression
              let adjustedVal = m.value;
              if (m.markerId === 'chol_total') adjustedVal = idx === 0 ? 245 : idx === 1 ? 228 : 205;
              if (m.markerId === 'hba1c') adjustedVal = idx === 0 ? 6.7 : idx === 1 ? 6.2 : 5.8;
              if (m.markerId === 'vit_d') adjustedVal = idx === 0 ? 18 : idx === 1 ? 26 : 34;
              return {
                ...m,
                value: adjustedVal,
                status: (adjustedVal > (m.referenceRange.high ?? 999)) ? 'high' : (adjustedVal < (m.referenceRange.low ?? 0)) ? 'low' : 'normal',
              };
            }),
            meta: {
              ...parsed.meta,
              patientName: 'Pranav Kumar',
              reportingDate: sampleDates[idx],
              orderNumber: `ORD-00${idx + 1}9`,
            },
            historyByOrder: [],
          });

          return {
            id: `demo_${idx}`,
            fileName: name,
            fileSize: 145000 + idx * 12000,
            uploadedAt: sampleDates[idx],
            report,
            reportingDate: sampleDates[idx],
            labName: idx === 0 ? 'Al Borg Diagnostics' : 'TASHEEL Medical Lab',
            markerCount: report.summary.total,
            outOfRangeCount: report.summary.outOfRange,
          };
        });

        onReportsUpdated(syntheticBatch);
      });
    });
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`group relative overflow-hidden rounded-2xl border-2 border-dashed p-6 transition-all duration-300 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] ${
        dragActive
          ? 'border-emerald-600 bg-emerald-50/60 ring-4 ring-emerald-600/20 scale-[1.01]'
          : 'border-emerald-200/90 bg-white hover:border-emerald-400 hover:shadow-[0_8px_30px_-6px_rgba(0,0,0,0.06)]'
      }`}
    >
      <div className="flex flex-col gap-5 relative z-10">
        {/* Top Header Row */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div
              className={`flex h-13 w-13 shrink-0 items-center justify-center rounded-2xl transition-all duration-300 ${
                dragActive
                  ? 'bg-emerald-600 text-white scale-110 shadow-md'
                  : 'bg-emerald-50 text-emerald-700 group-hover:bg-emerald-100 group-hover:scale-105'
              }`}
            >
              {dragActive ? (
                <Upload className="h-6 w-6 stroke-[2] animate-bounce" />
              ) : (
                <Layers className="h-6 w-6 stroke-[1.8] text-emerald-700 transition-transform duration-300 group-hover:-translate-y-0.5" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 tracking-tight">
                  Multiple Report Upload & Batch Synthesis
                </h3>
                {hasReports && (
                  <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">
                    {uploadedReports.length} {uploadedReports.length === 1 ? 'Report' : 'Reports'}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Upload multiple historical or panel lab reports (PDF/TXT) to compare trajectories and unlock optimized insights
              </p>
            </div>
          </div>

          {/* Action Buttons Right */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Native hidden file input with 'multiple' enabled */}
            <input
              ref={inputRef}
              type="file"
              multiple
              accept="application/pdf,.pdf,.txt"
              className="hidden"
              onChange={handleFileChange}
              disabled={isUploading}
            />

            {/* Multiple Upload Button with color #15803D */}
            <button
              type="button"
              disabled={isUploading}
              onClick={() => inputRef.current?.click()}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#15803D] hover:bg-[#166534] px-5 py-2.5 text-sm font-semibold text-white shadow-md hover:shadow-lg hover:shadow-emerald-900/20 ring-1 ring-[#15803D]/20 active:scale-95 transition-all duration-200 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              title="Select one or multiple lab report PDFs"
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-white" />
                  <span>Parsing…</span>
                </>
              ) : (
                <>
                  <CloudUpload className="h-4 w-4 text-white" />
                  <span>Upload Multiple Reports</span>
                </>
              )}
            </button>

            {/* View Optimized Insights Button */}
            <button
              type="button"
              disabled={!hasReports}
              onClick={onOpenOptimizedInsights}
              className={`inline-flex items-center justify-center gap-2 rounded-xl border px-5 py-2.5 text-sm font-semibold transition-all duration-300 ${
                hasReports
                  ? 'border-[#0f3b5e] bg-[#0f3b5e] text-white hover:bg-[#0c2e4a] shadow-md hover:shadow-lg active:scale-95 cursor-pointer animate-pulse-glow'
                  : 'border-slate-200 bg-slate-50 text-slate-300 cursor-not-allowed opacity-40 pointer-events-none'
              }`}
              title={!hasReports ? 'Upload at least one report to view insights' : 'Click to view optimized multi-report insights'}
            >
              <Sparkles className={`h-4 w-4 ${hasReports ? 'text-teal-200' : 'text-slate-300'}`} />
              <span>View Optimized Insights</span>
            </button>
          </div>
        </div>

        {/* Upload Status / Progress Indicator */}
        {isUploading && (
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800 bg-emerald-50 px-4 py-2.5 rounded-xl border border-emerald-200 animate-pulse">
            <Loader2 className="h-4 w-4 animate-spin text-emerald-700" />
            <span>{uploadProgressText}</span>
          </div>
        )}

        {/* Uploaded Files Queue / Grid */}
        {hasReports && (
          <div className="pt-2 border-t border-slate-100 space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
              <span>Indexed Reports for Consolidated Analysis:</span>
              <button
                type="button"
                onClick={() => onReportsUpdated([])}
                className="text-rose-600 hover:text-rose-700 font-semibold cursor-pointer"
              >
                Clear all
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {uploadedReports.map((entry, idx) => (
                <div
                  key={entry.id}
                  className="flex items-start justify-between gap-3 p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/70 hover:bg-white hover:border-emerald-300 transition-all shadow-2xs group/card"
                >
                  <div className="flex items-start gap-2.5 min-w-0">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800 font-mono text-xs font-bold mt-0.5">
                      #{idx + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-slate-800 truncate" title={entry.fileName}>
                        {entry.fileName}
                      </p>
                      <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-slate-400" />
                          <span>{entry.reportingDate}</span>
                        </span>
                        <span>•</span>
                        <span className="truncate">{entry.labName}</span>
                      </div>
                      <div className="mt-1.5 flex items-center gap-2">
                        <span className="rounded bg-slate-200/70 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700">
                          {entry.markerCount} markers
                        </span>
                        {entry.outOfRangeCount > 0 ? (
                          <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-semibold text-rose-700">
                            {entry.outOfRangeCount} abnormal
                          </span>
                        ) : (
                          <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">
                            All normal
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveReport(entry.id)}
                    className="text-slate-400 hover:text-rose-600 p-1 rounded-md transition-colors cursor-pointer"
                    title="Remove this report"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}

              {/* Add more button tile */}
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="flex items-center justify-center gap-2 p-3.5 rounded-xl border border-dashed border-emerald-300 bg-emerald-50/40 text-emerald-800 hover:bg-emerald-50 text-xs font-semibold transition-all cursor-pointer min-h-[90px]"
              >
                <Plus className="h-4 w-4" />
                <span>Add another report</span>
              </button>
            </div>
          </div>
        )}

        {/* Quick Demo Helper */}
        {!hasReports && (
          <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-100">
            <span>Drag and drop multiple lab PDF files here, or test with a sample batch:</span>
            <button
              type="button"
              onClick={handleLoadSampleBatch}
              className="font-semibold text-emerald-700 hover:text-emerald-800 underline cursor-pointer"
            >
              Load 3-Visit Longitudinal Batch Demo
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
