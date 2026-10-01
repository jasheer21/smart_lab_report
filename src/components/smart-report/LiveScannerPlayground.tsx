import React, { useState } from 'react';
import { SAMPLE_CASES } from '../../data/sampleReports';
import { parseLabReportText } from '../../modules/smart-report/smartReport.parser';
import { buildSmartReportPayload } from '../../modules/smart-report/smartReport.builder';
import { extractDocumentText } from '../../api/ocr.api';
import { SmartReport } from '../../modules/smart-report/smartReport.types';
import {
  FileCode2,
  Play,
  RotateCw,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Upload,
  ArrowRight,
  Info,
} from 'lucide-react';

interface Props {
  onLoadIntoReport: (report: SmartReport) => void;
}

export const LiveScannerPlayground: React.FC<Props> = ({ onLoadIntoReport }) => {
  const [selectedCaseKey, setSelectedCaseKey] = useState<string>('gulf_metabolic');
  const [inputText, setInputText] = useState<string>(SAMPLE_CASES.gulf_metabolic.rawReportText);
  const [isProcessing, setIsProcessing] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [parseLog, setParseLog] = useState<{
    timeMs: number;
    markersFound: number;
    metaExtracted: boolean;
  } | null>(null);

  const handleSelectCase = (key: string) => {
    setSelectedCaseKey(key);
    const caseData = SAMPLE_CASES[key];
    if (caseData) {
      setInputText(caseData.rawReportText);
    }
  };

  const handleRunParser = () => {
    setIsProcessing(true);
    const t0 = performance.now();

    try {
      const parsed = parseLabReportText(inputText);
      const t1 = performance.now();

      const caseData = SAMPLE_CASES[selectedCaseKey] || SAMPLE_CASES.gulf_metabolic;
      const report = buildSmartReportPayload({
        currentMarkers: parsed.markers,
        meta: parsed.meta,
        historyByOrder: caseData.historyOrders,
      });

      setParseLog({
        timeMs: Math.round(t1 - t0),
        markersFound: parsed.markers.length,
        metaExtracted: Boolean(parsed.meta.labName || parsed.meta.patientName),
      });

      onLoadIntoReport(report);
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      await processFile(file);
    }
  };

  const processFile = async (file: File) => {
    setIsProcessing(true);
    try {
      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        const res = await extractDocumentText(file);
        if (!res.success || !res.data) throw new Error(res.message || 'Text extraction failed');
        setInputText(res.data.text);
      } else {
        const text = await file.text();
        setInputText(text);
      }
    } catch (err) {
      console.error('File parsing error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  // Run live preview parse
  const previewParsed = parseLabReportText(inputText);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
              <FileCode2 className="h-4 w-4" />
            </span>
            <h3 className="font-semibold text-slate-900">Deterministic OCR & Parser Studio</h3>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Audit how raw clinical report text maps directly to the biomarker catalog without LLM hallucinations.
          </p>
        </div>

        {/* Preset Sample Selector */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-slate-500">Load Preset:</span>
          {Object.entries(SAMPLE_CASES).map(([key, item]) => (
            <button
              key={key}
              type="button"
              onClick={() => handleSelectCase(key)}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                selectedCaseKey === key
                  ? 'bg-teal-700 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {item.patient.name.split(' ')[0]} ({item.patient.orders[0].labName.split(' ')[0]})
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left Column: Raw Text Input with Drag & Drop */}
        <div className="flex flex-col">
          <div className="mb-2 flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-700">
              Raw Extracted PDF Document Text ({inputText.length} chars)
            </span>
            <span className="text-slate-400">Paste or drag PDF</span>
          </div>

          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={`relative flex-1 rounded-xl border transition-all ${
              dragOver
                ? 'border-teal-500 bg-teal-50/50 ring-2 ring-teal-500/20'
                : 'border-slate-200 bg-slate-900 text-slate-100'
            }`}
          >
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="h-80 w-full resize-none bg-transparent p-4 font-mono text-xs leading-relaxed text-slate-200 placeholder-slate-500 focus:outline-none"
              placeholder="Paste raw PDF text or drag a clinical lab report here…"
            />

            {dragOver && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-teal-900/90 text-white rounded-xl">
                <Upload className="h-8 w-8 text-teal-300 animate-bounce" />
                <p className="mt-2 text-sm font-semibold">Drop PDF lab report to extract text</p>
              </div>
            )}
          </div>

          <div className="mt-3 flex items-center justify-between">
            <label className="cursor-pointer text-xs font-medium text-teal-700 hover:text-teal-800">
              <input
                type="file"
                accept=".pdf,.txt"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) processFile(file);
                }}
              />
              <span>+ Upload PDF or text file</span>
            </label>

            <button
              type="button"
              disabled={isProcessing || !inputText.trim()}
              onClick={handleRunParser}
              className="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-4 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-teal-800 transition-colors disabled:opacity-50"
            >
              <Play className="h-3.5 w-3.5 fill-current" />
              <span>Execute Catalog Parser & View Report</span>
            </button>
          </div>
        </div>

        {/* Right Column: Live Detection & Match Inspector */}
        <div className="flex flex-col rounded-xl border border-slate-200 bg-slate-50/80 p-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Live Parser Output</p>
              <h4 className="text-sm font-semibold text-slate-900">
                {previewParsed.markers.length} Biomarkers Detected
              </h4>
            </div>

            {previewParsed.meta.labName && (
              <span className="rounded-md bg-teal-100/80 px-2 py-0.5 text-xs font-semibold text-teal-800">
                {previewParsed.meta.labName}
              </span>
            )}
          </div>

          {/* Meta extraction badges */}
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <span className="rounded-md bg-white border border-slate-200 px-2 py-1 text-slate-600">
              Patient: <strong className="text-slate-900">{previewParsed.meta.patientName || 'Not detected'}</strong>
            </span>
            <span className="rounded-md bg-white border border-slate-200 px-2 py-1 text-slate-600">
              Date: <strong className="text-slate-900">{previewParsed.meta.reportingDate || 'Not detected'}</strong>
            </span>
            <span className="rounded-md bg-white border border-slate-200 px-2 py-1 text-slate-600">
              Lab ID: <strong className="text-slate-900">{previewParsed.meta.labId || 'N/A'}</strong>
            </span>
          </div>

          {/* Biomarkers detected list */}
          <div className="mt-3 max-h-60 flex-1 space-y-2 overflow-y-auto pr-1">
            {previewParsed.markers.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                No matching biomarkers recognized. Enter a valid lab report text.
              </div>
            ) : (
              previewParsed.markers.map((mk) => {
                const isAbnormal = mk.status !== 'normal';
                return (
                  <div
                    key={mk.markerId}
                    className="flex items-center justify-between rounded-lg border border-slate-200/90 bg-white p-2.5 text-xs transition-colors hover:border-slate-300"
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-slate-900">{mk.name}</span>
                        <span className="text-[10px] text-slate-400">({mk.panel})</span>
                      </div>
                      <p className="mt-0.5 text-[11px] text-slate-500">
                        Matched: <span className="font-mono text-slate-600">"{mk.originalName}"</span> · Confidence: {mk.confidence != null ? (mk.confidence * 100).toFixed(0) : '90'}%
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="font-mono font-bold text-slate-900">
                        {mk.value} <span className="font-normal text-slate-500">{mk.unit}</span>
                      </p>
                      <span
                        className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${
                          isAbnormal
                            ? mk.status === 'high'
                              ? 'bg-rose-100 text-rose-700'
                              : 'bg-amber-100 text-amber-700'
                            : 'bg-emerald-100 text-emerald-700'
                        }`}
                      >
                        {mk.status}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Quick Info bar */}
          <div className="mt-3 pt-3 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
            <span className="flex items-center gap-1">
              <Info className="h-3.5 w-3.5 text-slate-400" />
              Reference ranges prefer catalog standard over lab variations.
            </span>
            {parseLog && (
              <span className="font-mono text-teal-700">
                Parsed in {parseLog.timeMs}ms
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
