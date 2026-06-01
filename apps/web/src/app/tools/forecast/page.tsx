'use client';

import { useLeaderboard } from '@/lib/forecast.api';
import type { LeaderboardEntryDto } from '@gpls/shared';
import { cn } from '@/lib/utils';

function ForecastScatter({ entries }: { entries: LeaderboardEntryDto[] }) {
  if (!entries || entries.length === 0) return (
    <div className="text-center text-mute font-mono text-[12px] py-8">Chưa có dữ liệu dự báo tháng này</div>
  );

  const W = 500, H = 300;
  const PAD = { l: 48, r: 20, t: 20, b: 40 };
  const IW = W - PAD.l - PAD.r, IH = H - PAD.t - PAD.b;

  const maxPoints = Math.max(...entries.map(e => e.totalPoints), 1);
  // Use correctCount/totalPoints as accuracy proxy; if no totalPoints use 0
  const toAccuracy = (e: LeaderboardEntryDto) =>
    e.totalPoints > 0 ? Math.min(100, (e.correctCount / e.totalPoints) * 100) : 0;

  const xFor = (pts: number) => PAD.l + (pts / maxPoints) * IW;
  const yFor = (acc: number) => PAD.t + IH - (acc / 100) * IH;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block w-full h-auto">
      {/* Grid lines */}
      {[25, 50, 75, 100].map(pct => (
        <g key={pct}>
          <line x1={PAD.l} x2={W - PAD.r} y1={yFor(pct)} y2={yFor(pct)} stroke="rgba(128,128,148,0.15)" strokeWidth="0.75" strokeDasharray="3 3"/>
          <text x={PAD.l - 5} y={yFor(pct) + 4} textAnchor="end" fill="var(--mute)" fontSize={9} fontFamily="var(--font-mono)">{pct}%</text>
        </g>
      ))}

      {/* 50% accuracy reference line */}
      <line x1={PAD.l} x2={W - PAD.r} y1={yFor(50)} y2={yFor(50)} stroke="rgba(212,175,55,0.3)" strokeWidth="1" strokeDasharray="5 3"/>
      <text x={W - PAD.r + 3} y={yFor(50) + 4} fill="rgba(212,175,55,0.6)" fontSize={8} fontFamily="var(--font-mono)">50%</text>

      {/* Axis labels */}
      <text x={W / 2} y={H - 4} textAnchor="middle" fill="var(--mute)" fontSize={9} fontFamily="var(--font-mono)">Điểm tích lũy</text>
      <text x={12} y={H / 2} textAnchor="middle" fill="var(--mute)" fontSize={9} fontFamily="var(--font-mono)" transform={`rotate(-90, 12, ${H / 2})`}>Độ chính xác</text>

      {/* Dots */}
      {entries.map((e, i) => {
        const cx = xFor(e.totalPoints);
        const acc = toAccuracy(e);
        const cy = yFor(acc);
        const isAbove = acc >= 50;
        const color = isAbove ? '#58C896' : '#E5484D';
        const r = Math.max(4, Math.min(10, 4 + (e.totalPoints / maxPoints) * 6));
        return (
          <g key={i}>
            <circle cx={cx} cy={cy} r={r} fill={color} opacity="0.7" stroke={color} strokeWidth="1"/>
            {entries.length <= 20 && (
              <text x={cx} y={cy - r - 3} textAnchor="middle" fill="var(--bone)" fontSize={8} fontFamily="var(--font-mono)">
                {(e.displayName ?? 'Ẩn danh').slice(0, 8)}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

const TH = 'font-mono text-[9px] leading-none font-bold tracking-[0.14em] uppercase text-mute pb-[14px] px-3 border-b border-line text-left';
const TD = 'px-3 py-[12px] border-b border-[rgba(255,255,255,0.04)]';

export default function ForecastLeaderboardPage() {
  const month = currentMonth();
  const { data, isLoading } = useLeaderboard(month);

  return (
    <div className="min-h-full bg-[#0a0a0d] text-chalk p-[32px_24px_60px]">
      <div className="max-w-[800px] mx-auto">

        <div className="mb-8">
          <h1 className="font-display text-[36px] leading-none font-extrabold tracking-[-0.03em] m-0 uppercase">
            bảng xếp hạng dự báo
          </h1>
          <p className="font-display text-[13px] leading-[1.5] text-mute m-0 mt-2">
            Tháng {month} · Xếp hạng theo điểm tích lũy
          </p>
        </div>

        {/* Scatter Plot */}
        <div className="bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.06)] rounded-xl p-[20px_24px] mb-7">
          <div className="font-mono text-[9px] leading-none font-bold tracking-[0.18em] uppercase text-mute mb-4">
            phân tán độ chính xác × điểm
          </div>
          {isLoading ? (
            <div className="animate-pulse bg-[rgba(255,255,255,0.05)] rounded-lg" style={{ height: 200 }}/>
          ) : (
            <ForecastScatter entries={data?.entries ?? []} />
          )}
          <div className="flex items-center gap-5 mt-3">
            <div className="flex items-center gap-2">
              <span className="w-[8px] h-[8px] rounded-full inline-block bg-[#58C896]"/>
              <span className="font-mono text-[10px] text-mute">≥ 50% chính xác</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-[8px] h-[8px] rounded-full inline-block bg-[#E5484D]"/>
              <span className="font-mono text-[10px] text-mute">{'<'} 50% chính xác</span>
            </div>
          </div>
        </div>

        {/* Leaderboard table */}
        <div className="bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.06)] rounded-xl p-[20px_24px] overflow-x-auto">
          <div className="font-mono text-[9px] leading-none font-bold tracking-[0.18em] uppercase text-mute mb-4">
            bảng xếp hạng
          </div>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="animate-pulse bg-[rgba(255,255,255,0.05)] rounded h-[40px]"/>
              ))}
            </div>
          ) : !data?.entries.length ? (
            <div className="text-center text-mute font-mono text-[12px] py-8">
              Chưa có người tham gia dự báo tháng này
            </div>
          ) : (
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className={TH}>Hạng</th>
                  <th className={TH}>Người dùng</th>
                  <th className={cn(TH, 'text-right')}>Đúng</th>
                  <th className={cn(TH, 'text-right')}>Streak</th>
                  <th className={cn(TH, 'text-right')}>Điểm</th>
                </tr>
              </thead>
              <tbody>
                {data.entries.map((e) => {
                  const acc = e.totalPoints > 0 ? ((e.correctCount / e.totalPoints) * 100).toFixed(1) : '—';
                  const isTop = e.rank <= 3;
                  return (
                    <tr key={e.userId}>
                      <td className={TD}>
                        <span className={cn(
                          'font-mono text-[13px] font-bold tabular-nums',
                          e.rank === 1 ? 'text-[#D4AF37]' : e.rank === 2 ? 'text-[#C0C0C0]' : e.rank === 3 ? 'text-[#CD7F32]' : 'text-mute',
                        )}>
                          {e.rank === 1 ? '🥇' : e.rank === 2 ? '🥈' : e.rank === 3 ? '🥉' : `#${e.rank}`}
                        </span>
                      </td>
                      <td className={TD}>
                        <span className={cn('font-display text-[13px] leading-none font-semibold', isTop ? 'text-chalk' : 'text-bone')}>
                          {e.displayName ?? 'Ẩn danh'}
                        </span>
                      </td>
                      <td className={cn(TD, 'text-right font-mono text-[12px] tabular-nums text-mute')}>
                        {e.correctCount}/{e.totalPoints} <span className="text-[10px]">({acc}%)</span>
                      </td>
                      <td className={cn(TD, 'text-right font-mono text-[12px] tabular-nums')}>
                        {e.streak > 0 ? (
                          <span className="text-[#D4AF37]">{e.streak} 🔥</span>
                        ) : (
                          <span className="text-mute">{e.streak}</span>
                        )}
                      </td>
                      <td className={cn(TD, 'text-right font-mono text-[14px] font-bold tabular-nums text-chalk')}>
                        {e.totalPoints}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

      </div>
    </div>
  );
}
