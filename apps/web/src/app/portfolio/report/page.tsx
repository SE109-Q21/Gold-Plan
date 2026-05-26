'use client';

import { usePortfolio, useTransactions, usePortfolioAllocation } from '@/lib/portfolio.api';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const GOLD_TYPE_LABELS: Record<string, string> = {
  MIEN_SJC: 'Vàng miếng SJC',
  NHAN_9999: 'Nhẫn tròn 9999',
  VANG_24K:  'Vàng 24K',
  VANG_18K:  'Vàng 18K',
};

function fmtVnd(n: number) {
  return n.toLocaleString('vi-VN') + ' ₫';
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('vi-VN', { year: 'numeric', month: '2-digit', day: '2-digit' });
}
function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString('vi-VN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function ReportContent() {
  const router = useRouter();
  const { data: portfolio, isLoading: pLoading } = usePortfolio();
  const { data: txData, isLoading: txLoading } = useTransactions(1);
  const { data: allocation } = usePortfolioAllocation();
  const today = new Date().toLocaleDateString('vi-VN', { year: 'numeric', month: '2-digit', day: '2-digit' });

  const isLoading = pLoading || txLoading;

  function handlePrint() { window.print(); }

  return (
    <>
      {/* Print-specific styles injected inline */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          .no-print { display: none !important; }
          body { background: #fff !important; color: #111 !important; }
          .print-page { background: #fff !important; color: #111 !important; padding: 0 !important; }
          .print-card { background: #fff !important; border: 1px solid #ddd !important; }
          .print-text-mute { color: #666 !important; }
          .print-text-dark { color: #111 !important; }
          .print-border { border-color: #e0e0e0 !important; }
          @page { margin: 20mm; size: A4 portrait; }
        }
      `}}/>

      <div className="print-page min-h-screen bg-[#0a0a0d] text-chalk">

        {/* Toolbar — hidden on print */}
        <div className="no-print flex items-center justify-between px-8 py-4 bg-ink-2 border-b border-line sticky top-0 z-10">
          <Button
            variant="ghost"
            onClick={() => router.push('/portfolio')}
            className="text-mute flex items-center gap-2 font-mono text-[12px] font-semibold h-auto py-1 hover:bg-transparent hover:text-bone"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M5 12l7-7M5 12l7 7"/>
            </svg>
            Quay lại danh mục
          </Button>
          <div className="flex items-center gap-3">
            <span className="font-mono text-[11px] text-mute">Nhấn in hoặc Ctrl+P để xuất PDF</span>
            <Button onClick={handlePrint} className="h-9 px-5 font-mono text-[12px] font-bold gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 6 2 18 2 18 9"/>
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
                <rect x="6" y="14" width="12" height="8"/>
              </svg>
              In / Xuất PDF
            </Button>
          </div>
        </div>

        {/* Report body */}
        <div className="max-w-[820px] mx-auto px-8 py-10">

          {/* Report header */}
          <div className="flex items-start justify-between mb-8 pb-6 border-b border-line print-border">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-[8px] bg-[linear-gradient(135deg,#D4AF37,#8E7321)] flex items-center justify-center font-sans text-[14px] leading-none font-extrabold text-gold-ink shrink-0">
                  GT
                </div>
                <div>
                  <div className="text-[18px] font-extrabold font-sans tracking-[-0.01em]">GoldTracker</div>
                  <div className="font-mono text-[10px] text-mute print-text-mute tracking-[0.12em]">Báo cáo danh mục</div>
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="font-mono text-[12px] text-mute print-text-mute">Ngày xuất báo cáo</div>
              <div className="font-display text-[18px] font-extrabold text-chalk print-text-dark mt-1">{today}</div>
            </div>
          </div>

          {isLoading ? (
            <div className="py-20 text-center font-mono text-[13px] text-mute">Đang tải dữ liệu…</div>
          ) : !portfolio ? (
            <div className="py-20 text-center font-mono text-[13px] text-mute">Không có dữ liệu danh mục</div>
          ) : (
            <>
              {/* Summary */}
              <section className="mb-8">
                <h2 className="font-mono text-[10px] font-bold tracking-[0.16em] uppercase text-mute print-text-mute mb-4">Tổng quan danh mục</h2>
                <div className="print-card grid grid-cols-4 gap-px bg-line rounded-[12px] overflow-hidden border border-line">
                  {[
                    { label: 'Tổng giá trị', value: fmtVnd(portfolio.totalValueVnd), color: 'text-gold' },
                    { label: 'Vốn bỏ ra',   value: fmtVnd(portfolio.totalCostVnd),  color: 'text-chalk' },
                    {
                      label: 'Lãi / Lỗ (₫)',
                      value: (portfolio.totalPnlVnd >= 0 ? '+' : '') + fmtVnd(portfolio.totalPnlVnd),
                      color: portfolio.totalPnlVnd >= 0 ? 'text-up' : 'text-down',
                    },
                    {
                      label: 'Lãi / Lỗ (%)',
                      value: (portfolio.totalPnlPct >= 0 ? '+' : '') + portfolio.totalPnlPct.toFixed(2) + '%',
                      color: portfolio.totalPnlPct >= 0 ? 'text-up' : 'text-down',
                    },
                  ].map(s => (
                    <div key={s.label} className="bg-ink-2 print-card px-5 py-4">
                      <div className="font-mono text-[9px] text-mute print-text-mute tracking-[0.14em] uppercase mb-[8px]">{s.label}</div>
                      <div className={cn('font-display text-[20px] leading-none font-extrabold tabular-nums', s.color)}>{s.value}</div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Holdings */}
              <section className="mb-8">
                <h2 className="font-mono text-[10px] font-bold tracking-[0.16em] uppercase text-mute print-text-mute mb-4">Tài sản đang nắm giữ</h2>
                <div className="print-card bg-ink-2 border border-line rounded-[12px] overflow-hidden">
                  <div
                    className="grid px-5 py-3 font-mono text-[10px] text-mute print-text-mute tracking-[0.12em] uppercase bg-ink-3 border-b border-line print-border"
                    style={{ gridTemplateColumns: '2fr 1fr 1.2fr 1.2fr 1.2fr 1fr' }}
                  >
                    <span>Loại vàng</span>
                    <span className="text-right">SL (lượng)</span>
                    <span className="text-right">Giá vốn TB</span>
                    <span className="text-right">Giá hiện tại</span>
                    <span className="text-right">Giá trị</span>
                    <span className="text-right">Lãi/Lỗ</span>
                  </div>
                  {portfolio.holdings.length === 0 ? (
                    <div className="px-5 py-8 text-center font-mono text-[13px] text-mute">Chưa có tài sản</div>
                  ) : portfolio.holdings.map((h, i) => (
                    <div
                      key={`${h.brand}-${h.goldType}`}
                      className={cn('grid px-5 py-4 items-center', i !== 0 && 'border-t border-hairline print-border')}
                      style={{ gridTemplateColumns: '2fr 1fr 1.2fr 1.2fr 1.2fr 1fr' }}
                    >
                      <div>
                        <div className="text-[13px] font-bold font-sans">{GOLD_TYPE_LABELS[h.goldType] ?? h.goldType}</div>
                        <div className="font-mono text-[10px] text-mute print-text-mute mt-[2px]">{h.brand}</div>
                      </div>
                      <div className="text-right font-mono text-[13px] tabular-nums">{h.netQty.toFixed(3)}</div>
                      <div className="text-right font-mono text-[12px] tabular-nums text-mute print-text-mute">{fmtVnd(h.avgCostPerTael)}</div>
                      <div className="text-right font-mono text-[12px] tabular-nums">{fmtVnd(h.currentBuyPrice)}</div>
                      <div className="text-right font-display text-[15px] font-extrabold tabular-nums">{fmtVnd(h.currentValueVnd)}</div>
                      <div className={cn('text-right font-mono text-[12px] font-bold tabular-nums', h.pnlVnd >= 0 ? 'text-up' : 'text-down')}>
                        {h.pnlVnd >= 0 ? '+' : ''}{h.pnlPct.toFixed(2)}%
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Allocation */}
              {allocation && (allocation.byGoldType.length > 0 || allocation.byBrand.length > 0) && (
                <section className="mb-8">
                  <h2 className="font-mono text-[10px] font-bold tracking-[0.16em] uppercase text-mute print-text-mute mb-4">Phân bổ danh mục</h2>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { title: 'Theo loại vàng', rows: allocation.byGoldType.map(r => ({ label: GOLD_TYPE_LABELS[r.goldType] ?? r.goldType, pct: r.pct })) },
                      { title: 'Theo thương hiệu', rows: allocation.byBrand.map(r => ({ label: r.brand, pct: r.pct })) },
                    ].map(section => (
                      <div key={section.title} className="print-card bg-ink-2 border border-line rounded-[12px] p-5">
                        <div className="font-mono text-[10px] font-bold tracking-[0.12em] uppercase text-mute print-text-mute mb-4">{section.title}</div>
                        <div className="flex flex-col gap-3">
                          {section.rows.map(row => (
                            <div key={row.label}>
                              <div className="flex justify-between font-mono text-[12px] mb-[5px]">
                                <span className="text-bone print-text-dark">{row.label}</span>
                                <span className="text-gold font-bold">{row.pct.toFixed(1)}%</span>
                              </div>
                              <div className="h-[5px] bg-ink-3 rounded-full overflow-hidden">
                                <div className="h-full bg-gold rounded-full" style={{ width: `${row.pct}%` }}/>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Recent transactions */}
              {txData && txData.items.length > 0 && (
                <section className="mb-8">
                  <h2 className="font-mono text-[10px] font-bold tracking-[0.16em] uppercase text-mute print-text-mute mb-4">
                    Giao dịch gần nhất ({Math.min(txData.items.length, 10)} / {txData.total})
                  </h2>
                  <div className="print-card bg-ink-2 border border-line rounded-[12px] overflow-hidden">
                    <div
                      className="grid px-5 py-3 font-mono text-[10px] text-mute print-text-mute tracking-[0.12em] uppercase bg-ink-3 border-b border-line print-border"
                      style={{ gridTemplateColumns: '1.4fr 0.7fr 1.5fr 1fr 1.2fr' }}
                    >
                      <span>Ngày giao dịch</span>
                      <span>Loại</span>
                      <span>Loại vàng</span>
                      <span className="text-right">SL</span>
                      <span className="text-right">Đơn giá</span>
                    </div>
                    {txData.items.slice(0, 10).map((tx, i) => (
                      <div
                        key={tx.id}
                        className={cn('grid px-5 py-3 items-center', i !== 0 && 'border-t border-hairline print-border')}
                        style={{ gridTemplateColumns: '1.4fr 0.7fr 1.5fr 1fr 1.2fr' }}
                      >
                        <div className="font-mono text-[12px] text-bone print-text-dark">{fmtDateTime(tx.transactedAt)}</div>
                        <div>
                          <span className={cn(
                            'font-mono text-[10px] font-bold px-[6px] py-[3px] rounded-[3px]',
                            tx.type === 'BUY'
                              ? 'text-up bg-[rgba(88,200,150,0.1)]'
                              : 'text-down bg-[rgba(229,72,77,0.1)]',
                          )}>
                            {tx.type === 'BUY' ? 'Mua' : 'Bán'}
                          </span>
                        </div>
                        <div>
                          <div className="text-[12px] font-sans font-medium">{GOLD_TYPE_LABELS[tx.goldType] ?? tx.goldType}</div>
                          <div className="font-mono text-[10px] text-mute print-text-mute">{tx.brand}</div>
                        </div>
                        <div className="text-right font-mono text-[12px] tabular-nums">{Number(tx.quantity).toFixed(3)}</div>
                        <div className="text-right font-mono text-[12px] tabular-nums">{fmtVnd(tx.pricePerTael)}</div>
                      </div>
                    ))}
                  </div>
                  {txData.total > 10 && (
                    <p className="font-mono text-[11px] text-mute mt-2 text-right">
                      ... và {txData.total - 10} giao dịch khác không hiển thị trong báo cáo
                    </p>
                  )}
                </section>
              )}

              {/* Footer */}
              <div className="border-t border-line print-border pt-6 flex items-center justify-between">
                <div className="font-mono text-[10px] text-mute print-text-mute">
                  Tạo bởi GoldTracker · {fmtDate(new Date().toISOString())}
                </div>
                <div className="font-mono text-[10px] text-mute print-text-mute">
                  Dữ liệu chỉ mang tính tham khảo, không phải tư vấn đầu tư
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

export default function PortfolioReportPage() {
  return <ProtectedRoute><ReportContent /></ProtectedRoute>;
}
