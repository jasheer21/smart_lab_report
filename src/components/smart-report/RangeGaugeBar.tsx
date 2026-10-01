import React from 'react';
import { ReferenceRange } from '../../modules/smart-report/smartReport.types';

interface Props {
  value: number;
  range: ReferenceRange;
  unit: string;
  status: 'high' | 'low' | 'normal';
}

export const RangeGaugeBar: React.FC<Props> = ({ value, range, unit, status }) => {
  const lowLimit = range.low ?? 0;
  const highLimit = range.high ?? (lowLimit ? lowLimit * 2 : 100);

  // Compute position percentage on the bar
  // 0% - 25%: Low (Red)
  // 25% - 75%: Normal (Green)
  // 75% - 100%: High (Red)
  let percent = 50;

  if (value <= lowLimit) {
    // In low zone (0% to 25%)
    const span = lowLimit || 1;
    const ratio = Math.max(0, value / span);
    percent = 25 * ratio;
  } else if (value >= highLimit) {
    // In high zone (75% to 100%)
    const excess = value - highLimit;
    const buffer = (highLimit - lowLimit) || 10;
    const ratio = Math.min(1, excess / buffer);
    percent = 75 + 25 * ratio;
  } else {
    // In normal zone (25% to 75%)
    const normalSpan = highLimit - lowLimit || 1;
    const ratio = (value - lowLimit) / normalSpan;
    percent = 25 + 50 * ratio;
  }

  // Pin boundary between 3% and 97% so it doesn't overflow
  const pinLeft = Math.min(96, Math.max(4, percent));

  const isAbnormal = status !== 'normal';

  return (
    <div className="w-full max-w-xl mx-auto my-3 select-none">
      {/* Top Labels */}
      <div className="flex items-center justify-between text-[11px] font-semibold mb-1.5 px-1 select-none">
        <span className="text-rose-600 transition-colors">Low</span>
        <span className="font-mono text-slate-600 font-medium text-[10px]">{range.low ?? '0'}</span>
        <span className="text-emerald-700 font-bold transition-colors">Normal</span>
        <span className="font-mono text-slate-600 font-medium text-[10px]">{range.high ?? '--'}</span>
        <span className="text-rose-600 transition-colors">High</span>
      </div>

      {/* Horizontal Gradient Track with inner shadow */}
      <div className="relative h-2.5 w-full rounded-full bg-gradient-to-r from-rose-500 via-emerald-500 to-rose-500 shadow-inner overflow-visible">
        {/* Slider Pin Marker with smooth cubic-bezier easing */}
        <div
          className="absolute -top-1.5 -ml-2.5 flex flex-col items-center transition-all duration-700 ease-out pointer-events-none"
          style={{ left: `${pinLeft}%` }}
        >
          {/* Circular Pin Outer Ring */}
          <div className="h-5 w-5 rounded-full border-2 border-white bg-white shadow-md flex items-center justify-center transition-transform hover:scale-110">
            {/* Core Dot (Red if abnormal, Green if normal) with gentle pulse */}
            <div
              className={`h-2.5 w-2.5 rounded-full transition-colors duration-300 ${
                isAbnormal ? 'bg-rose-600 shadow-rose-300 shadow-xs' : 'bg-emerald-600 shadow-emerald-300 shadow-xs'
              }`}
            />
          </div>
          {/* Subtle downward pointer notch */}
          <div
            className={`w-0 h-0 border-l-[3px] border-l-transparent border-r-[3px] border-r-transparent border-t-[4px] transition-colors duration-300 ${
              isAbnormal ? 'border-t-rose-600' : 'border-t-emerald-600'
            }`}
          />
        </div>
      </div>
    </div>
  );
};
