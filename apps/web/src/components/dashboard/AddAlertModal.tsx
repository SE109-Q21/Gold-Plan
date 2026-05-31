'use client';

import { useState } from 'react';
import { useCreateAlert } from '@/lib/alerts.api';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import type { GoldBrand, GoldType } from '@gpls/shared';

interface Props { open: boolean; onClose: () => void; }

const BRANDS: { label: string; value: GoldBrand }[] = [
  { label: 'SJC',     value: 'SJC'     },
  { label: 'DOJI',    value: 'DOJI'    },
  { label: 'PNJ',     value: 'PNJ'     },
  { label: 'BAO TIN', value: 'BAO_TIN' },
];

const GOLD_TYPES: { label: string; value: GoldType }[] = [
  { label: 'Vàng miếng SJC', value: 'MIEN_SJC'  },
  { label: 'Nhẫn tròn 9999', value: 'NHAN_9999' },
  { label: 'Vàng 24K',       value: 'VANG_24K'  },
  { label: 'Vàng 18K',       value: 'VANG_18K'  },
];

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <Button
      type="button"
      variant="outline"
      onClick={onClick}
      className={cn(
        'flex-1 h-9 rounded-none font-mono text-[11px] leading-none font-bold tracking-[0.1em] uppercase',
        active ? 'bg-gold border-gold text-gold-ink hover:bg-gold hover:text-gold-ink' : 'bg-transparent border-line text-bone hover:bg-ink-3',
      )}
    >
      {label}
    </Button>
  );
}

export function AddAlertModal({ open, onClose }: Props) {
  const [brand,      setBrand]      = useState<GoldBrand>('SJC');
  const [goldType,   setGoldType]   = useState<GoldType>('MIEN_SJC');
  const [cond,       setCond]       = useState<'gte' | 'lte'>('gte');
  const [threshold,  setThreshold]  = useState(80_000_000);
  const [repeatMode, setRepeatMode] = useState(false);
  const [error,      setError]      = useState<string | null>(null);

  const createAlert = useCreateAlert();

  const handleSubmit = () => {
    setError(null);
    if (!threshold || threshold < 1_000_000) {
      setError('Ngưỡng giá phải từ 1,000,000₫ trở lên');
      return;
    }
    if (threshold > 1_000_000_000_000) {
      setError('Ngưỡng giá vượt quá giới hạn cho phép');
      return;
    }
    createAlert.mutate(
      { brand, goldType, condition: cond, thresholdPrice: threshold, repeatMode },
      {
        onSuccess: () => {
          onClose();
          setBrand('SJC'); setGoldType('MIEN_SJC'); setCond('gte');
          setThreshold(80_000_000); setRepeatMode(false);
        },
        onError: (err: unknown) => {
          const msg =
            (err as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
          if (Array.isArray(msg)) setError(msg.join(', '));
          else setError(msg ?? 'Tạo cảnh báo thất bại. Vui lòng thử lại.');
        },
      },
    );
  };

  const brandLabel    = BRANDS.find(b => b.value === brand)?.label ?? brand;
  const goldTypeLabel = GOLD_TYPES.find(g => g.value === goldType)?.label ?? goldType;

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="w-[520px] bg-ink-2 border-line text-chalk p-7 gap-0">
        <DialogHeader className="mb-5">
          <DialogTitle className="font-display text-[24px] leading-none font-bold tracking-[-0.015em] text-chalk">
            cảnh báo giá mới
          </DialogTitle>
          <DialogDescription className="font-mono text-[11px] text-mute mt-[6px]">
            gửi email + thông báo khi vượt ngưỡng
          </DialogDescription>
        </DialogHeader>

        {/* Brand */}
        <div className="font-mono text-[9px] text-mute tracking-[0.14em] uppercase mb-2">thương hiệu</div>
        <div className="flex mb-[18px] rounded-lg overflow-hidden border border-line">
          {BRANDS.map(b => <Chip key={b.value} label={b.label} active={brand === b.value} onClick={() => setBrand(b.value)}/>)}
        </div>

        {/* Gold type */}
        <div className="font-mono text-[9px] text-mute tracking-[0.14em] uppercase mb-2">loại vàng</div>
        <div className="flex mb-[18px] rounded-lg overflow-hidden border border-line">
          {GOLD_TYPES.map(g => <Chip key={g.value} label={g.label} active={goldType === g.value} onClick={() => setGoldType(g.value)}/>)}
        </div>

        {/* Condition */}
        <div className="font-mono text-[9px] text-mute tracking-[0.14em] uppercase mb-2">điều kiện</div>
        <div className="flex mb-[18px] rounded-lg overflow-hidden border border-line">
          <Chip label="≥ tăng lên trên" active={cond === 'gte'} onClick={() => setCond('gte')}/>
          <Chip label="≤ giảm xuống dưới" active={cond === 'lte'} onClick={() => setCond('lte')}/>
        </div>

        {/* Threshold price */}
        <div className="font-mono text-[9px] text-mute tracking-[0.14em] uppercase mb-2">ngưỡng giá (VND)</div>
        <div className="flex items-center gap-[10px] bg-ink-3 border border-line rounded-[10px] py-1 px-2 pl-4 mb-[18px]">
          <span className="font-display text-[24px] leading-none font-bold text-gold">₫</span>
          <Input
            type="number"
            value={threshold}
            onChange={e => setThreshold(+e.target.value)}
            min={1_000_000}
            className="flex-1 h-[46px] bg-transparent border-0 outline-none font-display text-[24px] leading-none font-bold text-chalk [font-variant-numeric:tabular-nums] ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 px-0"
          />
        </div>

        {/* Repeat */}
        <div className="flex items-center gap-[10px] mb-[22px]">
          <Checkbox
            id="repeatMode"
            checked={repeatMode}
            onCheckedChange={v => setRepeatMode(!!v)}
            className="border-line data-[state=checked]:bg-gold data-[state=checked]:border-gold data-[state=checked]:text-gold-ink"
          />
          <Label htmlFor="repeatMode" className="font-sans text-[13px] leading-none font-medium text-bone cursor-pointer">
            lặp lại (kích hoạt lại sau mỗi lần báo)
          </Label>
        </div>

        {/* Summary */}
        <div className="p-[12px_14px] bg-ink-3 border border-line rounded-lg font-mono text-[11px] leading-[1.5] text-mute mb-[18px]">
          thông báo khi{' '}
          <span className="text-gold">
            {brandLabel} · {goldTypeLabel} {cond === 'gte' ? '≥' : '≤'} ₫{threshold.toLocaleString('vi-VN')}
          </span>
          . lặp lại: {repeatMode ? 'có' : 'không'}
        </div>

        {/* Error */}
        {error && (
          <div className="p-[10px_14px] bg-[rgba(229,72,77,0.12)] border border-[rgba(229,72,77,0.35)] rounded-lg font-mono text-[12px] leading-[1.5] text-down mb-4">
            {error}
          </div>
        )}

        {/* Buttons */}
        <div className="flex gap-[10px]">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={createAlert.isPending}
            className="flex-1 h-[46px] bg-ink-3 border-line text-chalk hover:bg-ink-4 hover:text-chalk font-mono text-[14px] font-bold tracking-[0.04em] uppercase"
          >
            hủy
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={createAlert.isPending}
            className={cn(
              'flex-[2] h-[46px] font-mono text-[14px] font-bold tracking-[0.04em] uppercase flex items-center justify-center gap-2',
              createAlert.isPending ? 'bg-ink-3 border border-line text-mute cursor-default hover:bg-ink-3' : '',
            )}
          >
            {createAlert.isPending ? (
              <>
                <span className="w-[14px] h-[14px] border-2 border-mute border-t-gold rounded-full animate-spin inline-block"/>
                đang tạo…
              </>
            ) : 'tạo cảnh báo'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
