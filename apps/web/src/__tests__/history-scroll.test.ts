import { describe, expect, test } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

function readSource(path: string) {
  return readFileSync(join(process.cwd(), path), 'utf8');
}

describe('history page scrolling', () => {
  test('browsing history owns a vertical scroll container', () => {
    const source = readSource('src/app/profile/history/page.tsx');

    expect(source).toContain('h-screen overflow-y-auto');
  });

  test('portfolio transaction history scrolls within its panel', () => {
    const source = readSource('src/app/portfolio/page.tsx');

    expect(source).toContain('max-h-[420px] overflow-auto');
  });
});
