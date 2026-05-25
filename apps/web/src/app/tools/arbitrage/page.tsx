'use client';

import { useState } from 'react';
import { useArbitrageOpportunities, useArbitrageHistory } from '@/lib/arbitrage.api';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import type { ArbitrageOpportunityDto } from '@gpls/shared';
import { cn } from '@/lib/utils';

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
      <h1 className="text-gold mb-1 text-[24px] font-bold">⚡ Chênh lệch giá vàng</h1>
      <p className="text-mute text-[14px] mb-6">
        So sánh giá mua/bán giữa các thương hiệu real-time. Mua nơi rẻ nhất, bán nơi cao nhất.
      </p>

      {/* Filters */}
      <div className="flex gap-2 mb-5 flex-wrap items-center">
        {(['', ...GOLD_TYPES] as const).map(gt => (
          <button
            key={gt}
            onClick={() => setGoldTypeFilter(gt)}
            className={cn(
              'px-[14px] py-[5px] rounded-md text-[12px] cursor-pointer border',
              goldTypeFilter === gt
                ? 'bg-gold border-gold text-gold-ink'
                : 'bg-ink-2 border-line text-mute',
            )}
          >
            {gt || 'Tất cả'}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <span className="text-mute text-[13px]">Số lượng:</span>
          <input
            type="number" min={1} max={100} value={quantity}
            onChange={e => setQuantity(Math.max(1, Number(e.target.value)))}
            className="w-[60px] px-2 py-1 rounded-md bg-ink-2 border border-line text-chalk text-[13px] text-center outline-none"
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
        <div className="bg-ink-2 border border-line rounded-[10px] p-4 mt-6">
          <div className="text-mute text-[13px] mb-3">
            Lịch sử chênh lệch 24h — {goldTypeFilter || opps?.[0]?.goldType}
          </div>
          <ResponsiveContainer width="100%" height={120}>
            <LineChart data={history}>
              <XAxis dataKey="recordedAt" hide />
              <YAxis hide domain={['auto', 'auto']} />
              <Tooltip
                formatter={(v: unknown) => [`${fmt(Number(v))}₫`, 'Lợi nhuận']}
                labelFormatter={(l: unknown) => new Date(l as string).toLocaleTimeString('vi-VN')}
                contentStyle={{ background: 'var(--ink-2)', border: '1px solid var(--line)', borderRadius: 6 }}
              />
              <Line type="monotone" dataKey="grossProfit" stroke="#D4AF37" dot={false} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <p className="text-mute text-[11px] mt-4 text-center">
        * Giá tham khảo, chưa tính phí giao dịch và thuế TNCN. Đơn vị có thể khác nhau giữa các thương hiệu.
      </p>
    </div>
  );
}
