import { test, describe } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dirname = path.dirname(fileURLToPath(import.meta.url));

describe('Shared Layout Refactor', () => {
  const pages = [
    'catalog/page.tsx',
    'design-system/page.tsx',
    'knowledge-base/page.tsx',
    'page.tsx',
    'profile/page.tsx',
    'schedule/page.tsx',
    'settings/page.tsx'
  ];

  test('Pages should not contain duplicate Header and Sidebar imports and tags', () => {
    for (const page of pages) {
      let pagePath = path.join(dirname, '../src/app', page);
      if (!fs.existsSync(pagePath)) {
        pagePath = path.join(dirname, '../src/app/(main)', page);
      }
      
      if (!fs.existsSync(pagePath)) {
        assert.fail(`Page ${page} not found in app or app/(main)`);
      }

      const content = fs.readFileSync(pagePath, 'utf8');
      
      assert(!content.includes('<Header'), `Page ${page} should not render <Header /> directly anymore`);
      assert(!content.includes('<Sidebar'), `Page ${page} should not render <Sidebar /> directly anymore`);
    }
  });

  test('A shared layout should contain Header and Sidebar', () => {
    const layoutPath = path.join(dirname, '../src/app/(main)/layout.tsx');
    assert(fs.existsSync(layoutPath), 'Shared layout (main)/layout.tsx should exist');
    
    const content = fs.readFileSync(layoutPath, 'utf8');
    assert(content.includes('<Header'), 'Shared layout should render <Header />');
    assert(content.includes('<Sidebar'), 'Shared layout should render <Sidebar />');
  });
});
