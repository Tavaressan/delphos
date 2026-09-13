import { test, describe } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dirname = path.dirname(fileURLToPath(import.meta.url));

describe('(main) layout guard — Issue #316', () => {
  test('redirects unauthenticated visitors to /auth/login', () => {
    const layoutSrc = fs.readFileSync(path.join(dirname, '../src/app/(main)/layout.tsx'), 'utf8');

    assert(/useAuth/.test(layoutSrc), '(main) layout must consult auth state via useAuth');
    assert(/isLogged/.test(layoutSrc), '(main) layout must check isLogged before rendering');
    assert(/\/auth\/login/.test(layoutSrc), '(main) layout must redirect to /auth/login when unauthenticated');
  });
});

describe('Login page — Issue #316 (no decorative security theater)', () => {
  test('handleLoginSubmit never calls login() with a hardcoded role', () => {
    const loginSrc = fs.readFileSync(path.join(dirname, '../src/app/auth/login/page.tsx'), 'utf8');

    assert(
      !/login\(username,\s*['"]ROLE_ADMIN['"]\)/.test(loginSrc),
      'Login page must not call login(username, "ROLE_ADMIN") unconditionally'
    );
    assert(/password/.test(loginSrc), 'Login page must still collect and use a password field');
  });

  test('hardcoded CAPTCHA literal is no longer present client-side', () => {
    const loginSrc = fs.readFileSync(path.join(dirname, '../src/app/auth/login/page.tsx'), 'utf8');

    assert(
      !/7X3P/.test(loginSrc),
      'Hardcoded CAPTCHA answer must not remain visible/checked client-side'
    );
  });
});
