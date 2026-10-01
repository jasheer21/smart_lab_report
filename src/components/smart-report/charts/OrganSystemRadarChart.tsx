import React, { useState } from 'react';
import { OrganSystemScore } from '../../../modules/smart-report/multiReportInsights.service';
import { ShieldCheck, Info } from 'lucide-react';

interface Props {
  organSystems: OrganSystemScore[];
}

export const OrganSystemRadarChart: React.FC<Props> = ({ organSystems }) => {
  const [hoveredSystem, setHoveredSystem] = useState<OrganSystemScore | null>(null);

  // SVG Geometry
  const size = 300;
  const center = size / 2;
  const radius = 105;
  const count = organSystems.length || 5;

  // Compute vertex positions
  const getCoordinates = (index: number, scorePercentage: number) => {
    const angle = (Math.PI * 2 * index) / count - Math.PI / 2;
    const r = (scorePercentage / 100) * radius;
    return {
      x: center + r * Math.cos(angle),
      y: center + r * Math.sin(angle),
    };
  };

  const getLabelCoordinates = (index: number) => {
    const angle = (Math.PI * 2 * index) / count - Math.PI / 2;
    const r = radius + 28;
    return {
      x: center + r * Math.cos(angle),
      y: center + r * Math.sin(angle),
    };
  };

  // Polygon vertices based on organ scores
  const polygonPoints = organSystems
    .map((s, i) => {
      const { x, y } = getCoordinates(i, s.score);
      return `${x},${y}`;
    })
    .join(' ');

  // Radial grid rings: 25%, 50%, 75%, 100%
  const gridLevels = [25, 50, 75, 100];

  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs flex flex-col justify-between">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
              <ShieldCheck className="h-3.5 w-3.5" />
            </span>
            <h4 className="text-sm font-bold text-slate-900">
              Organ Balance Spider Graph
            </h4>
          </div>
          <span className="text-[11px] font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-100">
            5 Domains
          </span>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          Multidimensional equilibrium radar across key physiological domains
        </p>
      </div>

      {/* SVG Radar Visualization */}
      <div className="relative my-2 flex items-center justify-center">
        <svg
          viewBox={`0 0 ${size} ${size}`}
          className="w-full max-w-[280px] h-auto overflow-visible select-none"
        >
          <defs>
            <radialGradient id="radarFillGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#0f766e" stopOpacity="0.15" />
            </radialGradient>
          </defs>

          {/* Grid Rings */}
          {gridLevels.map((lvl) => {
            const r = (lvl / 100) * radius;
            return (
              <circle
                key={lvl}
                cx={center}
                cy={center}
                r={r}
                fill="none"
                stroke="#e2e8f0"
                strokeWidth={lvl === 100 ? '1.5' : '1'}
                strokeDasharray={lvl === 100 ? undefined : '3 3'}
              />
            );
          })}

          {/* Spokes radiating to each axis */}
          {organSystems.map((_, i) => {
            const { x, y } = getCoordinates(i, 100);
            return (
              <line
                key={i}
                x1={center}
                y1={center}
                x2={x}
                y2={y}
                stroke="#e2e8f0"
                strokeWidth="1"
              />
            );
          })}

          {/* Radar Health Polygon Area */}
          <polygon
            points={polygonPoints}
            fill="url(#radarFillGrad)"
            stroke="#0f766e"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />

          {/* Individual Data Vertices & Interactive Dots */}
          {organSystems.map((sys, i) => {
            const { x, y } = getCoordinates(i, sys.score);
            const isHovered = hoveredSystem?.system === sys.system;
            const isAbnormal = sys.status !== 'optimal';

            return (
              <g
                key={sys.system}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredSystem(sys)}
                onMouseLeave={() => setHoveredSystem(null)}
              >
                <circle
                  cx={x}
                  cy={y}
                  r={isHovered ? 7 : 4.5}
                  fill="white"
                  stroke={isAbnormal ? '#f43f5e' : '#10b981'}
                  strokeWidth="2"
                  className="transition-all duration-200"
                />
                <circle
                  cx={x}
                  cy={y}
                  r={isHovered ? 3.5 : 2}
                  fill={isAbnormal ? '#f43f5e' : '#10b981'}
                />
              </g>
            );
          })}

          {/* Outer Domain Labels */}
          {organSystems.map((sys, i) => {
            const { x, y } = getLabelCoordinates(i);
            const isHovered = hoveredSystem?.system === sys.system;

            return (
              <text
                key={sys.system}
                x={x}
                y={y}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize="10"
                fontWeight={isHovered ? 'bold' : '600'}
                fill={isHovered ? '#0f766e' : '#475569'}
                className="cursor-pointer transition-colors duration-200"
                onMouseEnter={() => setHoveredSystem(sys)}
                onMouseLeave={() => setHoveredSystem(null)}
              >
                {sys.system.split(' ')[0]} ({sys.score}%)
              </text>
            );
          })}
        </svg>
      </div>

      {/* Dynamic Hover Detail / Footer */}
      <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3 min-h-[58px] text-xs">
        {hoveredSystem ? (
          <div>
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900">
                {hoveredSystem.system} Score: {hoveredSystem.score}%
              </span>
              <span
                className={`rounded-full px-2 py-0.2 text-[10px] font-bold ${
                  hoveredSystem.status === 'optimal'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-rose-100 text-rose-800'
                }`}
              >
                {hoveredSystem.status === 'optimal' ? 'Optimal' : 'Needs Attention'}
              </span>
            </div>
            <p className="mt-1 text-[11px] text-slate-600 line-clamp-1">
              {hoveredSystem.actionableInsight}
            </p>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-slate-400 text-[11px] h-full">
            <Info className="h-3.5 w-3.5 shrink-0" />
            <span>Hover over any axis node to inspect physiological recommendations.</span>
          </div>
        )}
      </div>
    </div>
  );
};
