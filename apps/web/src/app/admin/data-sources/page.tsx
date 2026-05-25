'use client';

import { useState } from 'react';
import {
  useAdminDataSources, useDisableDataSource, useEnableDataSource,
  useCreateDataSource, useUpdateDataSource,
} from '@/lib/admin.api';
import type { DataSourceAdminDto } from '@gpls/shared';
import { cn } from '@/lib/utils';

const TH = 'text-left p-[10px_16px] font-mono text-[10px] leading-none font-bold text-mute tracking-[0.14em] uppercase whitespace-nowrap';
const TD = 'p-[14px_16px]';

interface SourceFormValues {
  name: string; brand: string; url: string; crawlType: string; frequencyMin: number;
}
const EMPTY_FORM: SourceFormValues = { name: '', brand: 'SJC', url: '', crawlType: 'http', frequencyMin: 5 };

function EnabledBadge({ active }: { active: boolean }) {
  return (
    <span className={cn(
      'inline-block px-2 py-[3px] rounded font-mono text-[9px] leading-none font-bold tracking-[0.12em] uppercase border',
      active
        ? 'bg-[rgba(88,200,150,0.12)] text-up border-[rgba(88,200,150,0.3)]'
        : 'bg-[rgba(100,100,120,0.18)] text-mute border-line',
    )}>
      {active ? 'enabled' : 'disabled'}
    </span>
  );
}

const INPUT_CLS = 'bg-ink border border-line rounded-md px-[10px] py-2 font-mono text-[12px] leading-none text-chalk outline-none w-full';
const LABEL_CLS = 'block font-mono text-[9px] leading-none font-bold text-mute tracking-[0.12em] uppercase mb-[5px]';

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
        {mode === 'create' ? 'New Data Source' : 'Edit Data Source'}
      </div>
      <div className="grid gap-[14px] mb-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))' }}>
        <div>
          <label className={LABEL_CLS}>Name</label>
          <input type="text" value={form.name} onChange={e => set('name', e.target.value)} required placeholder="e.g. SJC HCM" className={INPUT_CLS}/>
        </div>
        <div>
          <label className={LABEL_CLS}>Brand</label>
          <select value={form.brand} onChange={e => set('brand', e.target.value)} className={INPUT_CLS}>
            <option value="SJC">SJC</option>
            <option value="DOJI">DOJI</option>
            <option value="PNJ">PNJ</option>
            <option value="BAO_TIN">BAO_TIN</option>
          </select>
        </div>
        <div className="col-span-2">
          <label className={LABEL_CLS}>URL</label>
          <input type="url" value={form.url} onChange={e => set('url', e.target.value)} required placeholder="https://..." className={INPUT_CLS}/>
        </div>
        <div>
          <label className={LABEL_CLS}>Crawl Type</label>
          <select value={form.crawlType} onChange={e => set('crawlType', e.target.value)} className={INPUT_CLS}>
            <option value="http">http</option>
            <option value="html">html</option>
            <option value="api">api</option>
          </select>
        </div>
        <div>
          <label className={LABEL_CLS}>Frequency (min)</label>
          <input type="number" value={form.frequencyMin} min={1} onChange={e => set('frequencyMin', parseInt(e.target.value, 10) || 5)} className={INPUT_CLS}/>
        </div>
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isPending}
          className={cn('px-[18px] py-2 bg-gold border-0 rounded-md font-mono text-[10px] leading-none font-bold text-gold-ink tracking-[0.08em] uppercase', isPending ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer')}
        >
          {isPending ? 'Saving…' : mode === 'create' ? 'Create' : 'Save'}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="px-[14px] py-2 bg-transparent border border-line rounded-md font-mono text-[10px] leading-none font-bold text-mute tracking-[0.08em] uppercase cursor-pointer"
        >
          Cancel
        </button>
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
          <h1 className="font-display text-[28px] leading-none font-extrabold m-0 mb-[6px] tracking-[-0.02em]">Data Sources</h1>
          <div className="font-mono text-[12px] leading-none text-mute">Manage crawl sources for all gold brands</div>
        </div>
        <button
          onClick={() => { setEditTarget(null); setFormMode('create'); }}
          className={cn(
            'px-[18px] py-[9px] rounded-lg font-mono text-[11px] leading-none font-bold tracking-[0.08em] uppercase cursor-pointer',
            formMode === 'create'
              ? 'bg-[rgba(212,175,55,0.15)] border border-gold text-gold'
              : 'bg-gold border-0 text-gold-ink',
          )}
        >
          + New Source
        </button>
      </div>

      {formMode === 'create' && <SourceForm mode="create" onClose={closeForm}/>}
      {formMode === 'edit' && editTarget && (
        <SourceForm mode="edit" initial={{ id: editTarget.id, name: editTarget.name, brand: editTarget.brand, url: editTarget.url, crawlType: editTarget.crawlType, frequencyMin: editTarget.frequencyMin }} onClose={closeForm}/>
      )}

      <div className="bg-ink-2 border border-line rounded-[12px] overflow-hidden">
        {isLoading && <div className="p-6 font-mono text-[13px] leading-none text-mute">Loading…</div>}
        {isError  && <div className="p-6 font-mono text-[13px] leading-none text-down">Failed to load data sources.</div>}

        {!isLoading && !isError && (
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-ink-3">
                {['Name', 'Brand', 'URL', 'Crawl Type', 'Freq (min)', 'Status', 'Last Crawled', 'Actions'].map(col => (
                  <th key={col} className={TH}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(sources ?? []).length === 0 ? (
                <tr><td colSpan={8} className="p-[24px_16px] font-mono text-[13px] text-mute text-center">No data sources found.</td></tr>
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
                      <button onClick={() => openEdit(ds)} className="px-[11px] py-[6px] bg-transparent border border-line rounded-md font-mono text-[10px] leading-none font-bold text-bone tracking-[0.08em] uppercase cursor-pointer">
                        Edit
                      </button>
                      {ds.isActive ? (
                        <button onClick={() => disable(ds.id)} disabled={isDisabling} className={cn('px-[11px] py-[6px] bg-transparent border border-down rounded-md font-mono text-[10px] leading-none font-bold text-down tracking-[0.08em] uppercase', isDisabling ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer')}>
                          Disable
                        </button>
                      ) : (
                        <button onClick={() => enable(ds.id)} disabled={isEnabling} className={cn('px-[11px] py-[6px] bg-transparent border border-up rounded-md font-mono text-[10px] leading-none font-bold text-up tracking-[0.08em] uppercase', isEnabling ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer')}>
                          Enable
                        </button>
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
