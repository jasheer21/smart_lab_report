import React, { useState } from 'react';
import { SmartReportModal } from '../components/smart-report/SmartReportModal';
import { PatientDetailsCard, PatientDetails } from '../components/smart-report/PatientDetailsCard';
import { UploadActionBanner } from '../components/smart-report/UploadActionBanner';
import { SmartReport } from '../modules/smart-report/smartReport.types';
import { CheckCircle2, ShieldAlert, Sparkles, RotateCcw } from 'lucide-react';

export const SingleReportPage: React.FC = () => {
  // Real uploaded report state - NO MOCK DATA
  const [currentReport, setCurrentReport] = useState<SmartReport | null>(null);
  
  // Real extracted patient demographics - NO MOCK DATA
  const [patientData, setPatientData] = useState<PatientDetails | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [simulateLoadingDelay, setSimulateLoadingDelay] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [uploadSuccessMsg, setUploadSuccessMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const showError = (msg: string) => {
    setErrorMessage(msg);
    setUploadSuccessMsg(null);
    setTimeout(() => setErrorMessage(null), 6000);
  };

  // Called when a single report is uploaded and verified
  const handleReportLoaded = (report: SmartReport) => {
    setCurrentReport(report);
    setErrorMessage(null);

    // Populate patient demographics ONLY from the uploaded document
    setPatientData({
      name: report.summary.patientName || '--',
      patientIdCode: report.summary.patientIdCode || report.summary.labId || '--',
      isPrimary: Boolean(report.summary.patientName),
      sex: report.summary.sex || '--',
      age: report.summary.age || '--',
      bloodType: report.summary.bloodType || '--',
      cprNumber: report.summary.cprNumber || '--',
      contact: report.summary.contact || '--',
      email: report.summary.email || '--',
    });

    // Do NOT open the modal automatically. Show prompt to click 'view Smart Report'.
    setUploadSuccessMsg(
      "Report uploaded successfully! Please click the 'view Smart Report' button to view your report."
    );
    showToast("Report uploaded! Click 'view Smart Report' to open.");
  };

  const handleOpenSmartReport = () => {
    setErrorMessage(null);
    if (!currentReport) {
      showToast('Please upload a lab report PDF first to generate the smart report.');
      return;
    }
    setSimulateLoadingDelay(true);
    setIsModalOpen(true);
  };

  const handleReset = () => {
    setCurrentReport(null);
    setPatientData(null);
    setUploadSuccessMsg(null);
    setErrorMessage(null);
    showToast('Reset. You can upload a new lab report.');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Error Alert Banner when non-lab document or invalid format is rejected */}
      {errorMessage && (
        <div className="rounded-2xl border border-rose-300/80 bg-rose-50/95 p-5 shadow-xs animate-in fade-in slide-in-from-top-3 duration-300">
          <div className="flex items-start gap-3.5">
            <ShieldAlert className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-sm font-bold text-rose-900">
                Document Structure Not Accepted
              </h4>
              <p className="mt-1 text-xs text-rose-700 leading-relaxed">
                {errorMessage}
              </p>
              <p className="mt-2 text-[11px] text-rose-600 font-medium">
                Note: The system only accepts authentic clinical laboratory reports containing test names, numeric results, and reference ranges.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Success Alert Banner after upload indicating user to click view smart report */}
      {uploadSuccessMsg && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/95 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-in fade-in slide-in-from-top-3 duration-300">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-2xs">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-emerald-950">
                Report Uploaded Successfully
              </h4>
              <p className="text-xs text-emerald-800 mt-0.5">
                {uploadSuccessMsg}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 shrink-0 pl-12 sm:pl-0">
            <button
              type="button"
              onClick={handleOpenSmartReport}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#0f3b5e] text-white text-xs font-semibold px-4 py-2.5 shadow-md hover:bg-[#0c2e4a] hover:shadow-lg active:scale-95 transition-all duration-200 cursor-pointer animate-pulse-glow"
            >
              <Sparkles className="h-3.5 w-3.5 text-teal-300" />
              <span>Click to View Smart Report</span>
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white text-slate-600 text-xs font-medium px-3.5 py-2.5 hover:bg-slate-50 active:scale-95 transition-all duration-200 cursor-pointer shadow-2xs"
              title="Reset and upload another file"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Re-upload</span>
            </button>
          </div>
        </div>
      )}

      {/* Section 1: Patient details show section (Image 4 - No mock data) */}
      <section aria-label="Patient Details">
        <PatientDetailsCard patient={patientData} />
      </section>

      {/* Section 2: Report upload button and view smart report button section (Image 5) */}
      <section aria-label="Upload and View Reports">
        <UploadActionBanner
          hasReport={Boolean(currentReport)}
          onReportLoaded={handleReportLoaded}
          onOpenSmartReport={handleOpenSmartReport}
          onError={(msg) => showError(msg)}
        />
      </section>

      {/* Smart Report Modal (Image 1 loading view -> Image 2 & 3 loaded view) */}
      <SmartReportModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        orderId={null}
        patientId={null}
        initialReport={currentReport}
        simulateLoadingDelay={simulateLoadingDelay}
      />

      {/* Success Notification Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 rounded-2xl bg-slate-900/95 text-white px-5 py-3.5 text-xs font-medium shadow-2xl backdrop-blur-md flex items-center gap-2.5 animate-in fade-in slide-in-from-bottom-4 duration-300 border border-slate-800">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};
