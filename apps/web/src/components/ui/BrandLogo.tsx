const BRAND_LOGO: Record<string, string> = {
  SJC: '/brands/sjc.svg',
  DOJI: '/brands/doji.svg',
  PNJ: '/brands/pnj.svg',
  BAO_TIN: '/brands/bao-tin.svg',
};

interface BrandLogoProps {
  brand: string;
  size?: number;
  className?: string;
}

export function BrandLogo({ brand, size = 36, className }: BrandLogoProps) {
  const src = BRAND_LOGO[brand];
  if (!src) {
    return (
      <div
        className={`rounded-md bg-ink-3 border border-line flex items-center justify-center font-mono font-extrabold text-gold tracking-[0.06em]${className ? ` ${className}` : ''}`}
        style={{ width: size, height: size, fontSize: Math.round(size * 0.3) }}
      >
        {brand.slice(0, 2)}
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={brand}
      width={size}
      height={size}
      className={`rounded-md shrink-0${className ? ` ${className}` : ''}`}
    />
  );
}
