import React, { useRef, useState } from 'react';
import { uploadLabReport, LabReportUploadItem } from '../../api/labReport.api';
import { toErrorMessage } from '../../api/httpClient';
import { UploadCloud, CheckCircle2, Loader2 } from 'lucide-react';
import { SmartReport } from '../../modules/smart-report/smartReport.types';

interface Props {
  items: LabReportUploadItem[];
  disabled?: boolean;
  onUploaded: (report?: SmartReport) => void;
  onError: (message: string) => void;
  patientName?: string;
  orderNumber?: string;
  patientId?: number;
  orderId?: number;
  className?: string;
  label?: string;
}

export const LabReportUploadButton: React.FC<Props> = ({
  items,
  disabled,
  onUploaded,
  onError,
  patientName,
  orderNumber,
  patientId,
  orderId,
  className = '',
  label = 'Upload Lab PDF',
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [justUploaded, setJustUploaded] = useState(false);

  const handleFile: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
    const file = e.target.files?.[0];
    e.currentTarget.value = '';
    if (!file) return;

    const lower = file.name.toLowerCase();
    if (!lower.endsWith('.pdf') && !lower.endsWith('.txt') && file.type !== 'application/pdf') {
      onError('Only PDF or laboratory text files are allowed for lab reports');
      return;
    }

    setUploading(true);
    try {
      const res = await uploadLabReport(file, items, {
        patientName,
        orderNumber,
        patientId,
        orderId,
      });

      if (!res.success || !res.data) {
        throw new Error(res.message || 'Upload failed');
      }

      setJustUploaded(true);
      setTimeout(() => setJustUploaded(false), 2500);
      onUploaded(res.data.report);
    } catch (err) {
      onError(toErrorMessage(err, 'Upload failed'));
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf,.txt,text/plain"
        hidden
        onChange={handleFile}
      />
      <button
        type="button"
        disabled={disabled || uploading}
        onClick={() => inputRef.current?.click()}
        className={`inline-flex items-center justify-center gap-2 rounded-lg bg-teal-700 px-4 py-2 text-xs font-semibold text-white shadow-2xs transition-all hover:bg-teal-800 active:scale-98 disabled:pointer-events-none disabled:opacity-50 ${className}`}
      >
        {uploading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin text-teal-200" />
            <span>Parsing Document…</span>
          </>
        ) : justUploaded ? (
          <>
            <CheckCircle2 className="h-4 w-4 text-emerald-300" />
            <span>Report Generated!</span>
          </>
        ) : (
          <>
            <UploadCloud className="h-4 w-4" />
            <span>{label}</span>
          </>
        )}
      </button>
    </>
  );
};
