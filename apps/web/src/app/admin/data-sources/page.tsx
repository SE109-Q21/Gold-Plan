'use client';

import { useState } from 'react';
import {
  useAdminDataSources,
  useDisableDataSource,
  useEnableDataSource,
  useCreateDataSource,
  useUpdateDataSource,
} from '@/lib/admin.api';
import type { DataSourceAdminDto } from '@gpls/shared';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SourceFormValues {
  name: string;
  brand: string;
  url: string;
  crawlType: string;
  frequencyMin: number;
}

const EMPTY_FORM: SourceFormValues = {
  name: '',
  brand: 'SJC',
  url: '',
  crawlType: 'http',
  frequencyMin: 5,
};

// ─── Status Badge ─────────────────────────────────────────────────────────────

function EnabledBadge({ active }: { active: boolean }) {
  return (
    <span style={{
      display: 'inline-block',
      padding: '3px 8px',
      borderRadius: 4,
      font: '700 9px/1 var(--font-mono)',
      letterSpacing: '0.12em',
      textTransform: 'uppercase',
      background: active ? 'rgba(88,200,150,0.12)' : 'rgba(100,100,120,0.18)',
      color: active ? 'var(--up)' : 'var(--mute)',
      border: `1px solid ${active ? 'rgba(88,200,150,0.3)' : 'var(--line)'}`,
    }}>
      {active ? 'enabled' : 'disabled'}
    </span>
  );
}

// ─── Source Form ──────────────────────────────────────────────────────────────

interface SourceFormProps {
  initial?: Partial<SourceFormValues & { id: string }>;
  mode: 'create' | 'edit';
  onClose: () => void;
}

function SourceForm({ initial, mode, onClose }: SourceFormProps) {
  const [form, setForm] = useState<SourceFormValues>({
    name: initial?.name ?? '',
    brand: initial?.brand ?? 'SJC',
    url: initial?.url ?? '',
    crawlType: initial?.crawlType ?? 'http',
    frequencyMin: initial?.frequencyMin ?? 5,
  });

  const { mutate: create, isPending: isCreating } = useCreateDataSource();
  const { mutate: update, isPending: isUpdating } = useUpdateDataSource();
  const isPending = isCreating || isUpdating;

  function set(field: keyof SourceFormValues, value: string | number) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (mode === 'create') {
      create(form, { onSuccess: onClose });
    } else if (initial?.id) {
      update({ id: initial.id, ...form }, { onSuccess: onClose });
    }
  }

  const inputStyle: React.CSSProperties = {
    background: 'var(--ink)',
    border: '1px solid var(--line)',
    borderRadius: 6,
    padding: '8px 10px',
    font: '500 12px/1 var(--font-mono)',
    color: 'var(--chalk)',
    outline: 'none',
    width: '100%',
    colorScheme: 'dark',
  };

  const labelStyle: React.CSSProperties = {
    font: '700 9px/1 var(--font-mono)',
    color: 'var(--mute)',
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    marginBottom: 5,
    display: 'block',
  };

  const fieldStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        background: 'var(--ink-2)',
        border: '1px solid var(--line)',
        borderRadius: 10,
        padding: '18px 22px',
        marginBottom: 22,
      }}
    >
      <div style={{
        font: '700 11px/1 var(--font-mono)',
        color: 'var(--gold)',
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        marginBottom: 14,
      }}>
        {mode === 'create' ? 'New Data Source' : 'Edit Data Source'}
      </div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
        gap: 14,
        marginBottom: 16,
      }}>
        <div style={fieldStyle}>
          <label style={labelStyle}>Name</label>
          <input
            type="text"
            value={form.name}
            onChange={e => set('name', e.target.value)}
            required
            placeholder="e.g. SJC HCM"
            style={inputStyle}
          />
        </div>
        <div style={fieldStyle}>
          <label style={labelStyle}>Brand</label>
          <select
            value={form.brand}
            onChange={e => set('brand', e.target.value)}
            style={inputStyle}
          >
            <option value="SJC">SJC</option>
            <option value="DOJI">DOJI</option>
            <option value="PNJ">PNJ</option>
            <option value="BAO_TIN">BAO_TIN</option>
          </select>
        </div>
        <div style={{ ...fieldStyle, gridColumn: 'span 2' }}>
          <label style={labelStyle}>URL</label>
          <input
            type="url"
            value={form.url}
            onChange={e => set('url', e.target.value)}
            required
            placeholder="https://..."
            style={inputStyle}
          />
        </div>
        <div style={fieldStyle}>
          <label style={labelStyle}>Crawl Type</label>
          <select
            value={form.crawlType}
            onChange={e => set('crawlType', e.target.value)}
            style={inputStyle}
          >
            <option value="http">http</option>
            <option value="html">html</option>
            <option value="api">api</option>
          </select>
        </div>
        <div style={fieldStyle}>
          <label style={labelStyle}>Frequency (min)</label>
          <input
            type="number"
            value={form.frequencyMin}
            min={1}
            onChange={e => set('frequencyMin', parseInt(e.target.value, 10) || 5)}
            style={inputStyle}
          />
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          type="submit"
          disabled={isPending}
          style={{
            padding: '8px 18px',
            background: 'var(--gold)',
            border: 0,
            borderRadius: 6,
            cursor: isPending ? 'not-allowed' : 'pointer',
            font: '700 10px/1 var(--font-mono)',
            color: '#000',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            opacity: isPending ? 0.6 : 1,
          }}
        >
          {isPending ? 'Saving…' : mode === 'create' ? 'Create' : 'Save'}
        </button>
        <button
          type="button"
          onClick={onClose}
          style={{
            padding: '8px 14px',
            background: 'transparent',
            border: '1px solid var(--line)',
            borderRadius: 6,
            cursor: 'pointer',
            font: '700 10px/1 var(--font-mono)',
            color: 'var(--mute)',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

// ─── Data Sources Page ────────────────────────────────────────────────────────

export default function AdminDataSourcesPage() {
  const { data: sources, isLoading, isError } = useAdminDataSources();
  const { mutate: disable, isPending: isDisabling } = useDisableDataSource();
  const { mutate: enable, isPending: isEnabling } = useEnableDataSource();

  const [formMode, setFormMode] = useState<'none' | 'create' | 'edit'>('none');
  const [editTarget, setEditTarget] = useState<DataSourceAdminDto | null>(null);

  function openCreate() {
    setEditTarget(null);
    setFormMode('create');
  }

  function openEdit(ds: DataSourceAdminDto) {
    setEditTarget(ds);
    setFormMode('edit');
  }

  function closeForm() {
    setFormMode('none');
    setEditTarget(null);
  }

  return (
    <div style={{ padding: '32px 36px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{
            font: '800 28px/1 var(--font-display)',
            margin: '0 0 6px',
            letterSpacing: '-0.02em',
          }}>
            Data Sources
          </h1>
          <div style={{ font: '500 12px/1 var(--font-mono)', color: 'var(--mute)' }}>
            Manage crawl sources for all gold brands
          </div>
        </div>
        <button
          onClick={openCreate}
          style={{
            padding: '9px 18px',
            background: formMode === 'create' ? 'rgba(212,175,55,0.15)' : 'var(--gold)',
            border: formMode === 'create' ? '1px solid var(--gold)' : '0',
            borderRadius: 8,
            cursor: 'pointer',
            font: '700 11px/1 var(--font-mono)',
            color: formMode === 'create' ? 'var(--gold)' : '#000',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}
        >
          + New Source
        </button>
      </div>

      {/* Inline form */}
      {formMode === 'create' && (
        <SourceForm mode="create" onClose={closeForm} />
      )}
      {formMode === 'edit' && editTarget && (
        <SourceForm
          mode="edit"
          initial={{
            id: editTarget.id,
            name: editTarget.name,
            brand: editTarget.brand,
            url: editTarget.url,
            crawlType: editTarget.crawlType,
            frequencyMin: editTarget.frequencyMin,
          }}
          onClose={closeForm}
        />
      )}

      {/* Table card */}
      <div style={{
        background: 'var(--ink-2)',
        border: '1px solid var(--line)',
        borderRadius: 12,
        overflow: 'hidden',
      }}>
        {isLoading && (
          <div style={{ padding: '24px', font: '500 13px/1 var(--font-mono)', color: 'var(--mute)' }}>
            Loading…
          </div>
        )}

        {isError && (
          <div style={{ padding: '24px', font: '500 13px/1 var(--font-mono)', color: 'var(--down)' }}>
            Failed to load data sources.
          </div>
        )}

        {!isLoading && !isError && (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--ink-3)' }}>
                {['Name', 'Brand', 'URL', 'Crawl Type', 'Freq (min)', 'Status', 'Last Crawled', 'Actions'].map(col => (
                  <th key={col} style={{
                    textAlign: 'left',
                    padding: '10px 16px',
                    font: '700 10px/1 var(--font-mono)',
                    color: 'var(--mute)',
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                    whiteSpace: 'nowrap',
                  }}>
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(sources ?? []).length === 0 ? (
                <tr>
                  <td colSpan={8} style={{
                    padding: '24px 16px',
                    font: '500 13px/1 var(--font-mono)',
                    color: 'var(--mute)',
                    textAlign: 'center',
                  }}>
                    No data sources found.
                  </td>
                </tr>
              ) : (sources ?? []).map(ds => (
                <tr key={ds.id} style={{ borderTop: '1px solid var(--hairline)' }}>
                  <td style={{ padding: '14px 16px', font: '600 13px/1 var(--font-display)' }}>
                    {ds.name}
                  </td>
                  <td style={{ padding: '14px 16px', font: '700 11px/1 var(--font-mono)', color: 'var(--gold)', letterSpacing: '0.06em' }}>
                    {ds.brand}
                  </td>
                  <td style={{ padding: '14px 16px', maxWidth: 200 }}>
                    <span
                      title={ds.url}
                      style={{
                        font: '400 11px/1 var(--font-mono)',
                        color: 'var(--mute)',
                        display: 'block',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        maxWidth: 180,
                      }}
                    >
                      {ds.url}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px', font: '500 12px/1 var(--font-mono)', color: 'var(--bone)' }}>
                    {ds.crawlType}
                  </td>
                  <td style={{ padding: '14px 16px', font: '500 12px/1 var(--font-mono)', color: 'var(--mute)', textAlign: 'center' }}>
                    {ds.frequencyMin}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <EnabledBadge active={ds.isActive} />
                  </td>
                  <td style={{ padding: '14px 16px', font: '500 12px/1 var(--font-mono)', color: 'var(--mute)', whiteSpace: 'nowrap' }}>
                    {ds.lastCrawledAt
                      ? new Date(ds.lastCrawledAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })
                      : '—'}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      {/* Edit button */}
                      <button
                        onClick={() => openEdit(ds)}
                        style={{
                          padding: '6px 11px',
                          background: 'transparent',
                          border: '1px solid var(--line)',
                          borderRadius: 6,
                          cursor: 'pointer',
                          font: '700 10px/1 var(--font-mono)',
                          color: 'var(--bone)',
                          letterSpacing: '0.08em',
                          textTransform: 'uppercase',
                        }}
                      >
                        Edit
                      </button>
                      {/* Enable / Disable */}
                      {ds.isActive ? (
                        <button
                          onClick={() => disable(ds.id)}
                          disabled={isDisabling}
                          style={{
                            padding: '6px 11px',
                            background: 'transparent',
                            border: '1px solid var(--down)',
                            borderRadius: 6,
                            cursor: isDisabling ? 'not-allowed' : 'pointer',
                            font: '700 10px/1 var(--font-mono)',
                            color: 'var(--down)',
                            letterSpacing: '0.08em',
                            textTransform: 'uppercase',
                            opacity: isDisabling ? 0.5 : 1,
                          }}
                        >
                          Disable
                        </button>
                      ) : (
                        <button
                          onClick={() => enable(ds.id)}
                          disabled={isEnabling}
                          style={{
                            padding: '6px 11px',
                            background: 'transparent',
                            border: '1px solid var(--up)',
                            borderRadius: 6,
                            cursor: isEnabling ? 'not-allowed' : 'pointer',
                            font: '700 10px/1 var(--font-mono)',
                            color: 'var(--up)',
                            letterSpacing: '0.08em',
                            textTransform: 'uppercase',
                            opacity: isEnabling ? 0.5 : 1,
                          }}
                        >
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
