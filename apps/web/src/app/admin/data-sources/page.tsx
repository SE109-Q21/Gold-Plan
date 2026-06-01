'use client';

import { useState } from 'react';
import {
  useAdminDataSources, useDisableDataSource, useEnableDataSource,
  useCreateDataSource, useUpdateDataSource,
} from '@/lib/admin.api';
import type { DataSourceAdminDto } from '@gpls/shared';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const TH = 'text-left p-[10px_16px] font-mono text-[10px] leading-none font-bold text-mute tracking-[0.14em] uppercase whitespace-nowrap';
const TD = 'p-[14px_16px]';

interface SourceFormValues {
  name: string; brand: string; url: string; crawlType: string; frequencyMin: number;
}

function EnabledBadge({ active }: { active: boolean }) {
  return (
    <span className={cn(
      'inline-block px-2 py-[3px] rounded font-mono text-[9px] leading-none font-bold tracking-[0.12em] uppercase border',
      active
        ? 'bg-[rgba(88,200,150,0.12)] text-up border-[rgba(88,200,150,0.3)]'
        : 'bg-[rgba(100,100,120,0.18)] text-mute border-line',
    )}>
      {active ? 'Hoạt động' : 'Tắt'}
    </span>
  );
}

const INPUT_CLS = 'bg-ink border-line font-mono text-[12px] text-chalk placeholder:text-mute focus-visible:ring-gold h-[34px]';
const LABEL_CLS = 'font-mono text-[9px] leading-none font-bold text-mute tracking-[0.12em] uppercase mb-[5px]';

function SourceForm({ initial, mode, onClose }: { initial?: Partial<SourceFormValues & { id: string }>; mode: 'create' | 'edit'; onClose: () => void }) {
  const [form, setForm] = useState<SourceFormValues>({
    name: initial?.name ?? '', brand: initial?.brand ?? 'SJC', url: initial?.url ?? '',
    crawlType: initial?.crawlType ?? 'http', frequencyMin: initial?.frequencyMin ?? 5,
  });

  const { mutate: create, isPending: isCreating } = useCreateDataSource();
  const { mutate: update, isPending: isUpdating } = useUpdateDataSource();
  const isPending = isCreating || isUpdating;

  function set(field: keyof SourceFormValues, value: string | number) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (mode === 'create') create(form, { onSuccess: onClose });
    else if (initial?.id) update({ id: initial.id, ...form }, { onSuccess: onClose });
  }

  return (
    <form onSubmit={handleSubmit} className="bg-ink-2 border border-line rounded-[10px] p-[18px_22px] mb-[22px]">
      <div className="font-mono text-[11px] leading-none font-bold text-gold tracking-[0.1em] uppercase mb-[14px]">
        {mode === 'create' ? 'Nguồn Dữ Liệu Mới' : 'Chỉnh Sửa Nguồn Dữ Liệu'}
      </div>
      <div className="grid gap-[14px] mb-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))' }}>
        <div>
          <Label className={LABEL_CLS}>Tên</Label>
          <Input type="text" value={form.name} onChange={e => set('name', e.target.value)} required placeholder="vd. SJC HCM" className={INPUT_CLS}/>
        </div>
        <div>
          <Label className={LABEL_CLS}>Thương hiệu</Label>
          <select value={form.brand} onChange={e => set('brand', e.target.value)} className="bg-ink border border-line rounded-md px-[10px] py-2 font-mono text-[12px] leading-none text-bone cursor-pointer outline-none w-full h-[34px]">
            <option value="SJC">SJC</option>
            <option value="DOJI">DOJI</option>
            <option value="PNJ">PNJ</option>
            <option value="BAO_TIN">BAO_TIN</option>
          </select>
        </div>
        <div className="col-span-2">
          <Label className={LABEL_CLS}>Đường dẫn (URL)</Label>
          <Input type="url" value={form.url} onChange={e => set('url', e.target.value)} required placeholder="https://..." className={INPUT_CLS}/>
        </div>
        <div>
          <Label className={LABEL_CLS}>Kiểu thu thập</Label>
          <select value={form.crawlType} onChange={e => set('crawlType', e.target.value)} className="bg-ink border border-line rounded-md px-[10px] py-2 font-mono text-[12px] leading-none text-bone cursor-pointer outline-none w-full h-[34px]">
            <option value="http">http</option>
            <option value="html">html</option>
            <option value="api">api</option>
          </select>
        </div>
        <div>
          <Label className={LABEL_CLS}>Tần suất (phút)</Label>
          <Input type="number" value={form.frequencyMin} min={1} onChange={e => set('frequencyMin', parseInt(e.target.value, 10) || 5)} className={INPUT_CLS}/>
        </div>
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={isPending} size="sm" className="px-[18px] font-mono text-[10px] font-bold tracking-[0.08em] uppercase">
          {isPending ? 'Đang lưu…' : mode === 'create' ? 'Tạo mới' : 'Lưu'}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={onClose} className="px-[14px] border-line bg-transparent text-mute hover:bg-ink-3 hover:text-bone font-mono text-[10px] font-bold tracking-[0.08em] uppercase">
          Hủy
        </Button>
      </div>
    </form>
  );
}

export default function AdminDataSourcesPage() {
  const { data: sources, isLoading, isError } = useAdminDataSources();
  const { mutate: disable, isPending: isDisabling } = useDisableDataSource();
  const { mutate: enable, isPending: isEnabling } = useEnableDataSource();

  const [formMode, setFormMode] = useState<'none' | 'create' | 'edit'>('none');
  const [editTarget, setEditTarget] = useState<DataSourceAdminDto | null>(null);

  function openEdit(ds: DataSourceAdminDto) { setEditTarget(ds); setFormMode('edit'); }
  function closeForm() { setFormMode('none'); setEditTarget(null); }

  return (
    <div className="p-[32px_36px]">
      <div className="flex items-center justify-between mb-7">
        <div>
          <h1 className="font-display text-[28px] leading-none font-extrabold m-0 mb-[6px] tracking-[-0.02em] uppercase">Nguồn Dữ Liệu</h1>
          <div className="font-mono text-[12px] leading-none text-mute">Quản lý nguồn thu thập dữ liệu cho tất cả thương hiệu vàng</div>
        </div>
        <Button
          onClick={() => { setEditTarget(null); setFormMode('create'); }}
          className={cn(
            'font-mono text-[11px] font-bold tracking-[0.08em] uppercase',
            formMode === 'create' ? 'bg-[rgba(212,175,55,0.15)] border border-gold text-gold hover:bg-[rgba(212,175,55,0.25)] hover:text-gold' : '',
          )}
        >
          + Nguồn mới
        </Button>
      </div>

      {formMode === 'create' && <SourceForm mode="create" onClose={closeForm}/>}
      {formMode === 'edit' && editTarget && (
        <SourceForm mode="edit" initial={{ id: editTarget.id, name: editTarget.name, brand: editTarget.brand, url: editTarget.url, crawlType: editTarget.crawlType, frequencyMin: editTarget.frequencyMin }} onClose={closeForm}/>
      )}

      <div className="bg-ink-2 border border-line rounded-[12px] overflow-hidden">
        {isLoading && <div className="p-6 font-mono text-[13px] leading-none text-mute">Đang tải…</div>}
        {isError  && <div className="p-6 font-mono text-[13px] leading-none text-down">Không thể tải nguồn dữ liệu.</div>}

        {!isLoading && !isError && (
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-ink-3">
                {['Tên', 'Thương hiệu', 'URL', 'Kiểu thu thập', 'Tần suất (phút)', 'Trạng thái', 'Lần thu thập cuối', 'Hành động'].map(col => (
                  <th key={col} className={TH}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(sources ?? []).length === 0 ? (
                <tr><td colSpan={8} className="p-[24px_16px] font-mono text-[13px] text-mute text-center">Không tìm thấy nguồn dữ liệu nào.</td></tr>
              ) : (sources ?? []).map(ds => (
                <tr key={ds.id} className="border-t border-hairline">
                  <td className={cn(TD, 'font-display text-[13px] leading-none font-semibold')}>{ds.name}</td>
                  <td className={cn(TD, 'font-mono text-[11px] leading-none font-bold text-gold tracking-[0.06em]')}>{ds.brand}</td>
                  <td className={cn(TD, 'max-w-[200px]')}>
                    <span title={ds.url} className="font-mono text-[11px] leading-none text-mute block overflow-hidden text-ellipsis whitespace-nowrap max-w-[180px]">
                      {ds.url}
                    </span>
                  </td>
                  <td className={cn(TD, 'font-mono text-[12px] leading-none text-bone')}>{ds.crawlType}</td>
                  <td className={cn(TD, 'font-mono text-[12px] leading-none text-mute text-center')}>{ds.frequencyMin}</td>
                  <td className={TD}><EnabledBadge active={ds.isActive}/></td>
                  <td className={cn(TD, 'font-mono text-[12px] leading-none text-mute whitespace-nowrap')}>
                    {ds.lastCrawledAt ? new Date(ds.lastCrawledAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }) : '—'}
                  </td>
                  <td className={TD}>
                    <div className="flex gap-[6px] items-center">
                      <Button variant="outline" size="sm" onClick={() => openEdit(ds)} className="px-[11px] py-[6px] h-auto border-line bg-transparent text-bone hover:bg-ink-3 font-mono text-[10px] font-bold tracking-[0.08em] uppercase">
                        Sửa
                      </Button>
                      {ds.isActive ? (
                        <Button variant="outline" size="sm" onClick={() => disable(ds.id)} disabled={isDisabling} className="px-[11px] py-[6px] h-auto border-down bg-transparent text-down hover:bg-[rgba(229,72,77,0.08)] hover:text-down font-mono text-[10px] font-bold tracking-[0.08em] uppercase">
                          Tắt
                        </Button>
                      ) : (
                        <Button variant="outline" size="sm" onClick={() => enable(ds.id)} disabled={isEnabling} className="px-[11px] py-[6px] h-auto border-up bg-transparent text-up hover:bg-[rgba(88,200,150,0.08)] hover:text-up font-mono text-[10px] font-bold tracking-[0.08em] uppercase">
                          Bật
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
