import { describe, expect, test } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const source = readFileSync(
  join(process.cwd(), 'src/components/dashboard/MarketsPage.tsx'),
  'utf8',
);

describe('MarketsPage assets', () => {
  test('includes BAO_TIN as a selectable main chart asset', () => {
    expect(source).toContain("const ASSETS = ['SJC', 'DOJI', 'PNJ', 'BAO_TIN'] as const");
    expect(source).toContain("'BAO_TIN': { brand: 'BAO_TIN', goldType: 'NHAN_9999' }");
  });
});
