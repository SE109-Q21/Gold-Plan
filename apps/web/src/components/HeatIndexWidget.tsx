'use client';

import { useState, useMemo } from 'react';
import { useHeatIndex } from '@/lib/heat-index.api';

export function HeatIndexWidget() {
  const { data, isLoading } = useHeatIndex();
  const [showTooltip, setShowTooltip] = useState(false);

  const score = data?.value ?? 0;
  const label = data?.category ?? '—';
  
  // Requirements: Cold (0-33, blue), Warm (34-66, yellow), Hot (67-100, red)
  const zoneColor = score <= 33 ? '#60A5FA' : score <= 66 ? '#FBBF24' : '#EF4444';
  
  const arcLen = Math.PI * 50; // Half circle arc length for r=50
  const visibleArc = (score / 100) * arcLen;

  const needleAngle = (score / 100) * Math.PI;
  const needleX = 60 - Math.cos(needleAngle) * 50;
  const needleY = 66 - Math.sin(needleAngle) * 50;

  const tooltipContent = useMemo(() => {
    if (!data) return '';
    return `Velocity: ${data.priceVelocity.toFixed(2)}% · Spread: ${(data.spreadSize / 1_000_000).toFixed(2)}M₫ · Crossings: ${data.thresholdCrossings}`;
  }, [data]);

  if (isLoading) return (
    <div className="flex items-center justify-center h-32 bg-[var(--ink-2)] border border-[var(--line)] rounded-xl animate-pulse">
       <span className="mono text-[11px] text-[var(--mute)] uppercase tracking-widest">Calculating Market Heat...</span>
    </div>
  );

  return (
    <div className="relative flex flex-col p-5 bg-[var(--ink-2)] border border-[var(--line)] rounded-xl group transition-all hover:border-[var(--gold-glow)]">
      <div className="flex items-center justify-between mb-4">
        <span className="stamp">Market Heat Index</span>
        <div 
          className="relative flex items-center justify-center w-5 h-5 cursor-help border border-[var(--line)] rounded-md text-[10px] font-bold text-[var(--mute)] hover:text-[var(--chalk)] hover:border-[var(--mute)] transition-colors"
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
        >
          ?
          {showTooltip && (
            <div className="absolute bottom-full right-0 mb-2 p-3 w-64 bg-[var(--ink-4)] border border-[var(--line)] rounded-lg shadow-2xl z-50 pointer-events-none">
              <p className="mono text-[11px] text-[var(--chalk)] leading-relaxed">
                <span className="text-[var(--gold)] block mb-1 uppercase tracking-tighter">Algorithm Components</span>
                {tooltipContent}
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-8">
        <svg width="120" height="76" viewBox="0 0 120 76" className="drop-shadow-sm">
          {/* Background arc with 3 segments */}
          <path d="M10 66 A50 50 0 0 1 43 28" stroke="#3b82f6" strokeWidth="8" fill="none" opacity="0.15" />
          <path d="M43 28 A50 50 0 0 1 77 28" stroke="#eab308" strokeWidth="8" fill="none" opacity="0.15" />
          <path d="M77 28 A50 50 0 0 1 110 66" stroke="#ef4444" strokeWidth="8" fill="none" opacity="0.15" />
          
          {/* Active colored arc */}
          <path 
            d="M10 66 A50 50 0 0 1 110 66"
            stroke={zoneColor} strokeWidth="8" fill="none" strokeLinecap="round"
            strokeDasharray={`${visibleArc} ${arcLen}`}
            className="transition-all duration-1000 ease-[var(--ease)]"
          />
          
          {/* Needle */}
          <circle 
            cx={needleX} cy={needleY} r="6" 
            fill={zoneColor} stroke="var(--ink)" strokeWidth="2"
            className="transition-all duration-1000 ease-[var(--ease)]"
          />
        </svg>

        <div>
          <div className="display text-4xl font-extrabold leading-none tracking-tight">
            {score}
          </div>
          <div className="mono text-[10px] text-[var(--mute)] uppercase tracking-[0.2em] mt-2">
            Status: <span style={{ color: zoneColor }}>{label}</span>
          </div>
        </div>
      </div>

      {/* Breakdown Stats */}
      <div className="grid grid-cols-3 gap-2 mt-6 pt-4 border-t border-[var(--hairline)]">
        <div>
          <div className="mono text-[8px] text-[var(--mute)] uppercase tracking-wider mb-1">Velocity</div>
          <div className="tabular text-[13px] font-bold">{data?.priceVelocity.toFixed(2)}%</div>
        </div>
        <div>
          <div className="mono text-[8px] text-[var(--mute)] uppercase tracking-wider mb-1">Spread</div>
          <div className="tabular text-[13px] font-bold">{(data?.spreadSize ? data.spreadSize / 1000000 : 0).toFixed(2)}M</div>
        </div>
        <div>
          <div className="mono text-[8px] text-[var(--mute)] uppercase tracking-wider mb-1">Crosses</div>
          <div className="tabular text-[13px] font-bold">{data?.thresholdCrossings}</div>
        </div>
      </div>
    </div>
  );
}
