'use client';

import React, { useState } from 'react';
import { useBenchmarks, useUpsertBenchmark, useDeleteBenchmark } from '@/lib/assets-comparison.api';

function BenchmarksSection() {
  const { data: items, isLoading } = useBenchmarks();
  const upsert = useUpsertBenchmark();
  const del = useDeleteBenchmark();
  const [form, setForm] = useState({ assetType: 'VN_INDEX', date: '', value: '', note: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await upsert.mutateAsync({
      assetType: form.assetType,
      date: form.date,
      value: Number(form.value),
      note: form.note || undefined,
    });
    setForm(f => ({ ...f, date: '', value: '', note: '' }));
  };

  return (
    <div>
      <h3 style={{ color: 'var(--chalk)', marginBottom: 16 }}>Asset Benchmarks</h3>
      <p style={{ color: 'var(--chalk-3)', fontSize: 13, marginBottom: 20 }}>
        Nhập dữ liệu VN-Index (điểm) và lãi suất ngân hàng (%/năm) để hiển thị trên trang Gold vs Assets.
      </p>

      {/* Add form */}
      <form onSubmit={handleSubmit} style={{
        background: 'var(--ink-2)', border: '1px solid var(--line)',
        borderRadius: 8, padding: 16, marginBottom: 20,
        display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end',
      }}>
        <div>
          <div style={{ color: 'var(--chalk-3)', fontSize: 12, marginBottom: 4 }}>Loại</div>
          <select value={form.assetType} onChange={e => setForm(f => ({ ...f, assetType: e.target.value }))}
            style={{ padding: '6px 10px', borderRadius: 6, background: 'var(--ink-3, #14141A)', border: '1px solid var(--line)', color: 'var(--chalk)', fontSize: 13 }}>
            <option value="VN_INDEX">VN-Index</option>
            <option value="BANK_DEPOSIT">Gửi ngân hàng</option>
          </select>
        </div>
        <div>
          <div style={{ color: 'var(--chalk-3)', fontSize: 12, marginBottom: 4 }}>Ngày</div>
          <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
            required style={{ padding: '6px 10px', borderRadius: 6, background: 'var(--ink-3, #14141A)', border: '1px solid var(--line)', color: 'var(--chalk)', fontSize: 13 }} />
        </div>
        <div>
          <div style={{ color: 'var(--chalk-3)', fontSize: 12, marginBottom: 4 }}>
            {form.assetType === 'VN_INDEX' ? 'Điểm chỉ số' : 'Lãi suất (%/năm)'}
          </div>
          <input type="number" step="0.01" value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))}
            required placeholder={form.assetType === 'VN_INDEX' ? '1250.5' : '5.5'}
            style={{ width: 100, padding: '6px 10px', borderRadius: 6, background: 'var(--ink-3, #14141A)', border: '1px solid var(--line)', color: 'var(--chalk)', fontSize: 13 }} />
        </div>
        <button type="submit" disabled={upsert.isPending} style={{
          padding: '7px 16px', borderRadius: 6, background: 'var(--gold)', color: '#000',
          border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13,
        }}>
          {upsert.isPending ? 'Đang lưu...' : 'Lưu'}
        </button>
      </form>

      {/* Records table */}
      {isLoading ? <p style={{ color: 'var(--chalk-3)' }}>Đang tải...</p> : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ color: 'var(--chalk-3)', borderBottom: '1px solid var(--line)' }}>
              <th style={{ padding: '8px 12px', textAlign: 'left' }}>Loại</th>
              <th style={{ padding: '8px 12px', textAlign: 'left' }}>Ngày</th>
              <th style={{ padding: '8px 12px', textAlign: 'right' }}>Giá trị</th>
              <th style={{ padding: '8px 12px', textAlign: 'left' }}>Ghi chú</th>
              <th style={{ padding: '8px 12px' }}></th>
            </tr>
          </thead>
          <tbody>
            {(items ?? []).map(item => (
              <tr key={item.id} style={{ borderBottom: '1px solid var(--line)' }}>
                <td style={{ padding: '8px 12px' }}>{item.assetType}</td>
                <td style={{ padding: '8px 12px' }}>{item.date.slice(0, 10)}</td>
                <td style={{ padding: '8px 12px', textAlign: 'right' }}>{item.value}</td>
                <td style={{ padding: '8px 12px', color: 'var(--chalk-3)' }}>{item.note ?? '—'}</td>
                <td style={{ padding: '8px 12px' }}>
                  <button onClick={() => del.mutate(item.id)} style={{
                    padding: '3px 10px', borderRadius: 4, background: '#E5484D22',
                    color: '#E5484D', border: '1px solid #E5484D44', cursor: 'pointer', fontSize: 12,
                  }}>Xóa</button>
                </td>
              </tr>
            ))}
            {(items ?? []).length === 0 && (
              <tr><td colSpan={5} style={{ padding: 16, color: 'var(--chalk-3)', textAlign: 'center' }}>Chưa có dữ liệu</td></tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default function AdminBenchmarksPage() {
  return (
    <div style={{ padding: '32px 36px' }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ font: '800 28px/1 var(--font-display)', margin: '0 0 6px', letterSpacing: '-0.02em' }}>
          Benchmarks
        </h1>
        <div style={{ font: '500 12px/1 var(--font-mono)', color: 'var(--mute)' }}>
          Manage VN-Index and bank deposit rate data
        </div>
      </div>
      <BenchmarksSection />
    </div>
  );
}
