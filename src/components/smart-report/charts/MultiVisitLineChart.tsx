import React, { useState } from 'react';
import { BiomarkerTrajectory } from '../../../modules/smart-report/multiReportInsights.service';
import { TrendingDown, TrendingUp, Minus, Sparkles } from 'lucide-react';

interface Props {
  trajectories: BiomarkerTrajectory[];
}

export const MultiVisitLineChart: React.FC<Props> = ({ trajectories }) => {
  const validTrajectories = trajectories.filter((t) => t.history.length > 0);
  const [selectedMarkerId, setSelectedMarkerId] = useState<string>(
    validTrajectories[0]?.markerId || ''
  );

  const activeTrajectory =
    validTrajectories.find((t) => t.markerId === selectedMarkerId) ||
    validTrajectories[0];

  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (!activeTrajectory) {
    return (
      <div className="p-8 text-center text-xs text-slate-400">
        No biomarker trend data available to plot.
      </div>
    );
  }

  const history = activeTrajectory.history;
  const unit = activeTrajectory.unit;
  const lowRef = activeTrajectory.referenceRange.low ?? 0;
  const highRef = activeTrajectory.referenceRange.high ?? (lowRef ? lowRef * 2 : 100);

  // SVG Chart dimensions
  const width = 680;
  const height = 260;
  const padding = { top: 32, right: 40, bottom: 45, left: 60 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  // Determine scale ranges
  const allValues = history.map((h) => h.value);
  const minValue = Math.min(...allValues, lowRef * 0.85);
  const maxValue = Math.max(...allValues, highRef * 1.15);
  const valueSpan = maxValue - minValue || 1;

  const getX = (index: number) => {
    if (history.length <= 1) return padding.left + chartW / 2;
    return padding.left + (index / (history.length - 1)) * chartW;
  };

  const getY = (val: number) => {
    const ratio = (val - minValue) / valueSpan;
    return padding.top + chartH - ratio * chartH;
  };

  // Normal range band coordinates
  const normalYTop = Math.max(padding.top, getY(highRef));
  const normalYBottom = Math.min(padding.top + chartH, getY(lowRef));
  const normalBandH = Math.max(6, normalYBottom - normalYTop);

  // SVG Path coordinates
  const points = history.map((h, i) => ({
    x: getX(i),
    y: getY(h.value),
    value: h.value,
    date: h.date,
    status: h.status,
    labName: h.labName,
  }));

  // Build smooth bezier path
  let pathD = '';
  if (points.length === 1) {
    pathD = `M ${points[0].x - 25} ${points[0].y} L ${points[0].x + 25} ${points[0].y}`;
  } else {
    pathD = points.reduce((acc, curr, idx, arr) => {
      if (idx === 0) return `M ${curr.x} ${curr.y}`;
      const prev = arr[idx - 1];
      const cx = (prev.x + curr.x) / 2;
      return `${acc} C ${cx} ${prev.y}, ${cx} ${curr.y}, ${curr.x} ${curr.y}`;
    }, '');
  }

  // Area fill under the line
  const areaD =
    points.length > 1
      ? `${pathD} L ${points[points.length - 1].x} ${padding.top + chartH} L ${points[0].x} ${
          padding.top + chartH
        } Z`
      : '';

  // Quick biomarker selector chips (top 5 or 6 markers)
  const quickPillMarkers = validTrajectories.slice(0, 6);

  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] transition-all">
      {/* Header and Quick Pill Selection */}
      <div className="space-y-3.5 mb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-base font-bold text-slate-900 tracking-tight">
                {activeTrajectory.name} Trajectory Curve
              </h4>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                  activeTrajectory.trajectory === 'improving'
                    ? 'bg-emerald-100 text-emerald-800'
                    : activeTrajectory.trajectory === 'worsening'
                    ? 'bg-rose-100 text-rose-800'
                    : 'bg-slate-100 text-slate-700'
                }`}
              >
                {activeTrajectory.trajectory === 'improving' ? (
                  <TrendingDown className="h-3 w-3" />
                ) : activeTrajectory.trajectory === 'worsening' ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <Minus className="h-3 w-3" />
                )}
                <span>{activeTrajectory.trajectoryText}</span>
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Normal clinical target range: {lowRef} – {highRef} {unit}
            </p>
          </div>

          {/* Biomarker Dropdown Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-400">All Biomarkers:</span>
            <select
              value={selectedMarkerId}
              onChange={(e) => setSelectedMarkerId(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-500/20 cursor-pointer shadow-2xs"
            >
              {validTrajectories.map((t) => (
                <option key={t.markerId} value={t.markerId}>
                  {t.name} ({t.category})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Quick Selection Pills */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-100">
          <span className="text-[11px] font-semibold text-slate-400 mr-1">Quick Select:</span>
          {quickPillMarkers.map((m) => {
            const isSelected = m.markerId === activeTrajectory.markerId;
            return (
              <button
                key={m.markerId}
                type="button"
                onClick={() => setSelectedMarkerId(m.markerId)}
                className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#0f3b5e] text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                }`}
              >
                <span>{m.name}</span>
                <span className="font-mono text-[10px] opacity-80">
                  ({m.latestValue})
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Responsive SVG Graphic */}
      <div className="relative w-full overflow-hidden rounded-xl bg-gradient-to-b from-slate-50/50 to-white p-2 border border-slate-100">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto select-none overflow-visible"
        >
          <defs>
            {/* Area gradient under curve */}
            <linearGradient id="areaGradientV2" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#14b8a6" stopOpacity="0.25" />
              <stop offset="60%" stopColor="#14b8a6" stopOpacity="0.05" />
              <stop offset="100%" stopColor="#14b8a6" stopOpacity="0.0" />
            </linearGradient>

            {/* Normal reference target band gradient */}
            <linearGradient id="normalBandGradV2" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.14" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.06" />
            </linearGradient>

            <filter id="pointGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#0f766e" floodOpacity="0.3" />
            </filter>
          </defs>

          {/* Horizontal gridlines */}
          <line
            x1={padding.left}
            y1={padding.top}
            x2={padding.left + chartW}
            y2={padding.top}
            stroke="#f1f5f9"
            strokeWidth="1"
          />
          <line
            x1={padding.left}
            y1={padding.top + chartH / 2}
            x2={padding.left + chartW}
            y2={padding.top + chartH / 2}
            stroke="#f1f5f9"
            strokeWidth="1"
          />
          <line
            x1={padding.left}
            y1={padding.top + chartH}
            x2={padding.left + chartW}
            y2={padding.top + chartH}
            stroke="#e2e8f0"
            strokeWidth="1"
          />

          {/* Shaded Normal Reference Zone */}
          <rect
            x={padding.left}
            y={normalYTop}
            width={chartW}
            height={normalBandH}
            fill="url(#normalBandGradV2)"
            rx="6"
          />
          <line
            x1={padding.left}
            y1={normalYTop}
            x2={padding.left + chartW}
            y2={normalYTop}
            stroke="#10b981"
            strokeWidth="1"
            strokeDasharray="4 3"
            opacity="0.65"
          />
          <line
            x1={padding.left}
            y1={normalYBottom}
            x2={padding.left + chartW}
            y2={normalYBottom}
            stroke="#10b981"
            strokeWidth="1"
            strokeDasharray="4 3"
            opacity="0.65"
          />

          {/* Target Zone Label */}
          <text
            x={padding.left + chartW - 10}
            y={normalYTop + 14}
            textAnchor="end"
            fontSize="10"
            fill="#059669"
            fontWeight="bold"
          >
            Target Interval ({lowRef}–{highRef} {unit})
          </text>

          {/* Y Axis Reference Labels */}
          <text
            x={padding.left - 10}
            y={padding.top + 4}
            textAnchor="end"
            fontSize="10"
            fill="#94a3b8"
            fontFamily="monospace"
          >
            {Math.round(maxValue)}
          </text>
          <text
            x={padding.left - 10}
            y={padding.top + chartH}
            textAnchor="end"
            fontSize="10"
            fill="#94a3b8"
            fontFamily="monospace"
          >
            {Math.round(minValue)}
          </text>

          {/* Area Fill */}
          {areaD && <path d={areaD} fill="url(#areaGradientV2)" />}

          {/* Main Trajectory Curve */}
          <path
            d={pathD}
            fill="none"
            stroke="#0d9488"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Data Points and Interactivity */}
          {points.map((pt, i) => {
            const isHovered = hoveredIndex === i;
            const isAbnormal = pt.status !== 'normal';
            return (
              <g
                key={i}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                {/* Guideline on hover */}
                {isHovered && (
                  <line
                    x1={pt.x}
                    y1={padding.top}
                    x2={pt.x}
                    y2={padding.top + chartH}
                    stroke="#94a3b8"
                    strokeWidth="1"
                    strokeDasharray="3 3"
                  />
                )}

                {/* Outer halo */}
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={isHovered ? 10 : 6.5}
                  fill="white"
                  stroke={isAbnormal ? '#f43f5e' : '#0d9488'}
                  strokeWidth={isHovered ? 3.5 : 2.5}
                  filter={isHovered ? 'url(#pointGlow)' : undefined}
                  className="transition-all duration-200"
                />

                {/* Inner core */}
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={isHovered ? 4.5 : 3}
                  fill={isAbnormal ? '#e11d48' : '#0d9488'}
                />

                {/* Tooltip Card on Hover */}
                {isHovered ? (
                  <g>
                    <rect
                      x={pt.x - 55}
                      y={pt.y - 48}
                      width="110"
                      height="34"
                      rx="6"
                      fill="#0f172a"
                      className="shadow-xl"
                    />
                    <text
                      x={pt.x}
                      y={pt.y - 34}
                      textAnchor="middle"
                      fill="#ffffff"
                      fontSize="11"
                      fontWeight="bold"
                      fontFamily="monospace"
                    >
                      {pt.value} {unit}
                    </text>
                    <text
                      x={pt.x}
                      y={pt.y - 20}
                      textAnchor="middle"
                      fill={isAbnormal ? '#fda4af' : '#6ee7b7'}
                      fontSize="9"
                      fontWeight="600"
                    >
                      {isAbnormal ? 'Out of Range' : 'Target In-Range'}
                    </text>
                  </g>
                ) : (
                  /* Standard Value label */
                  <text
                    x={pt.x}
                    y={pt.y - 12}
                    textAnchor="middle"
                    fontSize="11"
                    fontWeight="bold"
                    fill={isAbnormal ? '#be123c' : '#0f172a'}
                    fontFamily="monospace"
                  >
                    {pt.value}
                  </text>
                )}

                {/* X Axis Date Label */}
                <text
                  x={pt.x}
                  y={padding.top + chartH + 22}
                  textAnchor="middle"
                  fontSize="10"
                  fill={isHovered ? '#0f172a' : '#64748b'}
                  fontWeight={isHovered ? 'bold' : '600'}
                >
                  {pt.date}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Footer Insight Box */}
      <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs text-slate-600 gap-2">
        <p className="leading-relaxed">
          <strong className="text-slate-900">Interpretation:</strong>{' '}
          {activeTrajectory.optimizationNote}
        </p>
        <span className="shrink-0 font-mono text-[11px] bg-white border border-slate-200 text-slate-700 px-2.5 py-1 rounded-md shadow-2xs">
          {history.length} Visits Logged
        </span>
      </div>
    </div>
  );
};
