'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSpreadRanking, useSpreadHistory } from '@/lib/spread.api';
import type { GoldType, GoldBrand, SpreadRankingDto } from '@gpls/shared';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { LiveBadge } from '@/components/ui/LiveBadge';

const GOLD_TYPES: { value: GoldType; label: string }[] = [
  { value: 'MIEN_SJC' as GoldType, label: 'Miếng SJC' },
  { value: 'NHAN_9999' as GoldType, label: 'Nhẫn 9999' },
  { value: 'VANG_24K' as GoldType, label: 'Vàng 24K' },
];

const DAY_OPTIONS = [3, 7, 14, 30];

const CHIP = 'h-[30px] px-[14px] rounded-md cursor-pointer font-mono text-[11px] leading-none font-bold tracking-[0.08em] border';

function SpreadBar({ pct, max }: { pct: number; max: number }) {
  const width = max > 0 ? (pct / max) * 100 : 0;
  return (
    <div className="flex items-center gap-[10px] flex-1">
      <div className="flex-1 h-[6px] bg-ink-3 rounded-[3px] overflow-hidden">
        <div
          className="h-full bg-gold rounded-[3px] transition-[width] duration-300"
          style={{ width: `${width}%` }}
        />
      </div>
      <span className="font-mono text-[12px] leading-none font-semibold [font-variant-numeric:tabular-nums] text-bone min-w-[50px] text-right">
        {pct.toFixed(2)}%
      </span>
    </div>
  );
}

function SparkHistory({ brand, goldType, days }: { brand: GoldBrand; goldType: GoldType; days: number }) {
  const { data = [], isLoading } = useSpreadHistory(brand, goldType, days);

  if (isLoading) {
    return <div className="h-[40px] bg-ink-3 rounded animate-pulse"/>;
  }
  if (data.length < 2) {
    return (
      <div className="h-[40px] flex items-center justify-center">
        <span className="font-mono text-[11px] leading-none font-medium text-mute">không có dữ liệu</span>
      </div>
    );
  }

  const spreads = data.map(p => p.spreadPct);
  const max = Math.max(...spreads);
  const min = Math.min(...spreads);
  const range = max - min || 1;

  const W = 120, H = 40, pad = 2;
  const pts = spreads.map((v, i) => {
    const x = pad + (i / (spreads.length - 1)) * (W - pad * 2);
    const y = pad + ((max - v) / range) * (H - pad * 2);
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ overflow: 'visible' }}>
      <polyline points={pts} fill="none" stroke="var(--gold)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.7"/>
    </svg>
  );
}

const ROW_COLS = '28px 80px 2fr 1.2fr 1.2fr 1fr 120px';

function RankingTable({ items, days }: { items: SpreadRankingDto[]; days: number }) {
  const maxPct = Math.max(...items.map(r => r.spreadPct), 0.01);

  if (items.length === 0) {
    return (
      <div className="p-[48px_22px] text-center text-mute font-display text-[14px] leading-[1.5] font-medium">
        Không có dữ liệu spread
      </div>
    );
  }

  return (
    <>
      <div
        className="grid px-5 py-[10px] gap-3 min-w-[700px] font-mono text-[9px] leading-none font-bold text-mute tracking-[0.14em] uppercase bg-ink-3 border-b border-hairline items-center"
        style={{ gridTemplateColumns: ROW_COLS }}
      >
        <span>#</span>
        <span>thương hiệu</span>
        <span>spread %</span>
        <span className="text-right">mua</span>
        <span className="text-right">bán</span>
        <span className="text-right">spread ₫</span>
        <span className="text-center">xu hướng ({days}d)</span>
      </div>

      {items.map((r, i) => (
        <div
          key={`${r.brand}-${r.goldType}`}
          className={cn(
            'grid px-5 py-[14px] gap-3 min-w-[700px] items-center',
            i !== 0 && 'border-t border-hairline',
            r.isMostEfficient && 'bg-[rgba(212,175,55,0.04)]',
          )}
          style={{ gridTemplateColumns: ROW_COLS }}
        >
          <span className={cn('font-mono text-[13px] leading-none font-bold', i === 0 ? 'text-gold' : 'text-mute')}>
            {i + 1}
          </span>

          <div className="flex items-center gap-[6px]">
            <span className="font-mono text-[12px] leading-none font-bold text-gold tracking-[0.06em]">{r.brand}</span>
            {r.isMostEfficient && (
              <span className="font-mono text-[8px] leading-none font-bold tracking-[0.1em] text-gold-ink bg-gold px-[5px] py-[2px] rounded-[3px]">
                BEST
              </span>
            )}
          </div>

          <SpreadBar pct={r.spreadPct} max={maxPct}/>

          <div className="text-right font-display text-[13px] leading-none font-semibold [font-variant-numeric:tabular-nums]">
            {r.buyPrice.toLocaleString('en-US')}₫
          </div>

          <div className="text-right font-display text-[13px] leading-none font-semibold [font-variant-numeric:tabular-nums]">
            {r.sellPrice.toLocaleString('en-US')}₫
          </div>

          <div className="text-right font-display text-[13px] leading-none font-semibold [font-variant-numeric:tabular-nums] text-down">
            {r.spreadVnd.toLocaleString('en-US')}₫
          </div>

          <div className="flex justify-center">
            <SparkHistory brand={r.brand as GoldBrand} goldType={r.goldType as GoldType} days={days}/>
          </div>
        </div>
      ))}
    </>
  );
}

export default function SpreadPage() {
  const router = useRouter();
  const [goldType, setGoldType] = useState<GoldType>('MIEN_SJC' as GoldType);
  const [days, setDays] = useState(7);

  const { data: ranking = [], isLoading } = useSpreadRanking(goldType);

  const bestSpread = ranking.find(r => r.isMostEfficient);
  const worstSpread = ranking.length > 0 ? ranking[ranking.length - 1] : null;
  const avgSpread = ranking.length > 0
    ? ranking.reduce((s, r) => s + r.spreadPct, 0) / ranking.length
    : null;

  return (
    <div className="min-h-screen bg-ink text-chalk overflow-x-hidden">
      <div className="p-[24px_28px_40px] flex flex-col gap-5 max-w-[1100px] mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <Button variant="ghost" onClick={() => router.back()} className="text-mute flex items-center gap-1 font-mono text-[12px] font-medium mb-3 p-0 h-auto hover:bg-transparent hover:text-bone">
              ← Quay lại
            </Button>
            <h1 className="font-display text-[36px] leading-none font-extrabold m-0 tracking-[-0.025em] capitalize">xếp hạng chênh lệch</h1>
            <p className="font-display text-[14px] leading-[1.5] text-mute m-0 mt-2 max-w-[480px]">
              So sánh spread mua/bán giữa các thương hiệu — spread thấp = giao dịch rẻ hơn.
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-4 flex-wrap items-center">
          <div className="flex gap-[6px] flex-wrap">
            {GOLD_TYPES.map(g => (
              <Button
                key={g.value}
                variant="outline"
                onClick={() => setGoldType(g.value)}
                className={cn(CHIP, goldType === g.value ? 'bg-gold border-gold text-gold-ink hover:bg-gold hover:text-gold-ink' : 'bg-ink-3 border-line text-bone hover:bg-ink-3 hover:text-bone')}
              >
                {g.label}
              </Button>
            ))}
          </div>
          <div className="h-5 w-px bg-hairline"/>
          <div className="flex gap-[6px]">
            {DAY_OPTIONS.map(d => (
              <Button
                key={d}
                variant="outline"
                onClick={() => setDays(d)}
                className={cn(CHIP, days === d ? 'bg-gold border-gold text-gold-ink hover:bg-gold hover:text-gold-ink' : 'bg-ink-3 border-line text-bone hover:bg-ink-3 hover:text-bone')}
              >
                {d}D
              </Button>
            ))}
          </div>
        </div>

        {/* Summary cards */}
        {!isLoading && ranking.length > 0 && (
          <div className="grid grid-cols-3 gap-[14px]">
            {[
              { lbl: 'Hiệu quả nhất', val: bestSpread ? `${bestSpread.brand} · ${bestSpread.spreadPct.toFixed(2)}%` : '—', cls: 'text-gold' },
              { lbl: 'Spread trung bình', val: avgSpread != null ? `${avgSpread.toFixed(2)}%` : '—',                        cls: 'text-chalk' },
              { lbl: 'Spread cao nhất', val: worstSpread ? `${worstSpread.brand} · ${worstSpread.spreadPct.toFixed(2)}%` : '—', cls: 'text-down' },
            ].map(s => (
              <div key={s.lbl} className="bg-ink-2 border border-line rounded-[14px] p-[18px]">
                <div className="font-mono text-[9px] leading-none text-mute tracking-[0.14em] uppercase mb-2">{s.lbl}</div>
                <div className={cn('font-display text-[20px] leading-none font-bold', s.cls)}>{s.val}</div>
              </div>
            ))}
          </div>
        )}

        {/* Ranking table */}
        <div className="bg-ink-2 border border-line rounded-[14px] overflow-hidden overflow-x-auto">
          <div className="px-5 py-4 border-b border-hairline flex justify-between items-center">
            <div className="flex items-center gap-3">
              <h3 className="font-display text-[16px] leading-none font-bold m-0">Bảng xếp hạng</h3>
              <LiveBadge />
            </div>
            <span className="font-mono text-[10px] text-mute">sắp xếp theo spread % · thấp = tốt nhất</span>
          </div>

          {isLoading && (
            <div className="p-[32px_20px] flex flex-col gap-3">
              {[0, 1, 2, 3].map(i => (
                <div key={i} className="grid gap-3 items-center" style={{ gridTemplateColumns: ROW_COLS }}>
                  {[28, 60, 200, 80, 80, 70, 120].map((w, j) => (
                    <div key={j} className="h-[14px] rounded bg-ink-3 animate-pulse" style={{ width: w }}/>
                  ))}
                </div>
              ))}
            </div>
          )}

          {!isLoading && <RankingTable items={ranking} days={days}/>}
        </div>
      </div>
    </div>
  );
}
