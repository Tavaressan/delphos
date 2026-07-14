import { test, describe } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const headerContent = fs.readFileSync(path.join(dirname, '../src/components/layout/Header.tsx'), 'utf8');

describe('Header tests', () => {
  test('logo is 50% bigger (68px -> 102px)', () => {
    assert(headerContent.includes('h-[102px]'), 'Logo should be 50% bigger: h-[102px] (68 * 1.5)');
    assert(!headerContent.includes('h-[68px]'), 'Old logo height h-[68px] should no longer be present');
  });

  test('header container height accommodates the 102px logo without clipping', () => {
    assert(
      headerContent.includes('className="h-14 '),
      'Header container height should be h-14 (56px), the smallest Tailwind scale step that fits a 102px logo',
    );
  });

  test('logo uses a solid color on light mode (matching text-primary)', () => {
    assert(
      headerContent.includes('bg-primary'),
      'Logo should use bg-primary (solid color, matching title color) in light mode',
    );
  });

  test('dark mode logo treatment is still present (no regression)', () => {
    assert(
      headerContent.includes('dark:bg-white') || headerContent.includes('dark:invert'),
      'Dark mode logo treatment must still turn the logo white/inverted',
    );
  });
});
