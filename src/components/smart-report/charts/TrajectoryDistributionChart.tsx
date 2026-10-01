import React from 'react';
import { TrendingDown, TrendingUp, Minus, Sparkles } from 'lucide-react';

interface Props {
  improvingCount: number;
  worseningCount: number;
  totalTracked: number;
}

export const TrajectoryDistributionChart: React.FC<Props> = ({
  improvingCount,
  worseningCount,
  totalTracked,
}) => {
  const stableCount = Math.max(0, totalTracked - improvingCount - worseningCount);

  const improvingPct = totalTracked > 0 ? Math.round((improvingCount / totalTracked) * 100) : 0;
  const worseningPct = totalTracked > 0 ? Math.round((worseningCount / totalTracked) * 100) : 0;
  const stablePct = totalTracked > 0 ? 100 - improvingPct - worseningPct : 100;

  // Compute overall health progression score
  const overallProgressionScore = Math.min(
    100,
    Math.max(30, Math.round(70 + (improvingCount - worseningCount) * 4))
  );

  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs flex flex-col justify-between">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-50 text-emerald-800">
              <Sparkles className="h-3.5 w-3.5" />
            </span>
            <h4 className="text-sm font-bold text-slate-900">
              Trajectory Dynamics Breakdown
            </h4>
          </div>
          <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
            {totalTracked} Biomarkers
          </span>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          Proportional trajectory distribution across longitudinal laboratory submissions
        </p>
      </div>

      {/* Visual Radial Gauge + Stacked Bar */}
      <div className="my-4 space-y-4">
        {/* Horizontal Stacked Proportional Bar */}
        <div>
          <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
            <span className="text-slate-600">Distribution:</span>
            <span className="text-emerald-700 font-bold">{improvingPct}% Favorable</span>
          </div>

          <div className="h-3 w-full rounded-full bg-slate-100 overflow-hidden flex shadow-inner">
            {improvingPct > 0 && (
              <div
                style={{ width: `${improvingPct}%` }}
                className="bg-emerald-500 transition-all duration-700"
                title={`Improving: ${improvingCount} (${improvingPct}%)`}
              />
            )}
            {stablePct > 0 && (
              <div
                style={{ width: `${stablePct}%` }}
                className="bg-slate-300 transition-all duration-700"
                title={`Stable: ${stableCount} (${stablePct}%)`}
              />
            )}
            {worseningPct > 0 && (
              <div
                style={{ width: `${worseningPct}%` }}
                className="bg-rose-500 transition-all duration-700"
                title={`Needs Review: ${worseningCount} (${worseningPct}%)`}
              />
            )}
          </div>
        </div>

        {/* 3 Metric Pills with graphical icons */}
        <div className="grid grid-cols-3 gap-2">
          {/* Improving */}
          <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/60 p-2.5 text-center">
            <div className="flex items-center justify-center gap-1 text-emerald-700">
              <TrendingDown className="h-3.5 w-3.5" />
              <span className="font-mono text-base font-bold tabular-nums">
                {improvingCount}
              </span>
            </div>
            <p className="text-[10px] font-bold text-emerald-800 uppercase tracking-tight mt-0.5">
              Improving
            </p>
            <span className="text-[10px] text-emerald-600 font-semibold">{improvingPct}%</span>
          </div>

          {/* Stable */}
          <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-2.5 text-center">
            <div className="flex items-center justify-center gap-1 text-slate-700">
              <Minus className="h-3.5 w-3.5" />
              <span className="font-mono text-base font-bold tabular-nums">
                {stableCount}
              </span>
            </div>
            <p className="text-[10px] font-bold text-slate-700 uppercase tracking-tight mt-0.5">
              Stable
            </p>
            <span className="text-[10px] text-slate-500 font-semibold">{stablePct}%</span>
          </div>

          {/* Needs Review */}
          <div className="rounded-xl border border-rose-200/80 bg-rose-50/60 p-2.5 text-center">
            <div className="flex items-center justify-center gap-1 text-rose-700">
              <TrendingUp className="h-3.5 w-3.5" />
              <span className="font-mono text-base font-bold tabular-nums">
                {worseningCount}
              </span>
            </div>
            <p className="text-[10px] font-bold text-rose-800 uppercase tracking-tight mt-0.5">
              Needs Review
            </p>
            <span className="text-[10px] text-rose-600 font-semibold">{worseningPct}%</span>
          </div>
        </div>
      </div>

      {/* Footer Summary */}
      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
        <span>Overall Longevity Index:</span>
        <span className="font-mono text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
          {overallProgressionScore}/100 Positive
        </span>
      </div>
    </div>
  );
};
