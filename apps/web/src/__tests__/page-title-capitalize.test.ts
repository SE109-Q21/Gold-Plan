import { describe, expect, test } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const SOURCE_ROOTS = ['src/app', 'src/components/dashboard'];

function tsxFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      return tsxFiles(path);
    }
    return path.endsWith('.tsx') ? [path] : [];
  });
}

describe('page titles', () => {
  test('all h1 page titles render capitalized', () => {
    const missingCapitalize = SOURCE_ROOTS
      .flatMap(tsxFiles)
      .flatMap((file) => {
        const source = readFileSync(file, 'utf8');
        const headingClasses = Array.from(source.matchAll(/<h1\s+className=(?:"([^"]+)"|\{([A-Z_]+)\})/g));

        return headingClasses
          .filter((match) => {
            const literalClass = match[1];
            if (literalClass) {
              const classes = literalClass.split(/\s+/);
              return !classes.includes('capitalize') || classes.includes('uppercase');
            }

            const constantName = match[2];
            const constantMatch = source.match(new RegExp(`const\\s+${constantName}\\s*=\\s*['"\`]([^'"\`]+)['"\`]`));
            const classes = constantMatch?.[1].split(/\s+/) ?? [];
            return !classes.includes('capitalize') || classes.includes('uppercase');
          })
          .map(() => file);
      });

    expect([...new Set(missingCapitalize)]).toEqual([]);
  });
});
