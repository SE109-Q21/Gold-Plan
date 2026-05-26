interface LiveBadgeProps {
  label?: string;
  /** 'badge' = nền màu (dùng trong header widget), 'inline' = chỉ dot + text */
  variant?: 'badge' | 'inline';
}

export function LiveBadge({ label = 'Trực tiếp', variant = 'badge' }: LiveBadgeProps) {
  const dot = (
    <span className="relative flex h-[6px] w-[6px] shrink-0">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#9DCC6E] opacity-60" />
      <span className="relative inline-flex rounded-full h-[6px] w-[6px] bg-[#9DCC6E]" />
    </span>
  );

  if (variant === 'inline') {
    return (
      <span className="inline-flex items-center gap-[5px] font-mono text-[10px] font-bold tracking-[0.08em] text-[#9DCC6E]">
        {dot}
        {label}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-[5px] bg-[rgba(157,204,110,0.13)] text-[#9DCC6E] px-2 py-[3px] rounded font-mono text-[10px] font-bold tracking-[0.06em]">
      {dot}
      {label}
    </span>
  );
}
