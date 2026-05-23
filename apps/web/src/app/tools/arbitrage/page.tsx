'use client';

import { useState } from 'react';
import { useArbitrageOpportunities, useArbitrageHistory } from '@/lib/arbitrage.api';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import type { ArbitrageOpportunityDto } from '@gpls/shared';

const GOLD_TYPES = ['NHAN_9999', 'MIEN_SJC', 'VANG_24K', 'VANG_18K'] as const;

function fmt(n: number) {
  return n.toLocaleString('vi-VN');
}

function OpportunityRow({ opp, quantity }: { opp: ArbitrageOpportunityDto; quantity: number }) {
  return (
    <div style={{
      background: 'var(--ink-2)',
      border: '1px solid #9DCC6E44',
      borderRadius: 10,
      padding: 16,
      marginBottom: 10,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ color: 'var(--chalk-3)', fontSize: 12, marginBottom: 6 }}>
            {opp.goldType.replace('_', ' ')}
          </div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <div>
              <div style={{ color: 'var(--chalk-3)', fontSize: 11 }}>Mua từ</div>
              <div style={{ color: '#58C896', fontWeight: 600 }}>{opp.buyFromBrand}</div>
              <div style={{ fontSize: 12, color: 'var(--chalk-3)' }}>{fmt(opp.buyFromPrice)}₫</div>
            </div>
            <div style={{ alignSelf: 'center', color: 'var(--chalk-3)', fontSize: 18 }}>→</div>
            <div>
              <div style={{ color: 'var(--chalk-3)', fontSize: 11 }}>Bán cho</div>
              <div style={{ color: '#E5484D', fontWeight: 600 }}>{opp.sellToBrand}</div>
              <div style={{ fontSize: 12, color: 'var(--chalk-3)' }}>{fmt(opp.sellToPrice)}₫</div>
            </div>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ color: '#9DCC6E', fontSize: 22, fontWeight: 700 }}>
            +{fmt(opp.grossProfit * quantity)}₫
          </div>
          <div style={{ color: 'var(--chalk-3)', fontSize: 12 }}>
            +{opp.profitPercent.toFixed(2)}% · {quantity} lượng
          </div>
          <div style={{ color: 'var(--chalk-3)', fontSize: 11, marginTop: 4 }}>
            Cập nhật: {new Date(opp.updatedAt).toLocaleTimeString('vi-VN')}
          </div>
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
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '24px 16px' }}>
      <h1 style={{ color: 'var(--gold)', marginBottom: 4, fontSize: 24 }}>⚡ Chênh lệch giá vàng</h1>
      <p style={{ color: 'var(--chalk-3)', fontSize: 14, marginBottom: 24 }}>
        So sánh giá mua/bán giữa các thương hiệu real-time. Mua nơi rẻ nhất, bán nơi cao nhất.
      </p>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        {(['', ...GOLD_TYPES] as const).map(gt => (
          <button key={gt} onClick={() => setGoldTypeFilter(gt)} style={{
            padding: '5px 14px', borderRadius: 6, fontSize: 12, cursor: 'pointer',
            background: goldTypeFilter === gt ? 'var(--gold)' : 'var(--ink-2)',
            color: goldTypeFilter === gt ? '#000' : 'var(--chalk-3)',
            border: `1px solid ${goldTypeFilter === gt ? 'var(--gold)' : 'var(--line)'}`,
          }}>
            {gt || 'Tất cả'}
          </button>
        ))}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: 'var(--chalk-3)', fontSize: 13 }}>Số lượng:</span>
          <input
            type="number" min={1} max={100} value={quantity}
            onChange={e => setQuantity(Math.max(1, Number(e.target.value)))}
            style={{
              width: 60, padding: '4px 8px', borderRadius: 6,
              background: 'var(--ink-2)', border: '1px solid var(--line)',
              color: 'var(--chalk)', fontSize: 13, textAlign: 'center',
            }}
          />
          <span style={{ color: 'var(--chalk-3)', fontSize: 13 }}>lượng</span>
        </div>
      </div>

      {/* Opportunities list */}
      {isLoading && <p style={{ color: 'var(--chalk-3)' }}>Đang tải...</p>}
      {!isLoading && filtered.length === 0 && (
        <div style={{
          background: 'var(--ink-2)', border: '1px solid var(--line)',
          borderRadius: 10, padding: 24, textAlign: 'center', color: 'var(--chalk-3)',
        }}>
          Không có cơ hội chênh lệch giá hiện tại.
          <br /><span style={{ fontSize: 12 }}>Thị trường đang ở trạng thái cân bằng.</span>
        </div>
      )}
      {filtered.map((opp, i) => (
        <OpportunityRow key={i} opp={opp} quantity={quantity} />
      ))}

      {/* 24h history chart */}
      {history && history.length > 1 && (
        <div style={{
          background: 'var(--ink-2)', border: '1px solid var(--line)',
          borderRadius: 10, padding: 16, marginTop: 24,
        }}>
          <div style={{ color: 'var(--chalk-3)', fontSize: 13, marginBottom: 12 }}>
            Lịch sử chênh lệch 24h — {goldTypeFilter || opps?.[0]?.goldType}
          </div>
          <ResponsiveContainer width="100%" height={120}>
            <LineChart data={history}>
              <XAxis dataKey="recordedAt" hide />
              <YAxis hide domain={['auto', 'auto']} />
              <Tooltip
                formatter={(v: any) => [`${fmt(v)}₫`, 'Lợi nhuận']}
                labelFormatter={(l: any) => new Date(l as string).toLocaleTimeString('vi-VN')}
                contentStyle={{ background: 'var(--ink-2)', border: '1px solid var(--line)', borderRadius: 6 }}
              />
              <Line type="monotone" dataKey="grossProfit" stroke="#D4AF37" dot={false} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <p style={{ color: 'var(--chalk-3)', fontSize: 11, marginTop: 16, textAlign: 'center' }}>
        * Giá tham khảo, chưa tính phí giao dịch và thuế TNCN. Đơn vị có thể khác nhau giữa các thương hiệu.
      </p>
    </div>
  );
}
