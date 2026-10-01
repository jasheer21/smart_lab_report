import React, { useState } from 'react';
import { LabReportUploadButton } from './LabReportUploadButton';
import { SmartReportModal } from './SmartReportModal';
import { SmartReport } from '../../modules/smart-report/smartReport.types';
import { FileText, Sparkles, Upload } from 'lucide-react';

export interface TestItem {
  bookingId: number;
  testId: number;
  name: string;
  reportId?: string | number;
}

export interface OrderItem {
  id: number;
  orderNumber: string;
  orderDate: string;
  patientId: number;
  patientName: string;
}

interface Props {
  order: OrderItem;
  selectedPatientId: number;
  selectedTests: TestItem[];
  hasPermission?: (perm: string) => boolean;
  onReportLoaded?: (report: SmartReport) => void;
  onOpenReportModal?: () => void;
}

export const OrderLabReports: React.FC<Props> = ({
  order,
  selectedPatientId,
  selectedTests,
  hasPermission = () => true,
  onReportLoaded,
  onOpenReportModal,
}) => {
  const [isSmartOpen, setIsSmartOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const pending = selectedTests
    .filter((t) => !t.reportId)
    .map((t) => ({ bookingId: t.bookingId, testId: t.testId }));

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Upload Button */}
      {hasPermission('LAB_REPORT_UPLOAD') && (
        <LabReportUploadButton
          items={pending.length ? pending : [{ bookingId: 1, testId: 1 }]}
          patientName={order.patientName}
          orderNumber={order.orderNumber}
          orderId={order.id}
          patientId={selectedPatientId}
          onUploaded={(report) => {
            showToast('Lab result PDF successfully uploaded and indexed!');
            if (report && onReportLoaded) {
              onReportLoaded(report);
            }
          }}
          onError={(err) => showToast(`Error: ${err}`)}
        />
      )}

      {/* Smart Report Trigger Button */}
      {hasPermission('SMART_REPORT_VIEW') && (
        <button
          type="button"
          onClick={() => {
            if (onOpenReportModal) {
              onOpenReportModal();
            } else {
              setIsSmartOpen(true);
            }
          }}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 shadow-2xs hover:bg-slate-50 active:scale-98 transition-all"
        >
          <Sparkles className="h-3.5 w-3.5 text-teal-700" />
          <span>Open Smart Report</span>
        </button>
      )}

      {/* Notification Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 rounded-lg bg-slate-900 px-4 py-2.5 text-xs font-medium text-white shadow-lg animate-fade-in">
          {toastMessage}
        </div>
      )}

      {/* Standalone Modal fallback */}
      <SmartReportModal
        isOpen={isSmartOpen}
        onClose={() => setIsSmartOpen(false)}
        orderId={order.id}
        patientId={selectedPatientId}
      />
    </div>
  );
};
