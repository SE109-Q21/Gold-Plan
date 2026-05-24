'use client';

import { useArbitrageOpportunities } from '@/lib/arbitrage.api';
import Link from 'next/link';

function fmt(n: number) {
  return n.toLocaleString('vi-VN');
}

export function ArbitrageWidget() {
  const { data: opps, isLoading } = useArbitrageOpportunities();

  return (
    <div style={{
      background: 'var(--ink-2)',
      border: '1px solid var(--line)',
      borderRadius: 12,
      padding: 20,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <span style={{ color: 'var(--gold)', fontWeight: 700, fontSize: 15 }}>
          ⚡ Chênh lệch giá
        </span>
        <span style={{
          background: '#9DCC6E22',
          color: '#9DCC6E',
          padding: '2px 8px',
          borderRadius: 4,
          fontSize: 11,
        }}>● LIVE</span>
      </div>

      {isLoading && (
        <p style={{ color: 'var(--chalk-3)', fontSize: 13 }}>Đang tải...</p>
      )}

      {!isLoading && (!opps || opps.length === 0) && (
        <p style={{ color: 'var(--chalk-3)', fontSize: 13 }}>
          Không có cơ hội chênh lệch hiện tại.
        </p>
      )}

      {opps && opps.slice(0, 3).map((opp, i) => (
        <div key={i} style={{
          background: 'var(--ink-3, #14141A)',
          border: '1px solid var(--line)',
          borderRadius: 8,
          padding: '10px 14px',
          marginBottom: 8,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 12,
        }}>
          <div>
            <div style={{ color: 'var(--chalk-3)', fontSize: 11, marginBottom: 4 }}>
              {opp.goldType.replace('_', ' ')}
            </div>
            <div style={{ fontSize: 13 }}>
              <span style={{ color: '#58C896' }}>Mua {opp.buyFromBrand}</span>
              <span style={{ color: 'var(--chalk-3)', margin: '0 6px' }}>→</span>
              <span style={{ color: '#E5484D' }}>Bán {opp.sellToBrand}</span>
            </div>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ color: '#9DCC6E', fontWeight: 700, fontSize: 17 }}>
              +{fmt(opp.grossProfit)}₫
            </div>
            <div style={{ color: 'var(--chalk-3)', fontSize: 11 }}>
              +{opp.profitPercent.toFixed(2)}% / lượng
            </div>
          </div>
        </div>
      ))}

      <div style={{ textAlign: 'right', marginTop: 8 }}>
        <Link href="/tools/arbitrage" style={{ color: 'var(--gold)', fontSize: 12, textDecoration: 'none' }}>
          Xem chi tiết →
        </Link>
      </div>
    </div>
  );
}
