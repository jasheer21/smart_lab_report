import React, { useMemo } from 'react';
import { ReferenceRange } from '../../modules/smart-report/smartReport.types';

export interface TrendPoint {
  label: string;
  value: number;
}

interface Props {
  points: TrendPoint[];
  range: ReferenceRange;
  unit: string;
}

const W = 360;
const H = 150;
const PAD = { top: 18, right: 16, bottom: 26, left: 40 };

export const TrendChart: React.FC<Props> = ({ points, range, unit }) => {
  const chart = useMemo(() => {
    if (!points.length) return null;
    const values = points.map((p) => p.value);
    const bounds = [...values, range.low, range.high].filter((v): v is number => v != null);
    const min = Math.min(...bounds);
    const max = Math.max(...bounds);
    const span = max - min || 1;
    const lo = Math.max(0, min - span * 0.2);
    const hi = max + span * 0.2;

    const x = (i: number) =>
      PAD.left +
      (points.length === 1
        ? (W - PAD.left - PAD.right) / 2
        : (i * (W - PAD.left - PAD.right)) / (points.length - 1));

    const y = (v: number) =>
      PAD.top + ((hi - v) / (hi - lo)) * (H - PAD.top - PAD.bottom);

    const bandTop = range.high != null ? y(range.high) : y(hi);
    const bandBottom = range.low != null ? y(range.low) : y(lo);

    return {
      coords: points.map((p, i) => ({ ...p, cx: x(i), cy: y(p.value) })),
      bandTop: Math.min(bandTop, bandBottom),
      bandBottom: Math.max(bandTop, bandBottom),
      lo,
      hi,
    };
  }, [points, range]);

  if (!chart || !points.length) {
    return (
      <div className="py-4 text-center text-xs text-slate-400">
        No historical comparison data recorded for this biomarker.
      </div>
    );
  }

  const path = chart.coords.map((c, i) => `${i ? 'L' : 'M'}${c.cx.toFixed(1)},${c.cy.toFixed(1)}`).join(' ');

  return (
    <div className="mt-3 rounded-lg border border-slate-100 bg-slate-50/70 p-3">
      <div className="mb-2 flex items-center justify-between text-xs">
        <span className="font-medium text-slate-600">Longitudinal Trend Analysis</span>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-slate-500">
            <span className="inline-block h-2 w-3 rounded-sm bg-emerald-200/80" />
            Normal target zone
          </span>
          <span className="font-mono text-slate-400">Unit: {unit}</span>
        </div>
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full overflow-visible"
        role="img"
        aria-label={`Trend in ${unit}`}
      >
        <defs>
          <linearGradient id="trendLineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#0f766e" />
            <stop offset="100%" stopColor="#0d9488" />
          </linearGradient>
        </defs>

        {/* Normal Reference Range Shaded Band */}
        <rect
          x={PAD.left}
          width={W - PAD.left - PAD.right}
          y={chart.bandTop}
          height={Math.max(4, chart.bandBottom - chart.bandTop)}
          className="fill-emerald-100/70"
          rx={2}
        />

        {/* Reference Range guideline labels */}
        {range.high != null && (
          <text
            x={PAD.left - 4}
            y={chart.bandTop + 3}
            textAnchor="end"
            className="fill-slate-400 text-[9px] font-mono"
          >
            {range.high}
          </text>
        )}
        {range.low != null && (
          <text
            x={PAD.left - 4}
            y={chart.bandBottom + 3}
            textAnchor="end"
            className="fill-slate-400 text-[9px] font-mono"
          >
            {range.low}
          </text>
        )}

        {/* Trend Polyline */}
        <path
          d={path}
          fill="none"
          stroke="url(#trendLineGrad)"
          strokeWidth={2.2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Points & Labels */}
        {chart.coords.map((c, idx) => {
          const isLatest = idx === chart.coords.length - 1;
          return (
            <g key={`${c.label}-${c.cx}`}>
              {/* Outer halo on latest point */}
              {isLatest && (
                <circle
                  cx={c.cx}
                  cy={c.cy}
                  r={7}
                  className="fill-teal-500/20"
                />
              )}
              {/* Core point */}
              <circle
                cx={c.cx}
                cy={c.cy}
                r={isLatest ? 4.5 : 3.5}
                className={isLatest ? 'fill-teal-700 stroke-white stroke-2' : 'fill-teal-600'}
              />
              {/* Numeric value readout above circle */}
              <text
                x={c.cx}
                y={c.cy - 7}
                textAnchor="middle"
                className={`font-mono text-[10px] font-semibold ${
                  isLatest ? 'fill-teal-900 font-bold' : 'fill-slate-700'
                }`}
              >
                {c.value}
              </text>
              {/* Date label on horizontal axis */}
              <text
                x={c.cx}
                y={H - 6}
                textAnchor="middle"
                className="fill-slate-500 text-[9px] font-medium"
              >
                {c.label.slice(0, 10)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};
