import React, { useRef, useState } from 'react';
import { CloudUpload, Sparkles, Loader2, Upload, CheckCircle2 } from 'lucide-react';
import { uploadLabReport } from '../../api/labReport.api';
import { SmartReport } from '../../modules/smart-report/smartReport.types';

interface Props {
  hasReport: boolean;
  onReportLoaded: (report: SmartReport) => void;
  onOpenSmartReport: () => void;
  onError: (message: string) => void;
}

export const UploadActionBanner: React.FC<Props> = ({
  hasReport,
  onReportLoaded,
  onOpenSmartReport,
  onError,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const processFile = async (file: File) => {
    setIsUploading(true);
    try {
      const res = await uploadLabReport(file, [{ bookingId: 1, testId: 1 }]);
      if (!res.success || !res.data) {
        throw new Error(res.message || 'Upload validation failed');
      }
      onReportLoaded(res.data.report);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Upload failed';
      onError(msg);
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const file = e.target.files?.[0];
    e.currentTarget.value = '';
    if (file) {
      processFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!hasReport && !isUploading) {
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
    if (hasReport || isUploading) return;
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`group relative overflow-hidden rounded-2xl border-2 border-dashed p-6 transition-all duration-300 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] ${
        dragActive
          ? 'border-teal-500 bg-teal-50/60 ring-4 ring-teal-500/20 scale-[1.01]'
          : hasReport
          ? 'border-slate-200/80 bg-white'
          : 'border-teal-200/90 bg-white hover:border-teal-300 hover:shadow-[0_8px_30px_-6px_rgba(0,0,0,0.06)]'
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5 relative z-10">
        {/* Left Side: Cloud Icon and Text */}
        <div className="flex items-center gap-4.5">
          <div
            className={`flex h-13 w-13 shrink-0 items-center justify-center rounded-2xl transition-all duration-300 ${
              dragActive
                ? 'bg-teal-600 text-white scale-110 shadow-md'
                : hasReport
                ? 'bg-emerald-50 text-emerald-600'
                : 'bg-teal-50 text-teal-600 group-hover:bg-teal-100/80 group-hover:scale-105'
            }`}
          >
            {dragActive ? (
              <Upload className="h-6 w-6 stroke-[2] animate-bounce" />
            ) : hasReport ? (
              <CheckCircle2 className="h-6 w-6 stroke-[2] text-emerald-600" />
            ) : (
              <CloudUpload className="h-6 w-6 stroke-[1.8] transition-transform duration-300 group-hover:-translate-y-0.5" />
            )}
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 tracking-tight transition-colors">
              Upload Reports
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {hasReport
                ? 'Report converted and ready for review'
                : 'upload your report and view smartly'}
            </p>
          </div>
        </div>

        {/* Right Side: Action Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Native hidden input */}
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf,.pdf,.txt"
            className="hidden"
            onChange={handleFileChange}
            disabled={hasReport || isUploading}
          />

          {/* Upload Button: Enabled BEFORE upload, Disabled AFTER upload */}
          <button
            type="button"
            disabled={hasReport || isUploading}
            onClick={() => inputRef.current?.click()}
            className={`inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all duration-200 ${
              hasReport
                ? 'bg-slate-100 text-slate-400 border border-slate-200/80 cursor-not-allowed opacity-60 shadow-2xs'
                : 'bg-[#15803D] hover:bg-[#166534] text-white active:scale-95 cursor-pointer shadow-md hover:shadow-lg hover:shadow-emerald-900/20 ring-1 ring-[#15803D]/20'
            }`}
            title={hasReport ? 'Report already uploaded' : 'Click to select a lab report PDF'}
          >
            {isUploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-white" />
                <span>Reading PDF…</span>
              </>
            ) : hasReport ? (
              <>
                <CheckCircle2 className="h-4 w-4 text-slate-400" />
                <span>Report Uploaded</span>
              </>
            ) : (
              <>
                <CloudUpload className="h-4 w-4 text-white" />
                <span>Upload report</span>
              </>
            )}
          </button>

          {/* View Smart Report Button: Disabled BEFORE upload, Enabled AFTER upload */}
          <button
            type="button"
            disabled={!hasReport}
            onClick={onOpenSmartReport}
            className={`inline-flex items-center justify-center gap-2 rounded-xl border px-5 py-2.5 text-sm font-semibold transition-all duration-300 ${
              hasReport
                ? 'border-[#0f3b5e] bg-[#0f3b5e] text-white hover:bg-[#0c2e4a] shadow-md hover:shadow-lg active:scale-95 cursor-pointer animate-pulse-glow'
                : 'border-slate-200 bg-slate-50 text-slate-300 cursor-not-allowed opacity-40 pointer-events-none'
            }`}
            title={!hasReport ? 'Upload a lab report PDF first' : 'Click to view smart report'}
          >
            <Sparkles className={`h-4 w-4 ${hasReport ? 'text-teal-200 animate-spin-slow' : 'text-slate-300'}`} />
            <span>view Smart Report</span>
          </button>
        </div>
      </div>
    </div>
  );
};
