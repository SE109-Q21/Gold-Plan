'use client';

import { useState } from 'react';
import { useAlerts, useToggleAlert, useDeleteAlert, useAlertHistory } from '@/lib/alerts.api';
import type { PriceAlertDto } from '@gpls/shared';
import { PushNotificationButton } from '@/components/PushNotificationButton';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent } from '@/components/ui/dialog';

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
            <div className="text-[16px] leading-none font-bold font-sans text-chalk mb-[6px]">Xóa cảnh báo</div>
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
  return price.toLocaleString('vi-VN') + '₫';
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('vi-VN', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

const GOLD_TYPE_LABELS: Record<string, string> = {
  MIEN_SJC: 'Vàng miếng SJC',
  NHAN_9999: 'Nhẫn tròn 9999',
  VANG_24K: 'Vàng 24K',
  VANG_18K: 'Vàng 18K',
};

function goldTypeLabel(code: string): string {
  return GOLD_TYPE_LABELS[code] ?? code;
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
            <div className="font-mono text-[11px] text-mute mt-2 max-w-[480px]">
              nhận thông báo khi giá vượt ngưỡng. email trong 2 phút, push trong 30 giây.
            </div>
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
          </TabsList>

          {/* Rules tab */}
          <TabsContent value="rules" className="mt-0">
            <div className="bg-ink-2 border border-line rounded-[14px]">
              <div className="flex items-center justify-between px-[22px] py-4 border-b border-hairline">
                <h3 className="text-[16px] leading-none font-bold font-sans m-0">Quy tắc đang dùng</h3>
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
                <div className="px-[22px] py-12 text-center font-mono text-[13px] leading-none font-medium text-mute">
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
                      <div className="text-[14px] leading-[1.1] font-sans font-medium mb-1">{goldTypeLabel(a.goldType)}</div>
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
                <h3 className="text-[16px] leading-none font-bold font-sans m-0">Lịch sử kích hoạt</h3>
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
                <div className="px-[22px] py-12 text-center font-mono text-[13px] leading-none font-medium text-mute">
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
                    {Number(h.priceAtTrigger).toLocaleString('vi-VN')}₫
                  </div>
                  <div className="font-mono text-right text-[11px] text-bone">
                    {new Date(h.triggeredAt).toLocaleString('vi-VN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
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

        </Tabs>
      </div>
    </>
  );
}
