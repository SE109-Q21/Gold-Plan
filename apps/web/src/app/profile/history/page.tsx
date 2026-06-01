'use client';
import { ProtectedRoute } from '@/components/ProtectedRoute';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useBrowsingHistory, useClearHistory, useLowestSeen } from '@/lib/browsing-history.api';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

function fmtDate(iso: string): string {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
}

function fmtVnd(n: number): string {
  return (n / 1_000_000).toFixed(2) + 'M₫';
}

const ROW_GRID = 'grid items-center gap-0 px-6 py-[14px]';
const ROW_COLS = 'grid-cols-[1.4fr_1fr_1fr_1fr_1fr_1fr]';

function BrowsingHistoryContent() {
  const router = useRouter();
  const [page, setPage] = useState(1);

  const { data, isLoading } = useBrowsingHistory(page);
  const { data: lowestData } = useLowestSeen();
  const clearHistory = useClearHistory();

  const lowestMap = new Map<string, number>(
    (lowestData ?? []).map((item) => [`${item.brand}|${item.goldType}`, item.lowestPrice]),
  );

  async function handleClearAll() {
    if (!window.confirm('Xóa toàn bộ lịch sử duyệt? Hành động này không thể hoàn tác.')) return;
    await clearHistory.mutateAsync();
    setPage(1);
  }

  const items = data?.items ?? [];
  const totalPages = data?.totalPages ?? 1;

  return (
    <div className="min-h-screen bg-ink text-chalk">
      {/* Header */}
      <div className="flex items-center justify-between px-7 py-5 border-b border-line bg-ink-2">
        <div className="flex items-center gap-[14px]">
          <Button variant="outline" onClick={() => router.back()} className="h-[34px] px-[10px] border-line bg-transparent text-bone hover:bg-ink-3 font-mono text-[12px] font-bold tracking-[0.04em] flex items-center gap-[6px]">
            ← quay lại
          </Button>
          <h1 className="font-display text-[20px] leading-none font-bold m-0 tracking-[-0.015em] uppercase">lịch sử duyệt</h1>
        </div>
        <Button variant="outline" onClick={handleClearAll} disabled={clearHistory.isPending} className="h-[34px] px-[14px] border-[rgba(229,72,77,0.5)] bg-transparent text-down hover:bg-[rgba(229,72,77,0.08)] hover:text-down font-mono text-[11px] font-bold tracking-[0.04em] uppercase">
          {clearHistory.isPending ? '…' : 'xóa tất cả'}
        </Button>
      </div>

      {/* Table */}
      <div className="p-[24px_28px]">
        <div className="bg-ink-2 border border-line rounded-[14px] overflow-hidden">
          {/* Table header */}
          <div className={cn(ROW_GRID, ROW_COLS, 'bg-ink-3 border-b border-hairline font-mono text-[10px] text-mute tracking-[0.14em] uppercase py-3')}>
            <span>thời điểm xem</span>
            <span>thương hiệu</span>
            <span>loại vàng</span>
            <span className="text-right">giá mua</span>
            <span className="text-right">giá thấp nhất</span>
            <span className="text-right">vs thấp nhất</span>
          </div>

          {isLoading && (
            <div className="p-[32px_24px] text-center text-mute font-mono text-[13px] leading-none font-medium">
              đang tải…
            </div>
          )}

          {!isLoading && items.length === 0 && (
            <div className="p-[32px_24px] text-center text-mute font-mono text-[13px] leading-none font-medium">
              chưa có lịch sử
            </div>
          )}

          {!isLoading && items.map((item, i) => {
            const lowestPrice = lowestMap.get(`${item.brand}|${item.goldType}`);
            const isLowest = lowestPrice !== undefined && item.buyPrice === lowestPrice;
            const vsPct = lowestPrice !== undefined && lowestPrice > 0
              ? ((item.buyPrice - lowestPrice) / lowestPrice) * 100
              : null;

            return (
              <div
                key={item.id}
                className={cn(ROW_GRID, ROW_COLS, i !== 0 && 'border-t border-hairline')}
              >
                <div className="font-mono text-[12px] text-bone">{fmtDate(item.viewedAt)}</div>
                <div className="font-display text-[13px] leading-none font-bold">{item.brand}</div>
                <div className="font-mono text-[11px] text-mute">{item.goldType}</div>
                <div className={cn(
                  'text-right font-display text-[14px] leading-none font-bold [font-variant-numeric:tabular-nums]',
                  isLowest ? 'text-up' : 'text-chalk',
                )}>
                  {fmtVnd(item.buyPrice)}
                </div>
                <div className="text-right font-display text-[13px] leading-none font-semibold [font-variant-numeric:tabular-nums] text-up">
                  {lowestPrice !== undefined ? fmtVnd(lowestPrice) : '—'}
                </div>
                <div className={cn(
                  'text-right font-mono text-[12px] leading-none font-semibold [font-variant-numeric:tabular-nums]',
                  vsPct === null ? 'text-mute' : vsPct === 0 ? 'text-up' : 'text-bone',
                )}>
                  {vsPct === null ? '—' : vsPct === 0 ? '= thấp nhất' : `+${vsPct.toFixed(1)}%`}
                </div>
              </div>
            );
          })}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-4 mt-5">
            <Button variant="outline" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="h-[34px] px-[14px] bg-ink-3 border-line text-bone hover:bg-ink-4 font-mono text-[11px] font-bold tracking-[0.04em] uppercase">
              ← trước
            </Button>
            <span className="font-mono text-[12px] text-mute">trang {page} / {totalPages}</span>
            <Button variant="outline" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="h-[34px] px-[14px] bg-ink-3 border-line text-bone hover:bg-ink-4 font-mono text-[11px] font-bold tracking-[0.04em] uppercase">
              tiếp →
            </Button>
          </div>
        )}

        {data && (
          <div className="text-center mt-3 font-mono text-[11px] text-mute">
            {data.total} mục tổng cộng
          </div>
        )}
      </div>
    </div>
  );
}

export default function BrowsingHistoryPage() {
  return <ProtectedRoute><BrowsingHistoryContent /></ProtectedRoute>;
}
