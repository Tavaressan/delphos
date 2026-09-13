import { test, describe } from 'node:test';
import assert from 'node:assert';
import { authRepository, InvalidCredentialsError } from '../src/infrastructure/repositories/AuthRepository';

describe('AuthRepository — Issue #316 (real credential validation)', () => {
  test('resolves with the authenticated user (role from backend/mock) for valid credentials', async () => {
    const user = await authRepository.login('vitor.tavares', 'secretpassword');

    assert.strictEqual(user.username, 'vitor.tavares');
    assert.strictEqual(user.role, 'ROLE_ADMIN');
  });

  test('rejects with InvalidCredentialsError for a wrong password', async () => {
    await assert.rejects(
      () => authRepository.login('vitor.tavares', 'wrong-password'),
      InvalidCredentialsError
    );
  });

  test('rejects with InvalidCredentialsError for an unknown username', async () => {
    await assert.rejects(
      () => authRepository.login('nao-existe', 'qualquer-coisa'),
      InvalidCredentialsError
    );
  });

  test('resolves a non-admin account with ROLE_USER — role is never client-controlled', async () => {
    const user = await authRepository.login('demo.user', 'demo1234');
    assert.strictEqual(user.role, 'ROLE_USER');
  });
});
