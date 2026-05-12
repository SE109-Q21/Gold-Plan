'use client';

interface SparklineProps {
  data: number[];
  w?: number;
  h?: number;
  dir?: 'up' | 'down' | 'flat';
}

export function Sparkline({ data, w = 64, h = 22, dir = 'up' }: SparklineProps) {
  const min = Math.min(...data), max = Math.max(...data);
  const pad = 2;
  const range = max - min || 1;
  const stepX = (w - pad * 2) / (data.length - 1);
  const pts = data.map((v, i) => {
    const x = pad + i * stepX;
    const y = pad + (h - pad * 2) * (1 - (v - min) / range);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  const stroke = dir === 'down' ? 'var(--down)' : dir === 'up' ? 'var(--up)' : 'var(--gold)';
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <polyline points={pts} fill="none" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

interface LineChartProps {
  data: number[];
  w?: number;
  h?: number;
  hoverIdx?: number | null;
}

export function LineChart({ data, w = 720, h = 300, hoverIdx = null }: LineChartProps) {
  const padL = 4, padR = 4, padT = 8, padB = 8;
  const min = Math.min(...data), max = Math.max(...data);
  const range = max - min || 1;
  const stepX = (w - padL - padR) / (data.length - 1);
  const x = (i: number) => padL + i * stepX;
  const y = (v: number) => padT + (h - padT - padB) * (1 - (v - min) / range);
  const path = data.map((v, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ');
  const fillPath = `${path} L ${x(data.length - 1).toFixed(1)} ${(h - padB).toFixed(1)} L ${x(0).toFixed(1)} ${(h - padB).toFixed(1)} Z`;
  const gridY = [0.25, 0.5, 0.75];
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: 'block', width: '100%', height: 'auto' }}>
      <defs>
        <linearGradient id="goldFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#D4AF37" stopOpacity="0.28"/>
          <stop offset="100%" stopColor="#D4AF37" stopOpacity="0"/>
        </linearGradient>
        <linearGradient id="goldStroke" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#8E7321"/>
          <stop offset="20%" stopColor="#D4AF37"/>
          <stop offset="80%" stopColor="#E8C76B"/>
          <stop offset="100%" stopColor="#D4AF37"/>
        </linearGradient>
      </defs>
      {gridY.map((g, i) => (
        <line key={i} x1={padL} x2={w - padR}
          y1={padT + (h - padT - padB) * g} y2={padT + (h - padT - padB) * g}
          stroke="#22232B" strokeWidth="1" strokeDasharray="2 4"/>
      ))}
      <path d={fillPath} fill="url(#goldFill)"/>
      <path d={path} fill="none" stroke="url(#goldStroke)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
      {hoverIdx !== null && hoverIdx >= 0 && hoverIdx < data.length && (
        <g>
          <line x1={x(hoverIdx)} x2={x(hoverIdx)} y1={padT} y2={h - padB}
            stroke="#D4AF37" strokeWidth="0.75" strokeDasharray="2 3" opacity="0.6"/>
          <circle cx={x(hoverIdx)} cy={y(data[hoverIdx])} r="4" fill="#0B0B0F" stroke="#D4AF37" strokeWidth="1.75"/>
        </g>
      )}
    </svg>
  );
}
