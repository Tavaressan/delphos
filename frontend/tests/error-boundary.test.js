import { test, describe } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const appDir = path.join(__dirname, '..', 'src', 'app');

describe('Error Boundaries (issue #223)', () => {
  test('error.tsx should exist at app root', () => {
    const errorPath = path.join(appDir, 'error.tsx');
    assert.ok(fs.existsSync(errorPath), 'error.tsx should exist at src/app/error.tsx');

    const content = fs.readFileSync(errorPath, 'utf-8');
    assert.ok(content.includes('export default function Error'), 'error.tsx should export Error component');
    assert.ok(content.includes("'use client'"), 'error.tsx should be a client component');
    assert.ok(content.includes('AlertTriangle'), 'error.tsx should use error icon');
  });

  test('not-found.tsx should exist at app root', () => {
    const notFoundPath = path.join(appDir, 'not-found.tsx');
    assert.ok(fs.existsSync(notFoundPath), 'not-found.tsx should exist at src/app/not-found.tsx');

    const content = fs.readFileSync(notFoundPath, 'utf-8');
    assert.ok(content.includes('export default function NotFound'), 'not-found.tsx should export NotFound component');
    assert.ok(content.includes("'use client'"), 'not-found.tsx should be a client component');
    assert.ok(content.includes('Search'), 'not-found.tsx should use search icon for 404');
  });

  test('global-error.tsx should exist at app root', () => {
    const globalErrorPath = path.join(appDir, 'global-error.tsx');
    assert.ok(fs.existsSync(globalErrorPath), 'global-error.tsx should exist at src/app/global-error.tsx');

    const content = fs.readFileSync(globalErrorPath, 'utf-8');
    assert.ok(content.includes('export default function GlobalError'), 'global-error.tsx should export GlobalError component');
    assert.ok(content.includes('<html'), 'global-error.tsx should render full HTML');
    assert.ok(content.includes('<body'), 'global-error.tsx should render body tag');
  });

  test('error.tsx uses design system components', () => {
    const errorPath = path.join(appDir, 'error.tsx');
    const content = fs.readFileSync(errorPath, 'utf-8');

    assert.ok(content.includes('from'), 'should import components');
    assert.ok(content.includes('Header'), 'should use Header component');
    assert.ok(content.includes('Button'), 'should use Button component');
    assert.ok(content.includes('bg-surface'), 'should use design system surface color');
    assert.ok(content.includes('text-danger'), 'should use design system danger color');
  });

  test('not-found.tsx uses design system components', () => {
    const notFoundPath = path.join(appDir, 'not-found.tsx');
    const content = fs.readFileSync(notFoundPath, 'utf-8');

    assert.ok(content.includes('Header'), 'should use Header component');
    assert.ok(content.includes('Button'), 'should use Button component');
    assert.ok(content.includes('bg-surface'), 'should use design system surface color');
    assert.ok(content.includes('text-warning'), 'should use design system warning color');
  });

  test('error boundaries follow design system typography and colors', () => {
    const errorPath = path.join(appDir, 'error.tsx');
    const notFoundPath = path.join(appDir, 'not-found.tsx');

    const errorContent = fs.readFileSync(errorPath, 'utf-8');
    const notFoundContent = fs.readFileSync(notFoundPath, 'utf-8');

    // Check for consistent design system usage
    assert.ok(errorContent.includes('heading-font'), 'error should use heading-font');
    assert.ok(notFoundContent.includes('heading-font'), 'not-found should use heading-font');

    assert.ok(errorContent.includes('text-text-primary'), 'should use primary text color');
    assert.ok(notFoundContent.includes('text-text-primary'), 'should use primary text color');

    assert.ok(errorContent.includes('border-border-color'), 'should use border-color');
    assert.ok(notFoundContent.includes('border-border-color'), 'should use border-color');
  });
});
