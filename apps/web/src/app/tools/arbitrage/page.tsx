'use client';

import { useState } from 'react';
import { useArbitrageOpportunities, useArbitrageHistory } from '@/lib/arbitrage.api';
import { LineChart, Line, XAxis, YAxis } from 'recharts';
import type { ArbitrageOpportunityDto } from '@gpls/shared';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { LiveBadge } from '@/components/ui/LiveBadge';

const GOLD_TYPES = ['NHAN_9999', 'MIEN_SJC', 'VANG_24K', 'VANG_18K'] as const;

function fmt(n: number) {
  return n.toLocaleString('vi-VN');
}

function OpportunityRow({ opp, quantity }: { opp: ArbitrageOpportunityDto; quantity: number }) {
  return (
    <div className="bg-ink-2 border border-[rgba(157,204,110,0.27)] rounded-[10px] p-4 mb-[10px]">
      <div className="flex justify-between flex-wrap gap-3">
        <div>
          <div className="text-mute text-[12px] mb-[6px]">{opp.goldType.replace('_', ' ')}</div>
          <div className="flex gap-4 flex-wrap">
            <div>
              <div className="text-mute text-[11px]">Mua từ</div>
              <div className="text-[#58C896] font-semibold">{opp.buyFromBrand}</div>
              <div className="text-[12px] text-mute">{fmt(opp.buyFromPrice)}₫</div>
            </div>
            <div className="self-center text-mute text-[18px]">→</div>
            <div>
              <div className="text-mute text-[11px]">Bán cho</div>
              <div className="text-[#E5484D] font-semibold">{opp.sellToBrand}</div>
              <div className="text-[12px] text-mute">{fmt(opp.sellToPrice)}₫</div>
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[#9DCC6E] text-[22px] font-bold">+{fmt(opp.grossProfit * quantity)}₫</div>
          <div className="text-mute text-[12px]">+{opp.profitPercent.toFixed(2)}% · {quantity} lượng</div>
          <div className="text-mute text-[11px] mt-1">Cập nhật: {new Date(opp.updatedAt).toLocaleTimeString('vi-VN')}</div>
        </div>
      </div>
    </div>
  );
}

function HourlyHeatmap({ data }: { data: { recordedAt: string; grossProfit: number }[] }) {
  const hourlyAvg = Array.from({ length: 24 }, (_, h) => {
    const pts = data.filter(d => new Date(d.recordedAt).getHours() === h);
    return pts.length ? pts.reduce((s, p) => s + p.grossProfit, 0) / pts.length : 0;
  });
  const maxVal = Math.max(...hourlyAvg, 1);
  const W = 600, H = 60, CELL_W = W / 24;

  return (
    <div>
      <div className="font-mono text-[10px] leading-none text-mute tracking-[0.1em] uppercase mb-2">
        Trung bình lợi nhuận theo giờ
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="block w-full h-auto">
        {hourlyAvg.map((v, h) => {
          const intensity = v / maxVal;
          const r = Math.round(212 * intensity);
          const g = Math.round(175 * intensity);
          const b = Math.round(55 * intensity);
          const fill = intensity < 0.05 ? 'rgba(60,60,80,0.4)' : `rgba(${r},${g},${b},${0.2 + intensity * 0.8})`;
          return (
            <g key={h}>
              <rect x={h * CELL_W + 1} y={4} width={CELL_W - 2} height={H - 20} rx={3} fill={fill}/>
              <text x={h * CELL_W + CELL_W / 2} y={H - 4} textAnchor="middle"
                fill="var(--mute)" fontSize={8} fontFamily="var(--font-mono)">
                {h}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export default function ArbitragePage() {
  const [goldTypeFilter, setGoldTypeFilter] = useState<string>('');
  const [quantity, setQuantity] = useState(1);
  const { data: opps, isLoading } = useArbitrageOpportunities();
  const { data: history } = useArbitrageHistory(
    goldTypeFilter || (opps?.[0]?.goldType ?? 'NHAN_9999'),
    24,
  );

  const filtered = opps
    ? goldTypeFilter ? opps.filter(o => o.goldType === goldTypeFilter) : opps
    : [];

  return (
    <div className="max-w-[800px] mx-auto p-[24px_16px]">
      <div className="flex items-center gap-3 mb-1">
        <h1 className="text-gold text-[24px] font-bold m-0">⚡ Chênh lệch giá vàng</h1>
        <LiveBadge />
      </div>
      <p className="text-mute text-[14px] mb-6">
        So sánh giá mua/bán giữa các thương hiệu real-time. Mua nơi rẻ nhất, bán nơi cao nhất.
      </p>

      {/* Filters */}
      <div className="flex gap-2 mb-5 flex-wrap items-center">
        {(['', ...GOLD_TYPES] as const).map(gt => (
          <Button
            key={gt}
            variant="outline"
            onClick={() => setGoldTypeFilter(gt)}
            className={cn(
              'px-[14px] py-[5px] h-auto rounded-md font-mono text-[12px]',
              goldTypeFilter === gt
                ? 'bg-gold border-gold text-gold-ink hover:bg-gold hover:text-gold-ink'
                : 'bg-ink-2 border-line text-mute hover:bg-ink-3',
            )}
          >
            {gt || 'Tất cả'}
          </Button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <span className="text-mute text-[13px]">Số lượng:</span>
          <Input
            type="number" min={1} max={100} value={quantity}
            onChange={e => setQuantity(Math.max(1, Number(e.target.value)))}
            className="w-[60px] bg-ink-2 border-line text-chalk text-[13px] text-center focus-visible:ring-gold h-[34px] px-2"
          />
          <span className="text-mute text-[13px]">lượng</span>
        </div>
      </div>

      {isLoading && <p className="text-mute">Đang tải...</p>}
      {!isLoading && filtered.length === 0 && (
        <div className="bg-ink-2 border border-line rounded-[10px] p-6 text-center text-mute">
          Không có cơ hội chênh lệch giá hiện tại.
          <br /><span className="text-[12px]">Thị trường đang ở trạng thái cân bằng.</span>
        </div>
      )}
      {filtered.map((opp, i) => (
        <OpportunityRow key={i} opp={opp} quantity={quantity} />
      ))}

      {/* 24h history chart */}
      {history && history.length > 1 && (
        <div className="bg-ink-2 border border-line rounded-[10px] p-4 mt-6 flex flex-col gap-4">
          <div className="text-mute text-[13px]">
            Lịch sử chênh lệch 24h — {goldTypeFilter || opps?.[0]?.goldType}
          </div>
          <HourlyHeatmap data={history as { recordedAt: string; grossProfit: number }[]} />
          <ChartContainer config={{ grossProfit: { label: 'Lợi nhuận', color: '#D4AF37' } } satisfies ChartConfig} className="h-[100px] w-full">
            <LineChart data={history}>
              <XAxis dataKey="recordedAt" hide />
              <YAxis hide domain={['auto', 'auto']} />
              <ChartTooltip content={<ChartTooltipContent formatter={(v) => [`${fmt(Number(v))}₫`, 'Lợi nhuận']} labelFormatter={(l) => new Date(l as string).toLocaleTimeString('vi-VN')}/>}/>
              <Line type="monotone" dataKey="grossProfit" stroke="var(--color-grossProfit)" dot={false} strokeWidth={2} />
            </LineChart>
          </ChartContainer>
        </div>
      )}

      <p className="text-mute text-[11px] mt-4 text-center">
        * Giá tham khảo, chưa tính phí giao dịch và thuế TNCN. Đơn vị có thể khác nhau giữa các thương hiệu.
      </p>
    </div>
  );
}
