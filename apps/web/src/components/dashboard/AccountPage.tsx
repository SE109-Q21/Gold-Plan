'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { apiChangePassword, apiDeleteAccount } from '@/lib/auth.api';
import { useClearHistory } from '@/lib/browsing-history.api';
import { useSubscribeDigest } from '@/lib/digest.api';
import { useResetPreferences } from '@/lib/personalisation.api';
import { usePortfolio } from '@/lib/portfolio.api';
import { useAlerts } from '@/lib/alerts.api';
import { PushNotificationButton } from '@/components/PushNotificationButton';
import { cn } from '@/lib/utils';
import type { PortfolioTransactionDto, PaginatedDto } from '@gpls/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

function downloadCsv(data: Record<string, unknown>[], filename: string) {
  if (data.length === 0) return;
  const keys = Object.keys(data[0]);
  const rows = [keys.join(','), ...data.map(row => keys.map(k => JSON.stringify(row[k] ?? '')).join(','))];
  const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function Toggle({ on, onChange, disabled }: { on: boolean; onChange: () => void; disabled?: boolean }) {
  return (
    <Switch
      checked={on}
      onCheckedChange={onChange}
      disabled={disabled}
      className="data-[state=checked]:bg-gold data-[state=unchecked]:bg-ink-3"
    />
  );
}

function Segmented({ options, value, onChange }: { options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex bg-ink-3 border border-line rounded-md p-[2px] shrink-0">
      {options.map(o => (
        <Button
          key={o}
          variant="ghost"
          onClick={() => onChange(o)}
          className={cn(
            'px-3 py-[6px] h-auto rounded font-mono text-[10px] font-bold tracking-[0.1em] uppercase',
            value === o ? 'bg-gold text-gold-ink hover:bg-gold hover:text-gold-ink' : 'bg-transparent text-bone hover:bg-transparent hover:text-chalk',
          )}
        >
          {o}
        </Button>
      ))}
    </div>
  );
}

function Row({ label, detail, right }: { label: string; detail?: string; right: React.ReactNode }) {
  return (
    <div className="flex items-center gap-4 px-[22px] py-4 border-t border-hairline">
      <div className="flex-1">
        <div className="font-sans text-[14px] leading-[1.2] font-medium">{label}</div>
        {detail && <div className="font-mono text-[11px] text-mute mt-[5px]">{detail}</div>}
      </div>
      {right}
    </div>
  );
}

function SmallBtn({ onClick, disabled, danger, children }: {
  onClick?: () => void;
  disabled?: boolean;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'h-8 px-3 font-mono text-[11px] font-bold tracking-[0.04em] uppercase',
        danger
          ? 'border-[rgba(229,72,77,0.4)] bg-transparent text-down hover:bg-[rgba(229,72,77,0.08)] hover:text-down'
          : 'bg-ink-3 border-line text-bone hover:bg-ink-4 hover:text-chalk',
      )}
    >
      {children}
    </Button>
  );
}

function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const { getAccessToken } = useAuth();
  const [oldPw, setOldPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (newPw.length < 8) { setError('Mật khẩu mới phải có ít nhất 8 ký tự'); return; }
    if (!/[A-Z]/.test(newPw)) { setError('Mật khẩu mới cần ít nhất 1 chữ hoa'); return; }
    if (!/[0-9]/.test(newPw)) { setError('Mật khẩu mới cần ít nhất 1 chữ số'); return; }
    if (newPw !== confirm) { setError('Mật khẩu không khớp'); return; }
    if (!getAccessToken()) { setError('Chưa xác thực'); return; }
    setLoading(true);
    try {
      await apiChangePassword(getAccessToken() ?? '', oldPw, newPw);
      setSuccess(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Đổi mật khẩu thất bại');
    } finally {
      setLoading(false);
    }
  }

  const labelCls = 'font-mono text-[10px] leading-none font-semibold tracking-[0.1em] uppercase text-mute';
  const inputCls = 'bg-ink-3 border-line text-chalk font-sans text-[13px] font-medium focus-visible:ring-gold h-9';

  return (
    <Dialog open onOpenChange={o => !o && onClose()}>
      <DialogContent className="w-[360px] bg-ink-2 border-line text-chalk p-7 gap-0">
        <DialogHeader className="mb-5">
          <DialogTitle className="font-display text-[16px] leading-none font-bold">Đổi mật khẩu</DialogTitle>
        </DialogHeader>
        {success ? (
          <div>
            <p className="text-up text-[14px]">Mật khẩu đã được cập nhật.</p>
            <Button onClick={onClose} className="mt-4 h-9 px-4 font-mono text-[11px] font-bold">
              Đóng
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <div className="flex flex-col gap-[5px]"><Label className={labelCls}>Mật khẩu hiện tại</Label><Input type="password" value={oldPw} onChange={e => setOldPw(e.target.value)} required className={inputCls} autoComplete="current-password"/></div>
            <div className="flex flex-col gap-[5px]"><Label className={labelCls}>Mật khẩu mới</Label><Input type="password" value={newPw} onChange={e => setNewPw(e.target.value)} required className={inputCls} autoComplete="new-password"/></div>
            <div className="flex flex-col gap-[5px]"><Label className={labelCls}>Xác nhận mật khẩu mới</Label><Input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required className={inputCls} autoComplete="new-password"/></div>
            {error && (
              <div className="text-down text-[12px] px-[10px] py-2 bg-[rgba(229,72,77,0.1)] rounded-md">{error}</div>
            )}
            <div className="flex gap-2 justify-end mt-1">
              <Button type="button" variant="outline" onClick={onClose} className="h-[34px] px-[14px] bg-ink-3 border-line text-bone hover:bg-ink-4 hover:text-chalk font-mono text-[10px] font-bold">
                Hủy
              </Button>
              <Button type="submit" disabled={loading} className="h-[34px] px-[14px] font-mono text-[10px] font-bold">
                {loading ? 'Đang lưu…' : 'Cập nhật'}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function AccountPage() {
  const { user, getAccessToken, logout } = useAuth();
  const router = useRouter();
  const clearHistory = useClearHistory();
  const subscribeDigest = useSubscribeDigest();
  const resetPrefs = useResetPreferences();
  const portfolioQuery = usePortfolio();
  const alertsQuery = useAlerts();
  const [theme, setTheme] = useState('DARK');
  const [unit, setUnit] = useState('TAEL');
  const [notifEmail, setNotifEmail] = useState(true);
  const [notifDigest, setNotifDigest] = useState(user?.digestOptIn ?? false);
  const [showChangePw, setShowChangePw] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  async function handleDeleteAccount() {
    if (!confirm('Xóa tài khoản? Hành động này không thể hoàn tác và toàn bộ dữ liệu sẽ bị xóa.')) return;
    if (!getAccessToken()) return;
    setDeletingAccount(true);
    try {
      await apiDeleteAccount(getAccessToken() ?? '');
      await logout();
      router.push('/auth/login');
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Xóa tài khoản thất bại');
      setDeletingAccount(false);
    }
  }

  async function handleSignOut() {
    await logout();
    router.push('/auth/login');
  }

  async function handleClearHistory() {
    if (!window.confirm('Xóa toàn bộ lịch sử duyệt? Hành động này không thể hoàn tác.')) return;
    await clearHistory.mutateAsync();
  }

  const initials = user
    ? (user.displayName ?? user.email)
        .split(/[\s@]/)
        .filter(Boolean)
        .slice(0, 2)
        .map((p: string) => p[0].toUpperCase())
        .join('')
    : 'GT';

  return (
    <>
      {showChangePw && <ChangePasswordModal onClose={() => setShowChangePw(false)} />}
      <div
        className="p-[24px_28px_40px] grid gap-5"
        style={{ gridTemplateColumns: '1.4fr 1fr' }}
      >
        {/* Left column */}
        <div className="flex flex-col gap-5">
          {/* Profile card */}
          <div className="bg-ink-2 border border-line rounded-[14px] p-7 [clip-path:polygon(0_0,calc(100%-22px)_0,100%_22px,100%_100%,0_100%)]">
            <div className="flex items-center gap-[18px]">
              <div className="w-[72px] h-[72px] rounded-[14px] bg-[linear-gradient(135deg,#D4AF37,#8E7321)] flex items-center justify-center font-display text-[26px] leading-none font-extrabold text-gold-ink">
                {initials}
              </div>
              <div className="flex-1">
                <div className="font-display text-[24px] leading-[1.1] font-bold tracking-[-0.015em] mb-[6px]">
                  {user?.displayName ?? user?.email ?? 'GoldTracker User'}
                </div>
                <div className="font-mono text-[12px] text-mute">
                  {user ? (user.role === 'admin' ? 'Quản trị viên' : 'Thành viên') : 'Khách'}
                </div>
              </div>
              <span className="stamp text-[10px]">Thành viên Vàng</span>
            </div>
            {(() => {
              const portfolio = portfolioQuery.data;
              const alerts = alertsQuery.data ?? [];
              const totalValue = portfolio ? (portfolio.totalValueVnd / 1_000_000).toFixed(1) + 'M ₫' : '—';
              const pnl = portfolio
                ? ((portfolio.totalPnlVnd >= 0 ? '+' : '') + (portfolio.totalPnlVnd / 1_000_000).toFixed(1) + 'M ₫')
                : '—';
              const pnlColor = portfolio
                ? (portfolio.totalPnlVnd >= 0 ? 'text-up' : 'text-down')
                : 'text-chalk';
              const stats = [
                { l: 'Danh mục', v: totalValue, color: 'text-chalk' },
                { l: 'Lãi/Lỗ · 30 ngày', v: pnl, color: pnlColor },
                { l: 'Cảnh báo', v: `${alerts.length} / 10`, color: 'text-chalk' },
              ];
              return (
                <div className="grid grid-cols-3 mt-[22px] pt-[18px] border-t border-hairline">
                  {stats.map(s => (
                    <div key={s.l}>
                      <div className="font-mono text-[9px] text-mute tracking-[0.14em] uppercase mb-[6px]">{s.l}</div>
                      <div className={cn('font-display text-[22px] leading-none font-bold [font-variant-numeric:tabular-nums]', s.color)}>{s.v}</div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>

          {/* Preferences */}
          <div className="bg-ink-2 border border-line rounded-[14px]">
            <div className="px-[22px] py-4">
              <h3 className="font-display text-[16px] leading-none font-bold m-0">Tùy chỉnh</h3>
            </div>
            <Row label="Đơn vị tiền tệ" detail="tất cả giá hiển thị theo đơn vị này" right={<Segmented options={['USD', 'VND', 'EUR']} value="USD" onChange={() => {}}/>}/>
            <Row label="Giao diện" detail="tối theo mặc định" right={<Segmented options={['DARK', 'LIGHT', 'AUTO']} value={theme} onChange={setTheme}/>}/>
            <Row label="Đơn vị khối lượng" detail="giá quy đổi từ troy oz" right={<Segmented options={['TROY OZ', 'TAEL', 'GRAM']} value={unit} onChange={setUnit}/>}/>
            <Row
              label="Khôi phục mặc định"
              detail="đặt lại tất cả tuỳ chọn và vị trí ghim"
              right={
                <SmallBtn
                  danger
                  disabled={resetPrefs.isPending}
                  onClick={() => {
                    if (window.confirm('Xoá tất cả tuỳ chọn cá nhân và vị trí ghim?')) {
                      resetPrefs.mutate();
                    }
                  }}
                >
                  {resetPrefs.isPending ? '…' : 'Đặt lại'}
                </SmallBtn>
              }
            />
          </div>

          {/* Notifications */}
          <div className="bg-ink-2 border border-line rounded-[14px]">
            <div className="px-[22px] py-4">
              <h3 className="font-display text-[16px] leading-none font-bold m-0">Thông báo</h3>
            </div>
            <Row label="Cảnh báo email" detail="trong vòng 2 phút khi kích hoạt" right={<Toggle on={notifEmail} onChange={() => setNotifEmail(!notifEmail)}/>}/>
            <Row label="Thông báo trình duyệt" detail="nhận thông báo ngay trên trình duyệt" right={<PushNotificationButton />}/>
            <Row
              label="Bản tin buổi sáng"
              detail="tóm tắt thị trường lúc 07:30 · tùy chọn"
              right={
                <Toggle
                  on={notifDigest}
                  disabled={subscribeDigest.isPending}
                  onChange={() => { setNotifDigest(!notifDigest); subscribeDigest.mutate(!notifDigest); }}
                />
              }
            />
          </div>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-5">
          <div className="bg-ink-2 border border-line rounded-[14px]">
            <div className="px-[22px] py-4">
              <h3 className="font-display text-[16px] leading-none font-bold m-0">Bảo mật</h3>
            </div>
            <Row label="Mật khẩu" detail="nhấn để cập nhật mật khẩu" right={<SmallBtn onClick={() => setShowChangePw(true)}>đổi</SmallBtn>}/>
            <Row label="Xác thực 2 bước" detail="ứng dụng xác thực (Google Authenticator, v.v.)" right={<span className="font-mono text-[11px] text-up">· Đang bật</span>}/>
          </div>

          <div className="bg-ink-2 border border-line rounded-[14px]">
            <div className="px-[22px] py-4">
              <h3 className="font-display text-[16px] leading-none font-bold m-0">Dữ liệu & Xuất file</h3>
            </div>
            <Row label="Xuất lịch sử" detail="CSV · 12 tháng gần nhất" right={<SmallBtn>xuất</SmallBtn>}/>
            <Row label="Khóa API" detail="chỉ đọc · dùng cho tích hợp bên ngoài" right={<span className="font-mono text-[11px] text-mute">gt_live_••••a31f</span>}/>
            <Row
              label="Lịch sử duyệt"
              detail="Xem và xóa lịch sử xem giá"
              right={<SmallBtn onClick={() => router.push('/profile/history')}>xem →</SmallBtn>}
            />
            <Row
              label="Xóa lịch sử duyệt"
              detail="Xóa toàn bộ lịch sử xem giá"
              right={
                <SmallBtn danger disabled={clearHistory.isPending} onClick={handleClearHistory}>
                  {clearHistory.isPending ? '…' : 'xóa'}
                </SmallBtn>
              }
            />
          </div>

          <div className="bg-ink-2 border border-[rgba(229,72,77,0.3)] rounded-[14px]">
            <div className="px-[22px] py-4">
              <h3 className="font-display text-[16px] leading-none font-bold m-0 text-down">vùng nguy hiểm</h3>
            </div>
            <Row label="Đăng xuất" detail="kết thúc phiên làm việc" right={<SmallBtn onClick={handleSignOut}>đăng xuất</SmallBtn>}/>
            <Row
              label="Xóa tài khoản"
              detail="không thể hoàn tác · toàn bộ dữ liệu bị xóa"
              right={
                <SmallBtn danger disabled={deletingAccount} onClick={handleDeleteAccount}>
                  {deletingAccount ? '…' : 'xóa'}
                </SmallBtn>
              }
            />
          </div>

          <div className="bg-ink-2 border border-line rounded-[14px] p-[22px]">
            <div className="stamp text-[10px] mb-2">về ứng dụng</div>
            <div className="font-display text-[16px] leading-[1.2] font-bold mb-[6px]">GoldTracker · v2.4.1</div>
            <div className="font-mono text-[11px] text-mute leading-[1.5]">
              dữ liệu: kitco, gold-api, sjc, doji, pnj<br/>
              làm mới · 5 phút trong 07:00–17:00 (ict)
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
