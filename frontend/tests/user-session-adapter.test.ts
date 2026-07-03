import { test, describe } from 'node:test';
import assert from 'node:assert';
import { userSessionAdapter } from '../src/infrastructure/adapters/userSessionAdapter';
import { UserSessionResponse } from '../src/domain/dto';

describe('User Session Adapter Tests', () => {
  test('should map UserSessionResponse to UserSession entity correctly', () => {
    const dto: UserSessionResponse = {
      id: 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      userAgent: 'Mozilla/5.0',
      ipAddress: '127.0.0.1',
      createdAt: '2026-07-01T09:00:00Z',
      lastActiveAt: '2026-07-02T09:00:00Z',
    };

    const entity = userSessionAdapter.toEntity(dto);

    assert.strictEqual(entity.id, dto.id);
    assert.strictEqual(entity.userAgent, dto.userAgent);
    assert.strictEqual(entity.ipAddress, dto.ipAddress);
    assert.strictEqual(entity.createdAt, dto.createdAt);
    assert.strictEqual(entity.lastActiveAt, dto.lastActiveAt);
  });

  test('should handle null optional fields gracefully', () => {
    const dto: UserSessionResponse = {
      id: 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      userAgent: null,
      ipAddress: null,
      createdAt: null,
      lastActiveAt: null,
    };

    const entity = userSessionAdapter.toEntity(dto);

    assert.strictEqual(entity.userAgent, null);
    assert.strictEqual(entity.ipAddress, null);
  });
});
