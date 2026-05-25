'use client';

import { useArbitrageOpportunities } from '@/lib/arbitrage.api';
import Link from 'next/link';

function fmt(n: number) {
  return n.toLocaleString('vi-VN');
}

export function ArbitrageWidget() {
  const { data: opps, isLoading } = useArbitrageOpportunities();

  return (
    <div className="bg-ink-2 border border-line rounded-[12px] p-5">
      <div className="flex justify-between items-center mb-4">
        <span className="text-gold font-bold text-[15px]">⚡ Chênh lệch giá</span>
        <span className="bg-[rgba(157,204,110,0.13)] text-[#9DCC6E] px-2 py-[2px] rounded text-[11px]">● LIVE</span>
      </div>

      {isLoading && <p className="text-mute text-[13px]">Đang tải...</p>}

      {!isLoading && (!opps || opps.length === 0) && (
        <p className="text-mute text-[13px]">Không có cơ hội chênh lệch hiện tại.</p>
      )}

      {opps && opps.slice(0, 3).map((opp, i) => (
        <div key={i} className="bg-ink-3 border border-line rounded-lg px-[14px] py-[10px] mb-2 flex justify-between items-center gap-3">
          <div>
            <div className="text-mute text-[11px] mb-1">{opp.goldType.replace('_', ' ')}</div>
            <div className="text-[13px]">
              <span className="text-[#58C896]">Mua {opp.buyFromBrand}</span>
              <span className="text-mute mx-[6px]">→</span>
              <span className="text-[#E5484D]">Bán {opp.sellToBrand}</span>
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-[#9DCC6E] font-bold text-[17px]">+{fmt(opp.grossProfit)}₫</div>
            <div className="text-mute text-[11px]">+{opp.profitPercent.toFixed(2)}% / lượng</div>
          </div>
        </div>
      ))}

      <div className="text-right mt-2">
        <Link href="/tools/arbitrage" className="text-gold text-[12px] no-underline">
          Xem chi tiết →
        </Link>
      </div>
    </div>
  );
}
