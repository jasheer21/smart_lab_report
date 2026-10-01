import React, { useState } from 'react';
import { MARKERS, PANEL_ORDER, PANEL_DISPLAY_NAMES } from '../../modules/smart-report/smartReport.catalog';
import { BookOpen, Search, CheckCircle2, ChevronRight, HelpCircle, Activity } from 'lucide-react';

export const BiomarkerCatalogBrowser: React.FC = () => {
  const [selectedPanel, setSelectedPanel] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeMarkerKey, setActiveMarkerKey] = useState<string>('hba1c');

  const filteredMarkers = Object.entries(MARKERS).filter(([key, def]) => {
    if (selectedPanel !== 'all' && def.panel !== selectedPanel) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      def.name.toLowerCase().includes(q) ||
      def.panelName.toLowerCase().includes(q) ||
      key.toLowerCase().includes(q) ||
      def.aliases.some((a) => a.toLowerCase().includes(q))
    );
  });

  const activeDef = MARKERS[activeMarkerKey] || MARKERS.hba1c;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
              <BookOpen className="h-4 w-4" />
            </span>
            <h3 className="font-semibold text-slate-900">Deterministic Biomarker Catalog</h3>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Clinical reference ranges, OCR alias patterns, and evidence-based explanations powering the Smart Report engine.
          </p>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search catalog or alias…"
            className="w-full rounded-lg border border-slate-200 pl-8 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:border-teal-600 focus:outline-none"
          />
        </div>
      </div>

      {/* Panels Nav */}
      <div className="mt-4 flex flex-wrap gap-1.5 pb-2">
        <button
          type="button"
          onClick={() => setSelectedPanel('all')}
          className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
            selectedPanel === 'all'
              ? 'bg-slate-900 text-white'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          All Panels ({Object.keys(MARKERS).length})
        </button>
        {PANEL_ORDER.map((panelKey) => {
          const count = Object.values(MARKERS).filter((m) => m.panel === panelKey).length;
          if (count === 0) return null;
          return (
            <button
              key={panelKey}
              type="button"
              onClick={() => setSelectedPanel(panelKey)}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                selectedPanel === panelKey
                  ? 'bg-teal-700 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {PANEL_DISPLAY_NAMES[panelKey] || panelKey} ({count})
            </button>
          );
        })}
      </div>

      {/* Two-Column Explorer Layout */}
      <div className="mt-5 grid grid-cols-1 gap-6 md:grid-cols-12">
        {/* Left: Biomarker Directory List */}
        <div className="md:col-span-5 max-h-[500px] overflow-y-auto space-y-2 pr-1">
          {filteredMarkers.map(([key, def]) => {
            const isSelected = activeMarkerKey === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setActiveMarkerKey(key)}
                className={`w-full text-left rounded-xl border p-3.5 transition-all flex items-center justify-between ${
                  isSelected
                    ? 'border-teal-600 bg-teal-50/40 shadow-xs ring-1 ring-teal-600/30'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <h5 className="font-semibold text-slate-900 text-xs">{def.name}</h5>
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-500">
                    <span>Panel: {def.panelName}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono text-teal-800">
                      {def.referenceRange.low != null && def.referenceRange.high != null
                        ? `${def.referenceRange.low} – ${def.referenceRange.high}`
                        : def.referenceRange.high != null
                        ? `< ${def.referenceRange.high}`
                        : `> ${def.referenceRange.low}`}{' '}
                      {def.unitHints[0]}
                    </span>
                  </div>
                </div>
                <ChevronRight className={`h-4 w-4 shrink-0 ${isSelected ? 'text-teal-700' : 'text-slate-300'}`} />
              </button>
            );
          })}
        </div>

        {/* Right: Detailed Biomarker Specification Inspector */}
        <div className="md:col-span-7 rounded-xl border border-slate-200 bg-slate-50/70 p-5">
          <div className="flex items-start justify-between">
            <div>
              <span className="rounded-sm bg-teal-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-teal-800">
                {activeDef.panelName} Panel
              </span>
              <h4 className="mt-1.5 text-base font-bold text-slate-900">{activeDef.name}</h4>
              <p className="mt-0.5 text-xs text-slate-500">{activeDef.clinicalImportance}</p>
            </div>
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-slate-400">Target Range</span>
              <p className="font-mono text-lg font-bold text-teal-900">
                {activeDef.referenceRange.low != null && activeDef.referenceRange.high != null
                  ? `${activeDef.referenceRange.low} – ${activeDef.referenceRange.high}`
                  : activeDef.referenceRange.high != null
                  ? `< ${activeDef.referenceRange.high}`
                  : `> ${activeDef.referenceRange.low}`}
                <span className="text-xs font-normal text-slate-500 ml-1">
                  {activeDef.unitHints.join(' / ')}
                </span>
              </p>
            </div>
          </div>

          {/* Matched OCR Aliases */}
          <div className="mt-4 rounded-lg border border-slate-200 bg-white p-3">
            <p className="text-xs font-semibold text-slate-700">Lab PDF Recognizers ({activeDef.aliases.length} aliases)</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {activeDef.aliases.map((alias) => (
                <span
                  key={alias}
                  className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[11px] text-slate-700"
                >
                  "{alias}"
                </span>
              ))}
            </div>
          </div>

          {/* Patient-Friendly Explanations */}
          <div className="mt-4 space-y-2">
            <p className="text-xs font-semibold text-slate-700">Clinical Interpretation Logic</p>
            
            <div className="rounded-lg border border-emerald-100 bg-emerald-50/40 p-2.5 text-xs text-slate-700">
              <strong className="text-emerald-800">Normal Range:</strong> {activeDef.explanation.normal}
            </div>

            <div className="rounded-lg border border-rose-100 bg-rose-50/40 p-2.5 text-xs text-slate-700">
              <strong className="text-rose-800">Above Range (High):</strong> {activeDef.explanation.high}
            </div>

            <div className="rounded-lg border border-amber-100 bg-amber-50/40 p-2.5 text-xs text-slate-700">
              <strong className="text-amber-800">Below Range (Low):</strong> {activeDef.explanation.low}
            </div>
          </div>

          {/* Questions for Doctor */}
          <div className="mt-4 rounded-lg border border-teal-100 bg-white p-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-teal-800">
              <HelpCircle className="h-3.5 w-3.5" />
              <span>Prepared Questions for Doctor Consultations</span>
            </div>
            <ul className="mt-2 list-disc pl-4 space-y-1 text-xs text-slate-600">
              {activeDef.questions.high.map((q) => (
                <li key={q}>{q}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
