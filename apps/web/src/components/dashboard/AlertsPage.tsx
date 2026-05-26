'use client';

import { useState } from 'react';
import { useAlerts, useToggleAlert, useDeleteAlert, useAlertHistory } from '@/lib/alerts.api';
import { useSmartAlerts, useCreateSmartAlert, useToggleSmartAlert, useDeleteSmartAlert } from '@/lib/smart-alerts.api';
import type { PriceAlertDto, SmartAlertDto, CreateSmartAlertDto, SmartAlertCondition } from '@gpls/shared';
import { PushNotificationButton } from '@/components/PushNotificationButton';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

function ConfirmDeleteModal({ message, onConfirm, onClose }: {
  message: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Dialog open onOpenChange={o => !o && onClose()}>
      <DialogContent className="w-[380px] bg-ink-2 border-line text-chalk px-7 pt-7 pb-6 gap-5">
        <div className="flex items-start gap-[14px]">
          <div className="w-9 h-9 rounded-lg shrink-0 bg-[rgba(229,72,77,0.12)] border border-[rgba(229,72,77,0.25)] flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--down)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M6 6l1 14a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-14"/>
            </svg>
          </div>
          <div>
            <div className="text-[16px] leading-none font-bold font-sans text-chalk mb-[6px]">Xóa alert</div>
            <div className="text-[13px] leading-[1.5] font-sans text-mute">{message}</div>
          </div>
        </div>
        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={onClose} className="h-9 px-4 bg-ink-3 border-line text-bone hover:bg-ink-4 hover:text-chalk font-mono text-[12px] font-bold tracking-[0.04em]">
            Hủy
          </Button>
          <Button
            onClick={() => { onConfirm(); onClose(); }}
            className="h-9 px-4 bg-[rgba(229,72,77,0.15)] border border-[rgba(229,72,77,0.4)] text-down hover:bg-[rgba(229,72,77,0.25)] font-mono text-[12px] font-bold tracking-[0.04em]"
          >
            Xóa
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SkeletonRow() {
  return (
    <div
      className="grid px-[22px] py-4 items-center border-t border-hairline"
      style={{ gridTemplateColumns: '64px 2fr 1.4fr 1fr 100px 130px' }}
    >
      {[64, 140, 90, 60, 80, 80].map((w, i) => (
        <div key={i} className="h-[14px] rounded bg-ink-3 animate-pulse" style={{ width: w }}/>
      ))}
    </div>
  );
}

function fmtTarget(a: PriceAlertDto) {
  const price = Number(a.thresholdPrice);
  return price.toLocaleString('en-US') + '₫';
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '.');
}

function buildNaturalLanguage(brand: string, cond: SmartAlertCondition | null): string {
  if (!cond) return '';
  const b = brand || 'SJC';
  if (cond.type === 'TREND') {
    const p = cond.params as { n?: number; direction?: string };
    const n = p.n ?? 3;
    const dir = p.direction ?? 'up';
    return dir === 'up' ? `${b} tăng giá ${n} lần liên tiếp` : `${b} giảm giá ${n} lần liên tiếp`;
  }
  if (cond.type === 'SPREAD') {
    const p = cond.params as { thresholdVnd?: number };
    const t = p.thresholdVnd ?? 0;
    return `${b} chênh lệch mua/bán ≤ ${t.toLocaleString('en-US')}₫`;
  }
  if (cond.type === 'THRESHOLD') {
    const p = cond.params as { condition?: string; priceVnd?: number };
    const dir = p.condition === 'gte' ? '≥' : '≤';
    const price = p.priceVnd ?? 0;
    return `${b} mua ${dir} ${price.toLocaleString('en-US')}₫`;
  }
  return '';
}

function buildFullPreview(brand: string, cond1: SmartAlertCondition | null, cond2: SmartAlertCondition | null): string {
  const s1 = buildNaturalLanguage(brand, cond1);
  const s2 = buildNaturalLanguage(brand, cond2);
  if (!s1) return '';
  if (s2) return `${s1} VÀ ${s2}`;
  return s1;
}

type ConditionDraft = {
  type: 'TREND' | 'SPREAD' | 'THRESHOLD';
  trendN: number;
  trendDir: 'up' | 'down';
  spreadThreshold: string;
  thresholdDir: 'lte' | 'gte';
  thresholdPrice: string;
};

const defaultCond = (): ConditionDraft => ({
  type: 'TREND',
  trendN: 3,
  trendDir: 'up',
  spreadThreshold: '',
  thresholdDir: 'lte',
  thresholdPrice: '',
});

function toSmartAlertCondition(draft: ConditionDraft): SmartAlertCondition {
  if (draft.type === 'TREND') {
    return { type: 'TREND', params: { n: draft.trendN, direction: draft.trendDir } };
  }
  if (draft.type === 'SPREAD') {
    return { type: 'SPREAD', params: { thresholdVnd: Number(draft.spreadThreshold) || 0 } };
  }
  return { type: 'THRESHOLD', params: { condition: draft.thresholdDir, priceVnd: Number(draft.thresholdPrice) || 0 } };
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <Button
      variant="outline"
      onClick={onClick}
      className={cn(
        'h-7 px-3 rounded-md font-mono text-[11px] leading-none font-bold tracking-[0.08em]',
        active ? 'bg-gold border-gold text-gold-ink hover:bg-gold hover:text-gold-ink' : 'bg-ink-3 border-line text-bone hover:bg-ink-4 hover:text-bone',
      )}
    >
      {children}
    </Button>
  );
}

function ConditionForm({ value, onChange }: { value: ConditionDraft; onChange: (v: ConditionDraft) => void }) {
  return (
    <div className="flex flex-col gap-[10px]">
      <div className="flex gap-[6px]">
        {(['TREND', 'SPREAD', 'THRESHOLD'] as const).map(t => (
          <Chip key={t} active={value.type === t} onClick={() => onChange({ ...value, type: t })}>
            {t === 'TREND' ? 'Xu hướng' : t === 'SPREAD' ? 'Spread' : 'Ngưỡng giá'}
          </Chip>
        ))}
      </div>

      {value.type === 'TREND' && (
        <div className="flex gap-3 items-center">
          <span className="text-[12px] leading-none font-sans font-medium text-mute">N =</span>
          <div className="flex gap-1">
            {[2, 3, 4, 5].map(n => (
              <Chip key={n} active={value.trendN === n} onClick={() => onChange({ ...value, trendN: n })}>{n}</Chip>
            ))}
          </div>
          <div className="flex gap-1">
            {(['up', 'down'] as const).map(d => (
              <Chip key={d} active={value.trendDir === d} onClick={() => onChange({ ...value, trendDir: d })}>
                {d === 'up' ? '↑ Tăng' : '↓ Giảm'}
              </Chip>
            ))}
          </div>
        </div>
      )}

      {value.type === 'SPREAD' && (
        <div className="flex gap-2 items-center">
          <span className="text-[12px] leading-none font-sans font-medium text-mute whitespace-nowrap">Ngưỡng (VND)</span>
          <Input
            type="number"
            placeholder="e.g. 200000"
            value={value.spreadThreshold}
            onChange={e => onChange({ ...value, spreadThreshold: e.target.value })}
            className="h-9 bg-ink-3 border-line text-chalk font-mono text-[13px] placeholder:text-mute focus-visible:ring-gold"
          />
        </div>
      )}

      {value.type === 'THRESHOLD' && (
        <div className="flex gap-2 items-center">
          <div className="flex gap-1">
            {([['lte', '≤'], ['gte', '≥']] as const).map(([v, label]) => (
              <Chip key={v} active={value.thresholdDir === v} onClick={() => onChange({ ...value, thresholdDir: v })}>
                {label}
              </Chip>
            ))}
          </div>
          <Input
            type="number"
            placeholder="e.g. 79000000"
            value={value.thresholdPrice}
            onChange={e => onChange({ ...value, thresholdPrice: e.target.value })}
            className="h-9 bg-ink-3 border-line text-chalk font-mono text-[13px] placeholder:text-mute focus-visible:ring-gold"
          />
        </div>
      )}
    </div>
  );
}

const BRANDS_LIST = ['SJC', 'DOJI', 'PNJ', 'BAO_TIN'] as const;
const GOLD_TYPES_LIST = ['MIEN_SJC', 'NHAN_9999', 'VANG_24K', 'VANG_18K'] as const;

function BuilderModal({ onClose }: { onClose: () => void }) {
  const [brand, setBrand] = useState<string>('SJC');
  const [goldType, setGoldType] = useState<string>('MIEN_SJC');
  const [cond1, setCond1] = useState<ConditionDraft>(defaultCond());
  const [hasCond2, setHasCond2] = useState(false);
  const [cond2, setCond2] = useState<ConditionDraft>(defaultCond());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const createAlert = useCreateSmartAlert();

  const preview = buildFullPreview(
    brand,
    toSmartAlertCondition(cond1),
    hasCond2 ? toSmartAlertCondition(cond2) : null,
  );

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      const dto: CreateSmartAlertDto = {
        brand,
        goldType,
        condition1: toSmartAlertCondition(cond1),
        ...(hasCond2 ? { condition2: toSmartAlertCondition(cond2) } : {}),
      };
      await createAlert.mutateAsync(dto);
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Tạo cảnh báo thất bại');
    } finally {
      setIsSubmitting(false);
    }
  };

  const labelCls = 'font-mono text-[10px] leading-none font-bold tracking-[0.14em] uppercase text-mute mb-2';

  return (
    <Dialog open onOpenChange={o => !o && onClose()}>
      <DialogContent className="w-[500px] max-h-[90vh] overflow-y-auto bg-ink-2 border-line text-chalk px-7 py-6 gap-5">
        <DialogHeader>
          <DialogTitle className="text-[20px] leading-none font-extrabold font-sans text-chalk">Cảnh báo thông minh mới</DialogTitle>
          <DialogDescription className="sr-only">Tạo cảnh báo thông minh với một hoặc hai điều kiện</DialogDescription>
        </DialogHeader>

        <div>
          <div className={labelCls}>Thương hiệu</div>
          <div className="flex gap-[6px] flex-wrap">
            {BRANDS_LIST.map(b => (
              <Chip key={b} active={brand === b} onClick={() => setBrand(b)}>{b}</Chip>
            ))}
          </div>
        </div>

        <div>
          <div className={labelCls}>Loại vàng</div>
          <div className="flex gap-[6px] flex-wrap">
            {GOLD_TYPES_LIST.map(g => (
              <Chip key={g} active={goldType === g} onClick={() => setGoldType(g)}>{g}</Chip>
            ))}
          </div>
        </div>

        <div>
          <div className={labelCls}>Điều kiện 1</div>
          <ConditionForm value={cond1} onChange={setCond1} />
        </div>

        <label className="flex items-center gap-[10px] cursor-pointer">
          <Checkbox
            checked={hasCond2}
            onCheckedChange={v => setHasCond2(!!v)}
            className="border-line data-[state=checked]:bg-gold data-[state=checked]:border-gold data-[state=checked]:text-gold-ink"
          />
          <span className="text-[13px] leading-none font-sans font-medium text-bone">Thêm điều kiện 2 (VÀ)</span>
        </label>

        {hasCond2 && (
          <div>
            <div className={labelCls}>Điều kiện 2</div>
            <ConditionForm value={cond2} onChange={setCond2} />
          </div>
        )}

        {preview && (
          <div className="bg-ink-3 border border-line rounded-lg px-4 py-3">
            <div className={labelCls + ' mb-[6px]'}>Xem trước</div>
            <div className="text-[14px] leading-[1.4] font-sans font-medium text-gold">{preview}</div>
          </div>
        )}

        {error && (
          <div className="text-[13px] leading-[1.4] font-sans font-medium text-down">{error}</div>
        )}

        <Button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="h-11 font-mono text-[14px] font-bold tracking-[0.04em] uppercase"
        >
          {isSubmitting ? 'Đang tạo…' : 'Tạo cảnh báo thông minh'}
        </Button>
      </DialogContent>
    </Dialog>
  );
}

function SmartAlertsPanel() {
  const { data: alerts = [], isLoading } = useSmartAlerts();
  const toggleAlert = useToggleSmartAlert();
  const deleteAlert = useDeleteSmartAlert();
  const [showModal, setShowModal] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const handleToggle = (id: string) => toggleAlert.mutate(id);
  const handleDelete = (id: string) => setPendingDeleteId(id);

  const statusBadgeVariant = (status: SmartAlertDto['status']) => {
    if (status === 'active') return 'bg-[rgba(212,175,55,0.15)] text-gold border border-[rgba(212,175,55,0.4)]';
    if (status === 'triggered') return 'bg-[rgba(88,200,150,0.12)] text-up border border-[rgba(88,200,150,0.4)]';
    return 'bg-ink-3 text-mute border border-line';
  };

  return (
    <>
      {showModal && <BuilderModal onClose={() => setShowModal(false)} />}
      {pendingDeleteId && (
        <ConfirmDeleteModal
          message="Bạn có chắc muốn xóa smart alert này không? Hành động này không thể hoàn tác."
          onConfirm={() => deleteAlert.mutate(pendingDeleteId)}
          onClose={() => setPendingDeleteId(null)}
        />
      )}

      <div className="bg-ink-2 border border-line rounded-[14px]">
        <div className="flex items-center justify-between px-[22px] py-4 border-b border-hairline">
          <h3 className="text-[16px] leading-none font-bold font-sans m-0">cảnh báo thông minh</h3>
          <Button
            onClick={() => setShowModal(true)}
            className="h-[34px] px-[14px] font-mono text-[11px] font-bold tracking-[0.08em] uppercase"
          >
            + Thêm cảnh báo
          </Button>
        </div>

        <div
          className="grid px-[22px] py-3 font-mono text-[10px] text-mute tracking-[0.14em] uppercase bg-ink-3 border-b border-hairline"
          style={{ gridTemplateColumns: '1fr auto auto' }}
        >
          <span>mô tả</span>
          <span className="mr-12">trạng thái</span>
          <span>hành động</span>
        </div>

        {isLoading && [0, 1, 2].map(i => (
          <div
            key={i}
            className="grid px-[22px] py-4 border-t border-hairline items-center gap-3"
            style={{ gridTemplateColumns: '1fr auto auto' }}
          >
            <div className="h-[14px] rounded bg-ink-3 animate-pulse w-[60%]"/>
            <div className="h-[22px] w-[60px] rounded bg-ink-3 animate-pulse"/>
            <div className="h-[22px] w-[80px] rounded bg-ink-3 animate-pulse"/>
          </div>
        ))}

        {!isLoading && alerts.length === 0 && (
          <div className="px-[22px] py-12 text-center text-mute text-[14px] leading-[1.5] font-sans font-medium">
            Chưa có cảnh báo thông minh — nhấn <span className="text-gold">+ Thêm cảnh báo</span> để bắt đầu
          </div>
        )}

        {!isLoading && alerts.map((a, i) => (
          <div
            key={a.id}
            className={cn(
              'grid px-[22px] py-[14px] items-center gap-3',
              i !== 0 && 'border-t border-hairline',
              a.status === 'inactive' && 'opacity-55',
            )}
            style={{ gridTemplateColumns: '1fr auto auto' }}
          >
            <div className="text-[14px] leading-[1.4] font-sans font-medium text-chalk">{a.naturalLanguage}</div>
            <span className={cn('font-mono text-[9px] leading-none font-bold tracking-[0.14em] uppercase px-2 py-1 rounded', statusBadgeVariant(a.status))}>
              {a.status === 'active' ? 'hoạt động' : a.status === 'triggered' ? 'đã kích hoạt' : 'tắt'}
            </span>
            <div className="flex gap-[6px] items-center">
              <Switch
                checked={a.status === 'active'}
                onCheckedChange={() => handleToggle(a.id)}
                disabled={toggleAlert.isPending}
                className="data-[state=checked]:bg-gold data-[state=unchecked]:bg-ink-3"
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDelete(a.id)}
                disabled={deleteAlert.isPending}
                className={cn('w-7 h-8 text-down hover:bg-[rgba(229,72,77,0.08)] hover:text-down', deleteAlert.isPending && 'opacity-50')}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M6 6l1 14a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-14"/>
                </svg>
              </Button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

export function AlertsPage({ onOpenAdd }: { onOpenAdd: () => void }) {
  const [tab, setTab] = useState<string>('rules');
  const { data: alerts = [], isLoading } = useAlerts();
  const { data: history = [], isLoading: histLoading } = useAlertHistory();
  const toggleAlert = useToggleAlert();
  const deleteAlert = useDeleteAlert();
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const handleToggle = (id: string) => toggleAlert.mutate(id);
  const handleDelete = (id: string) => setPendingDeleteId(id);

  const activeCount = alerts.filter(a => a.status === 'active').length;
  const triggeredCount = history.length;

  return (
    <>
      {pendingDeleteId && (
        <ConfirmDeleteModal
          message="Bạn có chắc muốn xóa alert này không? Hành động này không thể hoàn tác."
          onConfirm={() => deleteAlert.mutate(pendingDeleteId)}
          onClose={() => setPendingDeleteId(null)}
        />
      )}
      <div className="px-7 pt-6 pb-10 flex flex-col gap-5">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-[36px] leading-none font-extrabold font-sans m-0 tracking-[-0.025em]">cảnh báo giá</h1>
            <p className="text-[14px] leading-[1.5] font-sans text-mute mt-2 mb-0 max-w-[480px]">
              nhận thông báo khi giá vượt ngưỡng. email trong 2 phút, push trong 30 giây.
            </p>
          </div>
          <div className="flex gap-[10px] items-center">
            <PushNotificationButton />
            <Button
              onClick={onOpenAdd}
              className="h-11 px-[18px] font-mono text-[14px] font-bold tracking-[0.04em] uppercase"
            >
              + thêm cảnh báo
            </Button>
          </div>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-4 gap-[14px]">
          {[
            { lbl: 'Đang hoạt động', val: activeCount,             gold: true  },
            { lbl: 'Đã kích hoạt',  val: triggeredCount,           gold: false },
            { lbl: 'Vị trí',        val: `${alerts.length} / 10`, gold: false },
            { lbl: 'Thời gian nghỉ', val: '30 phút',              gold: false },
          ].map(s => (
            <div key={s.lbl} className="bg-ink-2 border border-line rounded-[14px] p-[18px]">
              <div className="font-mono text-[9px] text-mute tracking-[0.14em] uppercase mb-2">{s.lbl}</div>
              <div className={cn('text-[30px] leading-none font-extrabold font-sans tabular-nums', s.gold ? 'text-gold' : 'text-chalk')}>
                {s.val}
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="bg-ink-3 border border-line h-auto p-1 gap-1">
            <TabsTrigger value="rules" className="font-mono text-[11px] font-bold tracking-[0.1em] uppercase data-[state=active]:bg-ink-2 data-[state=active]:text-chalk data-[state=inactive]:text-mute">
              Quy tắc đang dùng
            </TabsTrigger>
            <TabsTrigger value="history" className="font-mono text-[11px] font-bold tracking-[0.1em] uppercase data-[state=active]:bg-ink-2 data-[state=active]:text-chalk data-[state=inactive]:text-mute">
              Lịch sử kích hoạt
            </TabsTrigger>
            <TabsTrigger value="smart" className="font-mono text-[11px] font-bold tracking-[0.1em] uppercase data-[state=active]:bg-ink-2 data-[state=active]:text-chalk data-[state=inactive]:text-mute">
              Cảnh báo thông minh
            </TabsTrigger>
          </TabsList>

          {/* Rules tab */}
          <TabsContent value="rules" className="mt-0">
            <div className="bg-ink-2 border border-line rounded-[14px]">
              <div className="flex items-center justify-between px-[22px] py-4 border-b border-hairline">
                <h3 className="text-[16px] leading-none font-bold font-sans m-0">quy tắc đang dùng</h3>
              </div>
              <div
                className="grid px-[22px] py-3 font-mono text-[10px] text-mute tracking-[0.14em] uppercase bg-ink-3 border-b border-hairline"
                style={{ gridTemplateColumns: '80px 2fr 1.4fr 1fr 110px 130px' }}
              >
                <span>thương hiệu</span>
                <span>loại / điều kiện</span>
                <span className="text-right">ngưỡng</span>
                <span>lặp lại</span>
                <span>trạng thái</span>
                <span className="text-right">thao tác</span>
              </div>

              {isLoading && [0, 1, 2].map(i => <SkeletonRow key={i}/>)}

              {!isLoading && alerts.length === 0 && (
                <div className="px-[22px] py-12 text-center text-mute text-[14px] leading-[1.5] font-sans font-medium">
                  chưa có cảnh báo — nhấp <span className="text-gold">+ thêm cảnh báo</span> để bắt đầu
                </div>
              )}

              {!isLoading && alerts.map((a, i) => {
                const isActive = a.status === 'active';
                const isFired  = a.status === 'triggered';
                return (
                  <div
                    key={a.id}
                    className={cn(
                      'grid px-[22px] py-4 items-center',
                      i !== 0 && 'border-t border-hairline',
                      !isActive && 'opacity-55',
                    )}
                    style={{ gridTemplateColumns: '80px 2fr 1.4fr 1fr 110px 130px' }}
                  >
                    <span className="font-mono text-[11px] font-bold text-gold tracking-[0.1em]">{a.brand}</span>

                    <div>
                      <div className="text-[14px] leading-[1.1] font-sans font-medium mb-1">{a.goldType}</div>
                      <Badge className={cn(
                        'font-mono text-[10px] font-bold px-[6px] py-[3px] rounded-[3px] tracking-[0.08em] uppercase border-0',
                        a.condition === 'gte'
                          ? 'text-up bg-[rgba(88,200,150,0.10)] hover:bg-[rgba(88,200,150,0.10)]'
                          : 'text-down bg-[rgba(229,72,77,0.10)] hover:bg-[rgba(229,72,77,0.10)]',
                      )}>
                        {a.condition === 'gte' ? 'vượt lên ↑' : 'giảm xuống ↓'}
                      </Badge>
                    </div>

                    <div className="text-right">
                      <div className="text-[16px] leading-none font-bold font-sans tabular-nums">{fmtTarget(a)}</div>
                      <div className="font-mono text-[10px] text-mute mt-1">tạo lúc {fmtDate(a.createdAt)}</div>
                    </div>

                    <span className="font-mono text-[11px] text-bone">· {a.repeatMode ? 'lặp lại' : 'một lần'}</span>

                    <div>
                      {isFired
                        ? <Badge className="font-mono text-[9px] font-bold tracking-[0.14em] uppercase bg-gold text-gold-ink hover:bg-gold rounded-[3px]">
                            đã kích hoạt · {a.lastTriggeredAt ? fmtDate(a.lastTriggeredAt) : '—'}
                          </Badge>
                        : <Badge variant="outline" className={cn(
                            'font-mono text-[9px] font-bold tracking-[0.14em] uppercase rounded-[3px]',
                            isActive ? 'text-live border-[rgba(157,204,110,0.4)]' : 'text-mute border-line',
                          )}>
                            {isActive ? 'đang chờ' : 'tạm dừng'}
                          </Badge>
                      }
                    </div>

                    <div className="flex justify-end gap-1 items-center">
                      <Switch
                        checked={isActive}
                        onCheckedChange={() => handleToggle(a.id)}
                        disabled={toggleAlert.isPending}
                        className="data-[state=checked]:bg-gold data-[state=unchecked]:bg-ink-3"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(a.id)}
                        disabled={deleteAlert.isPending}
                        className={cn('w-7 h-8 text-down hover:bg-[rgba(229,72,77,0.08)] hover:text-down', deleteAlert.isPending && 'opacity-50')}
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M6 6l1 14a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-14"/>
                        </svg>
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </TabsContent>

          {/* History tab */}
          <TabsContent value="history" className="mt-0">
            <div className="bg-ink-2 border border-line rounded-[14px]">
              <div className="px-[22px] py-4 border-b border-hairline">
                <h3 className="text-[16px] leading-none font-bold font-sans m-0">lịch sử kích hoạt</h3>
              </div>
              <div
                className="grid px-[22px] py-3 font-mono text-[10px] text-mute tracking-[0.14em] uppercase bg-ink-3 border-b border-hairline"
                style={{ gridTemplateColumns: '2fr 1.4fr 1.4fr 1.4fr' }}
              >
                <span>mã cảnh báo</span>
                <span className="text-right">giá lúc kích hoạt</span>
                <span className="text-right">thời điểm kích hoạt</span>
                <span className="text-right">đã gửi email</span>
              </div>

              {histLoading && [0, 1, 2].map(i => (
                <div
                  key={i}
                  className="grid px-[22px] py-4 border-t border-hairline"
                  style={{ gridTemplateColumns: '2fr 1.4fr 1.4fr 1.4fr' }}
                >
                  {[120, 80, 100, 100].map((w, j) => (
                    <div
                      key={j}
                      className="h-[14px] rounded bg-ink-3 animate-pulse"
                      style={{ width: w, justifySelf: j === 0 ? 'start' : 'end' }}
                    />
                  ))}
                </div>
              ))}

              {!histLoading && history.length === 0 && (
                <div className="px-[22px] py-12 text-center text-mute text-[14px] leading-[1.5] font-sans font-medium">
                  chưa có lịch sử kích hoạt
                </div>
              )}

              {!histLoading && history.map((h, i) => (
                <div
                  key={h.id}
                  className={cn('grid px-[22px] py-4 items-center', i !== 0 && 'border-t border-hairline')}
                  style={{ gridTemplateColumns: '2fr 1.4fr 1.4fr 1.4fr' }}
                >
                  <span className="font-mono text-[11px] text-mute">{h.alertId.slice(0, 8)}…</span>
                  <div className="text-right text-[14px] leading-none font-bold font-sans tabular-nums">
                    {Number(h.priceAtTrigger).toLocaleString('en-US')}₫
                  </div>
                  <div className="font-mono text-right text-[11px] text-bone">
                    {new Date(h.triggeredAt).toLocaleString('en-US', { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div className="font-mono text-right text-[11px]">
                    {h.emailSentAt
                      ? <span className="text-live">đã gửi</span>
                      : <span className="text-mute">đang chờ</span>
                    }
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* Smart Alerts tab */}
          <TabsContent value="smart" className="mt-0">
            <SmartAlertsPanel />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
