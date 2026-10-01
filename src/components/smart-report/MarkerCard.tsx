import React from 'react';
import { SmartReportMarker } from '../../modules/smart-report/smartReport.types';
import { TrendChart } from './TrendChart';
import { RangeGaugeBar } from './RangeGaugeBar';
import { TrendingUp, ChevronDown, ChevronUp } from 'lucide-react';

const formatRange = ({ low, high }: SmartReportMarker['referenceRange']) => {
  if (low != null && high != null) return `${low}–${high}`;
  if (high != null) return `< ${high}`;
  if (low != null) return `> ${low}`;
  return 'Not established';
};

interface Props {
  marker: SmartReportMarker;
  currentLabel: string;
  isTrendOpen: boolean;
  onToggleTrend: () => void;
}

export const MarkerCard: React.FC<Props> = ({
  marker,
  currentLabel,
  isTrendOpen,
  onToggleTrend,
}) => {
  const points = [
    ...marker.history.map((h) => ({ label: h.date || `#${h.orderId}`, value: h.value })),
    { label: currentLabel, value: marker.value },
  ];

  const isLow = marker.status === 'low';
  const isHigh = marker.status === 'high';
  const isNormal = marker.status === 'normal';

  const statusLabel = isNormal ? 'In range' : isLow ? 'Low' : 'High';
  const statusBadgeStyle = isNormal
    ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80'
    : isLow
    ? 'bg-sky-50 text-sky-700 border-sky-200/80'
    : 'bg-rose-50 text-rose-700 border-rose-200/80';

  const trendCount = marker.history.length > 0 ? marker.history.length : 1;

  return (
    <article className="group rounded-2xl border border-slate-200/90 bg-white p-5 shadow-[0_2px_12px_-3px_rgba(0,0,0,0.03)] transition-all duration-300 hover:border-slate-300 hover:shadow-[0_8px_24px_-6px_rgba(0,0,0,0.06)] hover:-translate-y-0.5">
      {/* Header: Title + Tag (Left), Value + Status (Right) */}
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div className="flex items-center gap-2">
          <h4 className="font-semibold text-slate-900 text-sm tracking-tight group-hover:text-teal-950 transition-colors">
            {marker.name}
          </h4>
          <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 transition-colors group-hover:bg-slate-200/80">
            {marker.labTag || 'TASHEEL'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="font-mono text-xl font-bold tracking-tight text-slate-900 tabular-nums">
            {marker.value}{' '}
            <span className="text-xs font-normal text-slate-500 lowercase">
              {marker.unit}
            </span>
          </span>
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-semibold border transition-all duration-200 ${statusBadgeStyle}`}
          >
            {statusLabel}
          </span>
        </div>
      </div>

      {/* Horizontal Reference Range Gauge Bar */}
      <RangeGaugeBar
        value={marker.value}
        range={marker.referenceRange}
        unit={marker.unit}
        status={marker.status}
      />

      {/* Sub-bar line: Reference (Left), Trend Link (Right) */}
      <div className="flex items-center justify-between text-xs mt-1">
        <span className="text-slate-500">
          Reference:{' '}
          <span className="font-medium text-slate-700">
            {formatRange(marker.referenceRange)} {marker.unit}
          </span>
        </span>

        <button
          type="button"
          onClick={onToggleTrend}
          className="inline-flex items-center gap-1 font-semibold text-rose-600 hover:text-rose-700 active:scale-95 transition-all duration-200 cursor-pointer"
        >
          <TrendingUp className="h-3.5 w-3.5 transition-transform duration-200 group-hover:scale-110" />
          <span>Trend ({trendCount}) &gt;</span>
        </button>
      </div>

      {/* Plain Language Interpretation */}
      <p className="mt-3 text-xs leading-relaxed text-slate-600 border-t border-slate-100 pt-2.5">
        {marker.explanation}
      </p>

      {/* Expandable Historical Trend Chart */}
      {isTrendOpen && (
        <div className="mt-3 pt-3 border-t border-slate-100 animate-in fade-in slide-in-from-top-2 duration-300">
          <TrendChart
            points={points}
            range={marker.referenceRange}
            unit={marker.unit}
          />
        </div>
      )}
    </article>
  );
};
