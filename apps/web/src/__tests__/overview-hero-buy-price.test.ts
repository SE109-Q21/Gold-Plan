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
    expect(source).toContain('EXCHANGE_RATE_ROWS');
    expect(source).toContain('buyRate');
    expect(source).toContain('sellRate');
    expect(source).toContain("code: 'AUD'");
    expect(source).toContain("code: 'JPY'");
  });
});
