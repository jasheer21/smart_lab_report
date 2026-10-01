import React, { useState } from 'react';
import {
  OptimizedInsightsResult,
  BiomarkerTrajectory,
} from '../../modules/smart-report/multiReportInsights.service';
import {
  Activity,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertCircle,
  CheckCircle2,
  Stethoscope,
  ChevronDown,
  ChevronUp,
  Search,
  Sparkles,
  BarChart3,
  LineChart,
  LayoutGrid,
  Table as TableIcon,
  Download,
  CheckSquare,
  Square,
  ShieldCheck,
  HeartPulse,
} from 'lucide-react';
import { TrendChart } from './TrendChart';
import { MultiVisitLineChart } from './charts/MultiVisitLineChart';
import { OrganSystemRadarChart } from './charts/OrganSystemRadarChart';
import { TrajectoryDistributionChart } from './charts/TrajectoryDistributionChart';

interface Props {
  insights: OptimizedInsightsResult;
  onOpenFullSmartReport?: () => void;
}

export const OptimizedInsightsView: React.FC<Props> = ({
  insights,
  onOpenFullSmartReport,
}) => {
  // Filters & State
  const [selectedTrajectoryFilter, setSelectedTrajectoryFilter] = useState<
    'all' | 'improving' | 'worsening' | 'abnormal'
  >('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [expandedMarkerId, setExpandedMarkerId] = useState<string | null>(null);

  // Chart view mode: 'all' | 'curve' | 'radar' | 'dynamics'
  const [activeChartTab, setActiveChartTab] = useState<'all' | 'curve' | 'radar' | 'dynamics'>('all');

  // Interactive Checklist for doctor discussion points
  const [checkedQuestions, setCheckedQuestions] = useState<Record<number, boolean>>({});

  const toggleQuestionCheck = (idx: number) => {
    setCheckedQuestions((prev) => ({
      ...prev,
      [idx]: !prev[idx],
    }));
  };

  const filteredTrajectories = insights.trajectories.filter((t) => {
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const match =
        t.name.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q) ||
        t.markerId.toLowerCase().includes(q);
      if (!match) return false;
    }

    if (selectedTrajectoryFilter === 'improving') return t.trajectory === 'improving';
    if (selectedTrajectoryFilter === 'worsening') return t.trajectory === 'worsening';
    if (selectedTrajectoryFilter === 'abnormal') {
      const latest = t.history[t.history.length - 1];
      return latest && latest.status !== 'normal';
    }
    return true;
  });

  // Calculate overall executive health trajectory index (0 - 100)
  const trajectoryIndex = Math.min(
    98,
    Math.max(40, Math.round(75 + (insights.improvingCount - insights.worseningCount) * 5))
  );

  return (
    <div className="space-y-7 animate-in fade-in duration-300">
      {/* 1. Stunning Executive Medical Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0c2838] via-[#0f3b5e] to-[#081e2b] p-6 sm:p-8 text-white shadow-xl border border-teal-900/30">
        {/* Subtle decorative background light halos */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 h-72 w-72 rounded-full bg-teal-500/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          {/* Left: Branding & Patient Title */}
          <div className="space-y-2 max-w-xl">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-500/20 text-teal-300 border border-teal-500/30">
                <HeartPulse className="h-4 w-4" />
              </span>
              <span className="text-xs font-bold tracking-widest uppercase text-teal-300">
                LONGITUDINAL CLINICAL SYNTHESIS
              </span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Optimized Multi-Report Health Insights
            </h2>

            <p className="text-xs text-slate-300 leading-relaxed">
              Consolidated trajectory analytics derived from{' '}
              <span className="font-semibold text-white">{insights.reports.length} laboratory submissions</span>{' '}
              for <span className="font-semibold text-white">{insights.patientSummary.name}</span>.
              Cross-referenced against verified clinical reference boundaries.
            </p>

            <div className="flex flex-wrap items-center gap-2 pt-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 text-xs text-slate-200 border border-white/10">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                <span>{insights.totalMarkersTracked} Biomarkers Indexed</span>
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-300 border border-emerald-500/30">
                <Sparkles className="h-3.5 w-3.5" />
                <span>{insights.improvingCount} Positive Trajectories</span>
              </span>
            </div>
          </div>

          {/* Right: Circular Health Vitality Score Ring */}
          <div className="flex items-center gap-5 bg-white/5 backdrop-blur-md rounded-2xl p-5 border border-white/10 shadow-inner shrink-0">
            <div className="relative flex h-24 w-24 items-center justify-center">
              {/* SVG Circular Progress Ring */}
              <svg className="h-full w-full -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-white/10"
                  strokeWidth="3.5"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="text-emerald-400 transition-all duration-1000 ease-out"
                  strokeDasharray={`${trajectoryIndex}, 100`}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center text-center">
                <span className="font-mono text-2xl font-bold text-white tabular-nums">
                  {trajectoryIndex}%
                </span>
                <span className="text-[9px] uppercase font-semibold text-emerald-300 tracking-wider">
                  Health Index
                </span>
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-xs font-bold text-white uppercase tracking-wider">
                Trajectory Status
              </p>
              <p className="text-sm font-semibold text-emerald-300">
                {trajectoryIndex >= 80
                  ? 'Strongly Favorable'
                  : trajectoryIndex >= 60
                  ? 'Stable Progression'
                  : 'Requires Review'}
              </p>
              <p className="text-[11px] text-slate-300">
                {insights.reports.length} sequential visits tracked
              </p>
              <button
                type="button"
                onClick={() => window.print()}
                className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-white/10 hover:bg-white/20 px-2.5 py-1 text-[11px] font-semibold text-white transition-all cursor-pointer border border-white/10"
              >
                <Download className="h-3 w-3" />
                <span>Export Summary</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Interactive Graphical Visualizations Deck */}
      <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-[0_4px_25px_-5px_rgba(0,0,0,0.03)] space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-teal-50 text-teal-700 shadow-2xs">
              <BarChart3 className="h-4.5 w-4.5" />
            </span>
            <div>
              <h3 className="text-base font-bold text-slate-900 tracking-tight">
                Graphical Trajectory Visualizations
              </h3>
              <p className="text-xs text-slate-500">
                High-fidelity physiological progression curves and multidimensional balance radar
              </p>
            </div>
          </div>

          {/* Visual Chart Deck Tabs */}
          <div className="flex items-center rounded-xl bg-slate-100 p-1 border border-slate-200/70 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveChartTab('all')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeChartTab === 'all'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Full Deck
            </button>
            <button
              type="button"
              onClick={() => setActiveChartTab('curve')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeChartTab === 'curve'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Trend Curve
            </button>
            <button
              type="button"
              onClick={() => setActiveChartTab('radar')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeChartTab === 'radar'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Organ Radar
            </button>
            <button
              type="button"
              onClick={() => setActiveChartTab('dynamics')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeChartTab === 'dynamics'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Dynamics
            </button>
          </div>
        </div>

        {/* Chart Content Display based on active tab */}
        {(activeChartTab === 'all' || activeChartTab === 'curve') && (
          <MultiVisitLineChart trajectories={insights.trajectories} />
        )}

        {(activeChartTab === 'all' || activeChartTab === 'radar' || activeChartTab === 'dynamics') && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {(activeChartTab === 'all' || activeChartTab === 'radar') && (
              <OrganSystemRadarChart organSystems={insights.organSystems} />
            )}
            {(activeChartTab === 'all' || activeChartTab === 'dynamics') && (
              <TrajectoryDistributionChart
                improvingCount={insights.improvingCount}
                worseningCount={insights.worseningCount}
                totalTracked={insights.totalMarkersTracked}
              />
            )}
          </div>
        )}
      </div>

      {/* 3. Key Findings & Alerts Banner Grid */}
      {insights.keyHighlights.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {insights.keyHighlights.slice(0, 2).map((h, i) => (
            <div
              key={i}
              className={`rounded-2xl border p-5 transition-all shadow-2xs ${
                h.type === 'positive'
                  ? 'border-emerald-200/90 bg-emerald-50/70 text-emerald-950'
                  : 'border-rose-200/90 bg-rose-50/70 text-rose-950'
              }`}
            >
              <div className="flex items-start gap-3.5">
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                    h.type === 'positive'
                      ? 'bg-emerald-500 text-white shadow-xs'
                      : 'bg-rose-500 text-white shadow-xs'
                  }`}
                >
                  {h.type === 'positive' ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : (
                    <AlertCircle className="h-5 w-5" />
                  )}
                </span>
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider">{h.title}</h4>
                  <p className="mt-1 text-xs text-slate-700 leading-relaxed">{h.detail}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 4. Organ Systems Health Scoreboard */}
      <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 tracking-tight">
              Organ System Health Balance
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Comprehensive physiological organ metrics calculated from cumulative diagnostic markers
            </p>
          </div>
          <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
            5 Organ Systems
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {insights.organSystems.map((sys) => {
            const isOptimal = sys.status === 'optimal';
            const isModerate = sys.status === 'moderate';

            return (
              <div
                key={sys.system}
                className="group relative flex flex-col justify-between p-4.5 rounded-2xl border border-slate-200/80 bg-slate-50/50 hover:bg-white hover:border-emerald-300 hover:shadow-md transition-all duration-300"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span
                      className={`h-3 w-3 rounded-full ${
                        isOptimal
                          ? 'bg-emerald-500 ring-4 ring-emerald-500/20'
                          : isModerate
                          ? 'bg-amber-500 ring-4 ring-amber-500/20'
                          : 'bg-rose-500 ring-4 ring-rose-500/20'
                      }`}
                    />
                    <span className="font-mono text-base font-bold text-slate-900 tabular-nums">
                      {sys.score}%
                    </span>
                  </div>

                  <h4 className="mt-2.5 text-xs font-bold text-slate-900 leading-tight">
                    {sys.system}
                  </h4>
                  <p className="mt-1 text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                    {sys.summary}
                  </p>
                </div>

                <div className="mt-3.5 pt-2.5 border-t border-slate-200/60 flex items-center justify-between">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                      isOptimal
                        ? 'bg-emerald-100 text-emerald-800'
                        : isModerate
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {isOptimal ? 'Optimal' : isModerate ? 'Moderate' : 'Review'}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {sys.markerCount} markers
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. Longitudinal Biomarker Progression (With Cards or Table Toggle) */}
      <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 tracking-tight">
              Longitudinal Biomarker Matrix
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Comparative chronological trends tracking individual biomarkers across submissions
            </p>
          </div>

          {/* Controls: Search, Filters, and View Mode Toggle */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search biomarker…"
                className="rounded-xl border border-slate-200 bg-slate-50/70 pl-8.5 pr-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-emerald-600 focus:bg-white transition-all shadow-2xs"
              />
            </div>

            {/* Filter Pills */}
            <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 p-0.5 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setSelectedTrajectoryFilter('all')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  selectedTrajectoryFilter === 'all'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                All ({insights.trajectories.length})
              </button>
              <button
                type="button"
                onClick={() => setSelectedTrajectoryFilter('improving')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  selectedTrajectoryFilter === 'improving'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-emerald-700 hover:text-emerald-900'
                }`}
              >
                Improving ({insights.improvingCount})
              </button>
              <button
                type="button"
                onClick={() => setSelectedTrajectoryFilter('worsening')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  selectedTrajectoryFilter === 'worsening'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-rose-700 hover:text-rose-900'
                }`}
              >
                Attention ({insights.worseningCount})
              </button>
            </div>

            {/* View Mode Toggle: Cards vs Table */}
            <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                  viewMode === 'cards'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-400 hover:text-slate-700'
                }`}
                title="Grid Cards View"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                  viewMode === 'table'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-400 hover:text-slate-700'
                }`}
                title="Medical Table View"
              >
                <TableIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* VIEW 1: Visual Biomarker Cards Grid */}
        {viewMode === 'cards' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTrajectories.length === 0 ? (
              <div className="col-span-full py-12 text-center text-xs text-slate-400 rounded-2xl border border-dashed border-slate-200">
                No biomarkers found matching your search.
              </div>
            ) : (
              filteredTrajectories.map((traj) => {
                const latest = traj.history[traj.history.length - 1];
                const isAbnormal = latest && latest.status !== 'normal';
                const isImproving = traj.trajectory === 'improving';
                const isWorsening = traj.trajectory === 'worsening';

                return (
                  <div
                    key={traj.markerId}
                    className="group flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-5 shadow-[0_2px_12px_-3px_rgba(0,0,0,0.03)] hover:border-slate-300 hover:shadow-[0_8px_24px_-6px_rgba(0,0,0,0.06)] hover:-translate-y-0.5 transition-all duration-300"
                  >
                    <div>
                      {/* Top Header */}
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="font-bold text-slate-900 text-sm group-hover:text-teal-950 transition-colors">
                            {traj.name}
                          </h4>
                          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                            {traj.category}
                          </span>
                        </div>

                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            isImproving
                              ? 'bg-emerald-100 text-emerald-800'
                              : isWorsening
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {isImproving ? (
                            <TrendingDown className="h-3 w-3" />
                          ) : isWorsening ? (
                            <TrendingUp className="h-3 w-3" />
                          ) : (
                            <Minus className="h-3 w-3" />
                          )}
                          <span>{traj.trajectoryText}</span>
                        </span>
                      </div>

                      {/* Current Value & Target Range */}
                      <div className="mt-4 flex items-baseline justify-between border-t border-slate-100 pt-3">
                        <div>
                          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                            Latest Value
                          </span>
                          <p
                            className={`font-mono text-2xl font-bold tabular-nums ${
                              isAbnormal ? 'text-rose-600' : 'text-slate-900'
                            }`}
                          >
                            {traj.latestValue}{' '}
                            <span className="text-xs font-normal text-slate-500 lowercase">
                              {traj.unit}
                            </span>
                          </p>
                        </div>

                        <div className="text-right">
                          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                            Target Range
                          </span>
                          <p className="font-mono text-xs font-semibold text-slate-700 mt-1">
                            {traj.referenceRange.low ?? 0} – {traj.referenceRange.high ?? '--'}{' '}
                            {traj.unit}
                          </p>
                        </div>
                      </div>

                      {/* Chronological Sparkline Points */}
                      <div className="mt-3 flex items-center justify-between rounded-xl bg-slate-50/80 p-2 text-xs">
                        <span className="text-[10px] text-slate-400 font-semibold">
                          Visits ({traj.history.length}):
                        </span>
                        <div className="flex items-center gap-2">
                          {traj.history.map((h, idx) => (
                            <span
                              key={idx}
                              className={`font-mono text-[11px] font-bold px-1.5 py-0.5 rounded ${
                                h.status !== 'normal'
                                  ? 'bg-rose-100 text-rose-700'
                                  : 'bg-white text-slate-700 border border-slate-200'
                              }`}
                              title={`${h.date}: ${h.value} ${traj.unit}`}
                            >
                              {h.value}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Interpretation Note */}
                    <p className="mt-3.5 text-xs text-slate-500 line-clamp-2 leading-relaxed border-t border-slate-100 pt-2.5">
                      {traj.optimizationNote}
                    </p>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* VIEW 2: Medical Tabular Matrix */}
        {viewMode === 'table' && (
          <div className="overflow-x-auto rounded-2xl border border-slate-200/80">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-600 font-semibold">
                  <th className="py-3 px-4">Biomarker</th>
                  <th className="py-3 px-3">Target Range</th>
                  {insights.reports.map((r, i) => (
                    <th key={r.id} className="py-3 px-3 text-right">
                      <span>Visit #{i + 1}</span>
                      <div className="text-[10px] text-slate-400 font-normal font-mono truncate max-w-[90px]">
                        {r.reportingDate}
                      </div>
                    </th>
                  ))}
                  <th className="py-3 px-3 text-right">Trajectory</th>
                  <th className="py-3 px-3 text-center">Trend Chart</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTrajectories.length === 0 ? (
                  <tr>
                    <td colSpan={4 + insights.reports.length} className="py-8 text-center text-slate-400">
                      No biomarkers match the selected filter.
                    </td>
                  </tr>
                ) : (
                  filteredTrajectories.map((traj) => {
                    const isExpanded = expandedMarkerId === traj.markerId;
                    const points = traj.history.map((h) => ({
                      label: h.date,
                      value: h.value,
                    }));

                    return (
                      <React.Fragment key={traj.markerId}>
                        <tr className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4">
                            <p className="font-bold text-slate-900">{traj.name}</p>
                            <p className="text-[10px] text-slate-400">{traj.category}</p>
                          </td>
                          <td className="py-3 px-3 text-slate-600 font-mono text-[11px]">
                            {traj.referenceRange.low ?? 0} – {traj.referenceRange.high ?? '--'}{' '}
                            {traj.unit}
                          </td>
                          {insights.reports.map((rep) => {
                            const match = traj.history.find((h) => h.reportId === rep.id);
                            if (!match) {
                              return (
                                <td key={rep.id} className="py-3 px-3 text-right font-mono text-slate-300">
                                  --
                                </td>
                              );
                            }
                            const isAbnormal = match.status !== 'normal';
                            return (
                              <td key={rep.id} className="py-3 px-3 text-right">
                                <span
                                  className={`font-mono text-xs font-bold tabular-nums ${
                                    isAbnormal ? 'text-rose-600' : 'text-emerald-700'
                                  }`}
                                >
                                  {match.value}
                                </span>
                              </td>
                            );
                          })}
                          <td className="py-3 px-3 text-right">
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                traj.trajectory === 'improving'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : traj.trajectory === 'worsening'
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {traj.trajectory === 'improving' ? (
                                <TrendingDown className="h-3 w-3" />
                              ) : traj.trajectory === 'worsening' ? (
                                <TrendingUp className="h-3 w-3" />
                              ) : (
                                <Minus className="h-3 w-3" />
                              )}
                              <span>{traj.trajectoryText}</span>
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedMarkerId(isExpanded ? null : traj.markerId)
                              }
                              className="p-1 rounded text-slate-400 hover:text-slate-800 hover:bg-slate-200/60 transition-colors cursor-pointer"
                              title="Toggle trend curve"
                            >
                              {isExpanded ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </button>
                          </td>
                        </tr>

                        {isExpanded && (
                          <tr className="bg-slate-50/50">
                            <td colSpan={4 + insights.reports.length} className="p-4">
                              <div className="rounded-xl border border-slate-200 bg-white p-4">
                                <div className="flex items-center justify-between mb-2">
                                  <div>
                                    <h4 className="text-xs font-bold text-slate-900">
                                      {traj.name} Historical Trend Curve
                                    </h4>
                                    <p className="text-[11px] text-slate-500">
                                      {traj.optimizationNote}
                                    </p>
                                  </div>
                                  <span className="font-mono text-xs text-slate-600">
                                    Units: {traj.unit}
                                  </span>
                                </div>
                                <TrendChart
                                  points={points}
                                  range={traj.referenceRange}
                                  unit={traj.unit}
                                />
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 6. Interactive Doctor Consultation Points (Checklist) */}
      <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-teal-50 text-teal-800 shadow-2xs">
              <Stethoscope className="h-4.5 w-4.5" />
            </span>
            <div>
              <h3 className="text-base font-bold text-slate-900 tracking-tight">
                Physician Consultation Talking Points
              </h3>
              <p className="text-xs text-slate-500">
                Check off items you wish to discuss during your next clinical appointment
              </p>
            </div>
          </div>
          <span className="text-[11px] font-bold text-teal-800 bg-teal-50 px-2.5 py-1 rounded-full border border-teal-100">
            Interactive Checklist
          </span>
        </div>

        <div className="space-y-2.5">
          {insights.worseningCount > 0 && (
            <div
              onClick={() => toggleQuestionCheck(1)}
              className="flex items-start gap-3 p-3.5 rounded-2xl border border-slate-100 bg-slate-50/60 hover:bg-slate-50 cursor-pointer transition-colors"
            >
              <div className="mt-0.5 text-teal-700">
                {checkedQuestions[1] ? (
                  <CheckSquare className="h-4.5 w-4.5 text-emerald-600" />
                ) : (
                  <Square className="h-4.5 w-4.5 text-slate-400" />
                )}
              </div>
              <div className="flex-1 text-xs text-slate-700 leading-relaxed">
                <strong className="text-slate-900">Review Biomarker Regressions:</strong> Inquire regarding the{' '}
                <span className="font-semibold text-rose-700">{insights.worseningCount} biomarker(s)</span> that have elevated or shifted away from the target reference range across sequential visits.
              </div>
            </div>
          )}

          {insights.improvingCount > 0 && (
            <div
              onClick={() => toggleQuestionCheck(2)}
              className="flex items-start gap-3 p-3.5 rounded-2xl border border-slate-100 bg-slate-50/60 hover:bg-slate-50 cursor-pointer transition-colors"
            >
              <div className="mt-0.5 text-teal-700">
                {checkedQuestions[2] ? (
                  <CheckSquare className="h-4.5 w-4.5 text-emerald-600" />
                ) : (
                  <Square className="h-4.5 w-4.5 text-slate-400" />
                )}
              </div>
              <div className="flex-1 text-xs text-slate-700 leading-relaxed">
                <strong className="text-slate-900">Confirm Sustained Improvements:</strong> Review positive trends recorded in{' '}
                <span className="font-semibold text-emerald-700">
                  {insights.trajectories.filter((t) => t.trajectory === 'improving').map((m) => m.name).slice(0, 3).join(', ')}
                </span>{' '}
                and assess if current dietary or therapeutic protocols should be continued.
              </div>
            </div>
          )}

          <div
            onClick={() => toggleQuestionCheck(3)}
            className="flex items-start gap-3 p-3.5 rounded-2xl border border-slate-100 bg-slate-50/60 hover:bg-slate-50 cursor-pointer transition-colors"
          >
            <div className="mt-0.5 text-teal-700">
              {checkedQuestions[3] ? (
                <CheckSquare className="h-4.5 w-4.5 text-emerald-600" />
              ) : (
                <Square className="h-4.5 w-4.5 text-slate-400" />
              )}
            </div>
            <div className="flex-1 text-xs text-slate-700 leading-relaxed">
              <strong className="text-slate-900">Longitudinal Retesting Schedule:</strong> Determine recommended laboratory re-testing intervals for markers approaching upper or lower target thresholds.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
