import React, { useMemo, useState } from 'react';
import { PatientDetailsCard, PatientDetails } from '../components/smart-report/PatientDetailsCard';
import { MultipleUploadActionBanner } from '../components/smart-report/MultipleUploadActionBanner';
import { OptimizedInsightsView } from '../components/smart-report/OptimizedInsightsView';
import { SmartReportModal } from '../components/smart-report/SmartReportModal';
import {
  MultiReportEntry,
  buildOptimizedMultiReportInsights,
} from '../modules/smart-report/multiReportInsights.service';
import { SmartReport } from '../modules/smart-report/smartReport.types';
import { CheckCircle2, ShieldAlert } from 'lucide-react';

export const MultiInsightsPage: React.FC = () => {
  const [multiUploadedReports, setMultiUploadedReports] = useState<MultiReportEntry[]>([]);
  const [currentModalReport, setCurrentModalReport] = useState<SmartReport | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const showError = (msg: string) => {
    setErrorMessage(msg);
    setTimeout(() => setErrorMessage(null), 6000);
  };

  // Compute multi-report longitudinal insights
  const optimizedInsights = useMemo(() => {
    return buildOptimizedMultiReportInsights(multiUploadedReports);
  }, [multiUploadedReports]);

  // Dynamic Patient Demographics for Multi-Report Page
  const multiPatientData = useMemo<PatientDetails | null>(() => {
    if (multiUploadedReports.length === 0) return null;
    const p = optimizedInsights.patientSummary;
    return {
      name: p.name,
      patientIdCode: p.idCode,
      isPrimary: true,
      sex: p.sex,
      age: p.age,
      bloodType: '--',
      cprNumber: p.cprNumber,
      contact: p.contact,
      email: '--',
    };
  }, [multiUploadedReports, optimizedInsights]);

  const handleMultiReportsUpdated = (reports: MultiReportEntry[]) => {
    setMultiUploadedReports(reports);
    setErrorMessage(null);
    if (reports.length > 0) {
      showToast(`${reports.length} report(s) indexed. Graphical insights updated!`);
    }
  };

  const handleOpenMultiOptimizedInsights = () => {
    if (multiUploadedReports.length === 0) {
      showToast('Please upload at least one lab report first.');
      return;
    }
    // Scroll smoothly to the insights section
    const el = document.getElementById('optimized-insights-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
    showToast('Graphical insights generated across all uploaded reports!');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Error Alert Banner */}
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

      {/* Section 1: Patient Demographics (Synthesized from multi-report uploads) */}
      <section aria-label="Patient Demographics">
        <PatientDetailsCard patient={multiPatientData} />
      </section>

      {/* Section 2: Multiple Report Upload Action Banner (with #15803D button) */}
      <section aria-label="Multiple Upload Action">
        <MultipleUploadActionBanner
          uploadedReports={multiUploadedReports}
          onReportsUpdated={handleMultiReportsUpdated}
          onOpenOptimizedInsights={handleOpenMultiOptimizedInsights}
          onError={(msg) => showError(msg)}
        />
      </section>

      {/* Section 3: Graphical Insights & Values Dashboard */}
      {multiUploadedReports.length > 0 && (
        <section id="optimized-insights-section" aria-label="Graphical Insights Dashboard">
          <OptimizedInsightsView
            insights={optimizedInsights}
            onOpenFullSmartReport={() => {
              if (multiUploadedReports.length > 0) {
                setCurrentModalReport(
                  multiUploadedReports[multiUploadedReports.length - 1].report
                );
                setIsModalOpen(true);
              }
            }}
          />
        </section>
      )}

      {/* Smart Report Modal */}
      <SmartReportModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        orderId={null}
        patientId={null}
        initialReport={currentModalReport}
        simulateLoadingDelay={false}
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 rounded-2xl bg-slate-900/95 text-white px-5 py-3.5 text-xs font-medium shadow-2xl backdrop-blur-md flex items-center gap-2.5 animate-in fade-in slide-in-from-bottom-4 duration-300 border border-slate-800">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};
