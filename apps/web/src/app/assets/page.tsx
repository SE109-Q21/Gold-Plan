'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { usePortfolio } from '@/lib/portfolio.api';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MoneyInput } from '@/components/ui/money-input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

// ─── Types ───────────────────────────────────────────────────────────────────

type AssetCategory = 'cash' | 'crypto' | 'stocks' | 'savings';

type ManualAsset = {
  id: string;
  category: AssetCategory;
  name: string;
  valueVnd: number;
};

const CATEGORY_CONFIG: Record<AssetCategory, { label: string; color: string; emoji: string }> = {
  cash:    { label: 'Tiền mặt',    color: '#60A5FA', emoji: '💵' },
  crypto:  { label: 'Crypto',      color: '#F97316', emoji: '₿'  },
  stocks:  { label: 'Chứng khoán', color: '#34D399', emoji: '📈' },
  savings: { label: 'Tiết kiệm',   color: '#A78BFA', emoji: '🏦' },
};
const GOLD_COLOR = '#D4AF37';
const STORAGE_KEY = 'gt_manual_assets_v1';

function loadAssets(): ManualAsset[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]'); } catch { return []; }
}
function saveAssets(assets: ManualAsset[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(assets));
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtVnd(n: number) {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(3) + ' tỷ ₫';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + ' triệu ₫';
  return n.toLocaleString('vi-VN') + ' ₫';
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="font-mono text-[9px] leading-none font-bold tracking-[0.16em] uppercase text-mute mb-[10px]">
      {children}
    </div>
  );
}

function IconArrowLeft({ s = 16 }: { s?: number }) {
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 12H5M5 12l7-7M5 12l7 7"/>
    </svg>
  );
}
function IconPlus({ s = 14 }: { s?: number }) {
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5v14M5 12h14"/>
    </svg>
  );
}
function IconTrash({ s = 13 }: { s?: number }) {
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
      <path d="M10 11v6M14 11v6M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
    </svg>
  );
}
function IconPencil({ s = 13 }: { s?: number }) {
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4Z"/>
    </svg>
  );
}

// ─── Donut center label ───────────────────────────────────────────────────────

function DonutCenter({ total }: { total: number }) {
  return (
    <g>
      <text x="50%" y="45%" textAnchor="middle" dominantBaseline="middle" fill="#e8e8e8" fontSize="14" fontWeight="800" fontFamily="sans-serif">
        {total >= 1_000_000_000 ? (total / 1_000_000_000).toFixed(2) : (total / 1_000_000).toFixed(0)}
      </text>
      <text x="50%" y="58%" textAnchor="middle" dominantBaseline="middle" fill="#6b6b7a" fontSize="10" fontFamily="monospace">
        {total >= 1_000_000_000 ? 'tỷ đồng' : 'triệu ₫'}
      </text>
    </g>
  );
}

// ─── Add/Edit Modal ───────────────────────────────────────────────────────────

function AssetModal({
  initial,
  onSave,
  onClose,
}: {
  initial?: ManualAsset;
  onSave: (a: ManualAsset) => void;
  onClose: () => void;
}) {
  const [category, setCategory] = useState<AssetCategory>(initial?.category ?? 'cash');
  const [name, setName] = useState(initial?.name ?? '');
  const [valueStr, setValueStr] = useState(initial ? String(initial.valueVnd) : '');

  function handleSave() {
    const value = parseFloat(valueStr.replace(/\./g, '').replace(/,/g, '')) || 0;
    if (value <= 0) return;
    onSave({
      id: initial?.id ?? crypto.randomUUID(),
      category,
      name: name.trim() || CATEGORY_CONFIG[category].label,
      valueVnd: value,
    });
    onClose();
  }

  const labelCls = 'font-mono text-[10px] leading-none font-bold tracking-[0.14em] uppercase text-mute mb-2';

  return (
    <Dialog open onOpenChange={o => !o && onClose()}>
      <DialogContent className="w-[420px] bg-ink-2 border-line text-chalk px-7 py-6 gap-5">
        <DialogHeader>
          <DialogTitle className="text-[20px] leading-none font-extrabold font-sans text-chalk">
            {initial ? 'Sửa tài sản' : 'Thêm tài sản'}
          </DialogTitle>
          <DialogDescription className="sr-only">Thêm hoặc sửa tài sản thủ công</DialogDescription>
        </DialogHeader>

        <div>
          <div className={labelCls}>Loại tài sản</div>
          <div className="flex flex-wrap gap-2">
            {(Object.entries(CATEGORY_CONFIG) as [AssetCategory, typeof CATEGORY_CONFIG[AssetCategory]][]).map(([cat, cfg]) => (
              <Button
                key={cat}
                variant="outline"
                onClick={() => setCategory(cat)}
                className={cn(
                  'h-8 px-3 font-mono text-[11px] leading-none font-bold gap-[6px]',
                  category === cat
                    ? 'border-gold bg-[rgba(212,175,55,0.12)] text-gold hover:bg-[rgba(212,175,55,0.18)] hover:text-gold'
                    : 'border-line bg-transparent text-bone hover:bg-ink-3 hover:text-bone',
                )}
              >
                <span>{cfg.emoji}</span> {cfg.label}
              </Button>
            ))}
          </div>
        </div>

        <div>
          <div className={labelCls}>Tên (tùy chọn)</div>
          <Input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder={CATEGORY_CONFIG[category].label}
            className="bg-ink-3 border-line text-chalk text-[14px] font-medium h-10 focus-visible:ring-gold placeholder:text-mute"
          />
        </div>

        <div>
          <div className={labelCls}>Giá trị (₫)</div>
          <MoneyInput
            value={valueStr}
            onChange={setValueStr}
            placeholder="100000000"
            className="bg-ink-3 border-line text-chalk font-display text-[20px] leading-none font-bold p-[10px_14px] h-auto focus-visible:ring-gold placeholder:text-mute"
          />
        </div>

        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={onClose} className="h-9 px-4 bg-ink-3 border-line text-bone hover:bg-ink-4 hover:text-chalk font-mono text-[12px] font-bold">
            Hủy
          </Button>
          <Button onClick={handleSave} disabled={!valueStr || parseInt(valueStr) <= 0} className="h-9 px-4 font-mono text-[12px] font-bold">
            Lưu
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

function AssetsContent() {
  const router = useRouter();
  const { data: portfolio } = usePortfolio();
  const [manualAssets, setManualAssets] = useState<ManualAsset[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ManualAsset | undefined>(undefined);

  useEffect(() => { setManualAssets(loadAssets()); }, []);

  const saveAndSet = useCallback((assets: ManualAsset[]) => {
    setManualAssets(assets);
    saveAssets(assets);
  }, []);

  function handleSave(a: ManualAsset) {
    const next = editing
      ? manualAssets.map(x => x.id === a.id ? a : x)
      : [...manualAssets, a];
    saveAndSet(next);
    setEditing(undefined);
  }

  function handleDelete(id: string) {
    saveAndSet(manualAssets.filter(a => a.id !== id));
  }

  function openAdd() { setEditing(undefined); setModalOpen(true); }
  function openEdit(a: ManualAsset) { setEditing(a); setModalOpen(true); }

  const goldValue = portfolio?.totalValueVnd ?? 0;

  const manualByCategory = useMemo(() => {
    const map: Partial<Record<AssetCategory, number>> = {};
    for (const a of manualAssets) {
      map[a.category] = (map[a.category] ?? 0) + a.valueVnd;
    }
    return map;
  }, [manualAssets]);

  const totalValue = goldValue + Object.values(manualByCategory).reduce((s, v) => s + (v ?? 0), 0);

  const chartData = useMemo(() => {
    const data = [];
    if (goldValue > 0) data.push({ name: 'Vàng', value: goldValue, color: GOLD_COLOR });
    for (const [cat, val] of Object.entries(manualByCategory) as [AssetCategory, number][]) {
      if (val > 0) data.push({ name: CATEGORY_CONFIG[cat].label, value: val, color: CATEGORY_CONFIG[cat].color });
    }
    return data;
  }, [goldValue, manualByCategory]);

  const allocationRows = useMemo(() => {
    if (totalValue <= 0) return [];
    return chartData.map(d => ({ ...d, pct: (d.value / totalValue) * 100 }));
  }, [chartData, totalValue]);

  return (
    <>
      {(modalOpen || editing) && (
        <AssetModal
          initial={editing}
          onSave={handleSave}
          onClose={() => { setModalOpen(false); setEditing(undefined); }}
        />
      )}

      <div className="h-full overflow-auto bg-ink">
      <div className="p-[32px_24px_60px] flex flex-col items-center">
        <div className="w-full max-w-[900px]">

          {/* Header */}
          <div className="flex justify-between items-start mb-8">
            <div>
              <Button
                variant="ghost"
                onClick={() => router.push('/')}
                className="text-mute flex items-center gap-[6px] font-mono text-[12px] font-semibold tracking-[0.08em] p-0 pb-4 h-auto hover:bg-transparent hover:text-bone"
              >
                <IconArrowLeft s={14}/> quay lại dashboard
              </Button>
              <h1 className="font-display text-[40px] leading-none font-extrabold tracking-[-0.03em] text-chalk m-0">
                Tổng quan tài sản
              </h1>
              <p className="font-display text-[14px] leading-[1.5] text-mute m-0 mt-2">
                Toàn bộ tài sản cá nhân — vàng, tiền mặt, crypto, chứng khoán, tiết kiệm
              </p>
            </div>
            <Button
              onClick={openAdd}
              className="h-10 px-4 font-mono text-[12px] font-bold tracking-[0.04em] gap-2 shrink-0 mt-6"
            >
              <IconPlus s={13}/> Thêm tài sản
            </Button>
          </div>

          {/* Summary + Chart row */}
          <div className="grid gap-5 mb-5" style={{ gridTemplateColumns: '1fr 1.1fr' }}>

            {/* Total summary */}
            <div className="bg-ink-2 border border-line rounded-[14px] p-[24px_28px] flex flex-col justify-between">
              <SectionLabel>Tổng tài sản</SectionLabel>
              <div>
                <div className="font-display text-[52px] leading-none font-extrabold tabular-nums text-chalk mb-1">
                  {totalValue > 0 ? (
                    totalValue >= 1_000_000_000
                      ? (totalValue / 1_000_000_000).toFixed(3)
                      : (totalValue / 1_000_000).toFixed(2)
                  ) : '—'}
                </div>
                <div className="font-mono text-[13px] text-mute">
                  {totalValue >= 1_000_000_000 ? 'tỷ đồng' : 'triệu ₫'}
                </div>
              </div>

              <div className="mt-6 flex flex-col gap-[10px]">
                {portfolio && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: GOLD_COLOR }}/>
                      <span className="font-mono text-[12px] text-bone">Vàng</span>
                    </div>
                    <span className="font-mono text-[12px] text-chalk tabular-nums">{fmtVnd(goldValue)}</span>
                  </div>
                )}
                {(Object.entries(manualByCategory) as [AssetCategory, number][]).map(([cat, val]) => val > 0 && (
                  <div key={cat} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: CATEGORY_CONFIG[cat].color }}/>
                      <span className="font-mono text-[12px] text-bone">{CATEGORY_CONFIG[cat].label}</span>
                    </div>
                    <span className="font-mono text-[12px] text-chalk tabular-nums">{fmtVnd(val)}</span>
                  </div>
                ))}
                {totalValue === 0 && (
                  <div className="text-mute font-mono text-[12px]">Chưa có tài sản nào được thêm</div>
                )}
              </div>

              {portfolio && (
                <div className="mt-6 pt-5 border-t border-hairline grid grid-cols-2 gap-3">
                  <div>
                    <div className="font-mono text-[9px] text-mute tracking-[0.14em] uppercase mb-1">Lãi/Lỗ vàng</div>
                    <div className={cn('font-display text-[18px] font-extrabold tabular-nums', portfolio.totalPnlVnd >= 0 ? 'text-up' : 'text-down')}>
                      {portfolio.totalPnlVnd >= 0 ? '+' : ''}{fmtVnd(portfolio.totalPnlVnd)}
                    </div>
                  </div>
                  <div>
                    <div className="font-mono text-[9px] text-mute tracking-[0.14em] uppercase mb-1">% Vàng</div>
                    <div className={cn('font-display text-[18px] font-extrabold tabular-nums', portfolio.totalPnlPct >= 0 ? 'text-up' : 'text-down')}>
                      {portfolio.totalPnlPct >= 0 ? '+' : ''}{portfolio.totalPnlPct.toFixed(2)}%
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Donut chart */}
            <div className="bg-ink-2 border border-line rounded-[14px] p-[24px_28px]">
              <SectionLabel>Phân bổ tài sản</SectionLabel>
              {chartData.length === 0 ? (
                <div className="h-[220px] flex items-center justify-center text-mute font-mono text-[13px]">
                  Thêm tài sản để xem biểu đồ
                </div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={72}
                        outerRadius={100}
                        paddingAngle={3}
                        dataKey="value"
                        labelLine={false}
                      >
                        {chartData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} stroke="transparent"/>
                        ))}
                        <DonutCenter total={totalValue}/>
                      </Pie>
                      <Tooltip
                        formatter={(value: number) => [fmtVnd(value), '']}
                        contentStyle={{ background: '#16161f', border: '1px solid #2a2a35', borderRadius: 8, fontSize: 12 }}
                        itemStyle={{ color: '#e8e8e8' }}
                        labelStyle={{ display: 'none' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>

                  <div className="flex flex-wrap gap-[6px_16px] mt-2">
                    {allocationRows.map((row, i) => (
                      <div key={i} className="flex items-center gap-[6px]">
                        <span className="w-[10px] h-[10px] rounded-sm shrink-0" style={{ background: row.color }}/>
                        <span className="font-mono text-[11px] text-mute">{row.name}</span>
                        <span className="font-mono text-[11px] text-bone font-bold">{row.pct.toFixed(1)}%</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Assets list */}
          <div className="bg-ink-2 border border-line rounded-[14px]">
            <div className="flex items-center justify-between px-6 py-[18px] border-b border-hairline">
              <h3 className="text-[16px] leading-none font-bold font-sans m-0">Danh sách tài sản</h3>
              <span className="font-mono text-[10px] text-mute tracking-[0.12em] uppercase">% trên tổng tài sản</span>
            </div>

            {/* Gold row (from API) */}
            {portfolio && (
              <div className="flex items-center gap-4 px-6 py-4 border-b border-hairline">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center text-[18px] shrink-0" style={{ background: 'rgba(212,175,55,0.12)' }}>
                  🥇
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[14px] font-bold font-sans">Vàng</span>
                    <span className="font-mono text-[10px] text-mute px-[5px] py-[2px] border border-line rounded">Từ danh mục</span>
                  </div>
                  <div className="font-mono text-[11px] text-mute mt-[3px]">
                    {portfolio.holdings.length} loại · L/L{' '}
                    <span className={portfolio.totalPnlVnd >= 0 ? 'text-up' : 'text-down'}>
                      {portfolio.totalPnlVnd >= 0 ? '+' : ''}{portfolio.totalPnlPct.toFixed(2)}%
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-display text-[18px] font-extrabold tabular-nums text-chalk">{fmtVnd(goldValue)}</div>
                  {totalValue > 0 && (
                    <div className="font-mono text-[11px] text-gold mt-[3px]">
                      {((goldValue / totalValue) * 100).toFixed(1)}%
                    </div>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => router.push('/portfolio')}
                  className="w-7 h-7 text-mute hover:text-chalk hover:bg-ink-3"
                  title="Xem danh mục vàng"
                >
                  <IconPencil/>
                </Button>
                <div className="w-7"/>
              </div>
            )}

            {/* Manual asset rows */}
            {manualAssets.length === 0 && !portfolio && (
              <div className="px-6 py-10 text-center text-mute font-mono text-[13px]">
                Chưa có tài sản — nhấn <span className="text-gold">+ Thêm tài sản</span> để bắt đầu
              </div>
            )}

            {manualAssets.map((asset, i) => {
              const cfg = CATEGORY_CONFIG[asset.category];
              const pct = totalValue > 0 ? (asset.valueVnd / totalValue) * 100 : 0;
              return (
                <div
                  key={asset.id}
                  className={cn('flex items-center gap-4 px-6 py-4', i < manualAssets.length - 1 && 'border-b border-hairline')}
                >
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center text-[18px] shrink-0"
                    style={{ background: cfg.color + '1a' }}
                  >
                    {cfg.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[14px] font-bold font-sans">{asset.name}</div>
                    <div className="font-mono text-[11px] text-mute mt-[3px]">{cfg.label}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-display text-[18px] font-extrabold tabular-nums text-chalk">{fmtVnd(asset.valueVnd)}</div>
                    {totalValue > 0 && (
                      <div className="font-mono text-[11px] mt-[3px]" style={{ color: cfg.color }}>
                        {pct.toFixed(1)}%
                      </div>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openEdit(asset)}
                    className="w-7 h-7 text-mute hover:text-chalk hover:bg-ink-3"
                  >
                    <IconPencil/>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(asset.id)}
                    className="w-7 h-7 text-down hover:bg-[rgba(229,72,77,0.08)] hover:text-down"
                  >
                    <IconTrash/>
                  </Button>
                </div>
              );
            })}

            {(portfolio || manualAssets.length > 0) && (
              <div className="flex items-center justify-between px-6 py-4 bg-ink-3 rounded-b-[14px] border-t border-hairline">
                <span className="font-mono text-[11px] text-mute tracking-[0.08em] uppercase">Tổng cộng</span>
                <span className="font-display text-[20px] font-extrabold tabular-nums text-gold">{fmtVnd(totalValue)}</span>
              </div>
            )}
          </div>

          <p className="font-mono text-[11px] text-mute mt-4 text-center">
            Tài sản thủ công được lưu cục bộ trên trình duyệt này · Vàng lấy từ danh mục giao dịch của bạn
          </p>
        </div>
      </div>
      </div>
    </>
  );
}

export default function AssetsPage() {
  return <ProtectedRoute><AssetsContent /></ProtectedRoute>;
}
