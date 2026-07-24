import { test, describe } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const authProviderSrc = fs.readFileSync(path.join(dirname, '../src/providers/AuthProvider.tsx'), 'utf8');

describe('AuthProvider — Issue #316 (no client-side auth bypass)', () => {
  test('does not seed a hardcoded ROLE_ADMIN user when no session exists', () => {
    assert(
      !/role:\s*['"]ROLE_ADMIN['"]/.test(authProviderSrc),
      'AuthProvider must never hardcode a ROLE_ADMIN user in its source'
    );
  });

  test('login() no longer accepts a caller-supplied role', () => {
    assert(
      !/login:\s*\(username:\s*string,\s*role:/.test(authProviderSrc),
      'login() must not take a role parameter — role must come from the backend/mock response'
    );
  });

  test('login() delegates credential validation to the auth repository', () => {
    assert(
      /authRepository\.login\(/.test(authProviderSrc),
      'login() must validate credentials through authRepository, never assign role client-side'
    );
  });
});
