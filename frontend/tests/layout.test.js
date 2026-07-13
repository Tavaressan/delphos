import { test, describe } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dirname = path.dirname(fileURLToPath(import.meta.url));

describe('Frontend layout tests', () => {
  test('root layout declares lang, full height and the html tag (TT-01)', () => {
    const layoutContent = fs.readFileSync(path.join(dirname, '../src/app/layout.tsx'), 'utf8');

    assert(layoutContent.includes('lang="pt-br"'), 'Root layout should have lang="pt-br"');
    assert(layoutContent.includes('className="h-full"'), 'Root layout should have h-full className');
    assert(layoutContent.includes('<html'), 'Root layout should contain <html tag');
  });

  test('auth layout centers its content (TT-02)', () => {
    const authLayoutContent = fs.readFileSync(path.join(dirname, '../src/app/auth/layout.tsx'), 'utf8');

    assert(authLayoutContent.includes('flex'), 'Auth layout should use flex');
    assert(authLayoutContent.includes('items-center'), 'Auth layout should use items-center');
    assert(authLayoutContent.includes('justify-center'), 'Auth layout should use justify-center');
  });
});
