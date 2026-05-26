'use client';

import React, { useState } from 'react';
import { useBenchmarks, useUpsertBenchmark, useDeleteBenchmark } from '@/lib/assets-comparison.api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const INPUT_CLS = 'bg-ink-3 border-line text-chalk text-[13px] focus-visible:ring-gold h-[34px]';

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
      <h3 className="text-chalk mb-4 font-display text-[16px] font-bold">Chỉ số tài sản tham chiếu</h3>
      <p className="text-mute text-[13px] mb-5 leading-[1.5]">
        Nhập dữ liệu VN-Index (điểm) và lãi suất ngân hàng (%/năm) để hiển thị trên trang Gold vs Assets.
      </p>

      <form
        onSubmit={handleSubmit}
        className="bg-ink-2 border border-line rounded-lg p-4 mb-5 flex gap-[10px] flex-wrap items-end"
      >
        <div>
          <div className="text-mute text-[12px] mb-1">Loại</div>
          <select
            value={form.assetType}
            onChange={e => setForm(f => ({ ...f, assetType: e.target.value }))}
            className="bg-ink-3 border border-line rounded-md text-chalk text-[13px] px-[10px] py-[6px] outline-none h-[34px]"
          >
            <option value="VN_INDEX">VN-Index</option>
            <option value="BANK_DEPOSIT">Gửi ngân hàng</option>
          </select>
        </div>
        <div>
          <div className="text-mute text-[12px] mb-1">Ngày</div>
          <Input
            type="date"
            value={form.date}
            onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
            required
            className={INPUT_CLS}
          />
        </div>
        <div>
          <div className="text-mute text-[12px] mb-1">
            {form.assetType === 'VN_INDEX' ? 'Điểm chỉ số' : 'Lãi suất (%/năm)'}
          </div>
          <Input
            type="number"
            step="0.01"
            value={form.value}
            onChange={e => setForm(f => ({ ...f, value: e.target.value }))}
            required
            placeholder={form.assetType === 'VN_INDEX' ? '1250.5' : '5.5'}
            className={INPUT_CLS + ' w-[100px]'}
          />
        </div>
        <Button type="submit" disabled={upsert.isPending} className="h-[34px] px-4 font-semibold text-[13px]">
          {upsert.isPending ? 'Đang lưu...' : 'Lưu'}
        </Button>
      </form>

      {isLoading ? (
        <p className="text-mute">Đang tải...</p>
      ) : (
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr className="text-mute border-b border-line">
              <th className="p-[8px_12px] text-left">Loại</th>
              <th className="p-[8px_12px] text-left">Ngày</th>
              <th className="p-[8px_12px] text-right">Giá trị</th>
              <th className="p-[8px_12px] text-left">Ghi chú</th>
              <th className="p-[8px_12px]"/>
            </tr>
          </thead>
          <tbody>
            {(items ?? []).map(item => (
              <tr key={item.id} className="border-b border-line">
                <td className="p-[8px_12px] text-chalk">{item.assetType}</td>
                <td className="p-[8px_12px] text-chalk">{item.date.slice(0, 10)}</td>
                <td className="p-[8px_12px] text-right text-chalk">{item.value}</td>
                <td className="p-[8px_12px] text-mute">{item.note ?? '—'}</td>
                <td className="p-[8px_12px]">
                  <Button variant="outline" size="sm" onClick={() => del.mutate(item.id)} className="px-[10px] py-[3px] h-auto border-down bg-transparent text-down hover:bg-[rgba(229,72,77,0.08)] hover:text-down font-mono text-[11px] font-bold">
                    Xóa
                  </Button>
                </td>
              </tr>
            ))}
            {(items ?? []).length === 0 && (
              <tr>
                <td colSpan={5} className="p-4 text-mute text-center">Chưa có dữ liệu</td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default function AdminBenchmarksPage() {
  return (
    <div className="p-[32px_36px]">
      <div className="mb-8">
        <h1 className="font-display text-[28px] leading-none font-extrabold m-0 mb-[6px] tracking-[-0.02em]">
          Chỉ số tham chiếu
        </h1>
        <div className="font-mono text-[12px] leading-none text-mute">
          Quản lý dữ liệu VN-Index và lãi suất ngân hàng
        </div>
      </div>
      <BenchmarksSection/>
    </div>
  );
}
