import { describe, expect, test } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const source = readFileSync(
  join(process.cwd(), 'src/components/dashboard/OverviewPage.tsx'),
  'utf8',
);

describe('Overview hero price card', () => {
  test('shows a domestic buy price stat alongside international rates', () => {
    expect(source).toContain('heroBuyPrice');
    expect(source).toContain('giá mua ·');
  });

  test('renders exchange rates as a multi-currency buy and sell table', () => {
    expect(source).toContain('currencyRates');
    expect(source).toContain('buyRate');
    expect(source).toContain('sellRate');
    expect(source).not.toContain('usdRatio');
  });

  test('does not show a separate USD/VND hero stat', () => {
    expect(source).not.toContain('usd / vnd');
  });

  test('shows an archive-backed digest section with a visual image panel', () => {
    expect(source).toContain('useDigestArchive(1)');
    expect(source).toContain('Bản tin thị trường');
    expect(source).toContain('/digest/gold-bars-coins.jpg');
    expect(source).toContain('Ảnh thật vàng thỏi và đồng vàng');
  });
});
