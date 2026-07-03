import { test, describe } from 'node:test';
import assert from 'node:assert';
import { userAdapter } from '../src/infrastructure/adapters/userAdapter';
import { GetMeResponse } from '../src/domain/dto';

describe('User Adapter Tests', () => {
  test('should map GetMeResponse to UserProfile entity correctly', () => {
    const dto: GetMeResponse = {
      id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      username: 'vtavares',
      email: 'vtavares@alfabra.com',
      firstName: 'Vitor',
      lastName: 'Tavares',
      jobTitle: 'Engenheiro de Software',
      avatarUrl: 'http://minio/avatars/a11.png',
      status: 'ACTIVE',
      tenantId: '00000000-0000-0000-0000-000000000000',
      createdAt: '2026-01-01T10:00:00Z',
      lastLogin: '2026-07-01T09:00:00Z',
      roles: ['ROLE_ADMIN'],
    };

    const entity = userAdapter.toEntity(dto);

    assert.strictEqual(entity.id, dto.id);
    assert.strictEqual(entity.username, dto.username);
    assert.strictEqual(entity.email, dto.email);
    assert.strictEqual(entity.firstName, dto.firstName);
    assert.strictEqual(entity.lastName, dto.lastName);
    assert.strictEqual(entity.jobTitle, dto.jobTitle);
    assert.strictEqual(entity.avatarUrl, dto.avatarUrl);
    assert.strictEqual(entity.tenantId, dto.tenantId);
    assert.strictEqual(entity.createdAt, dto.createdAt);
    assert.strictEqual(entity.lastLogin, dto.lastLogin);
    assert.deepStrictEqual(entity.roles, dto.roles);
  });

  test('should handle null optional fields gracefully', () => {
    const dto: GetMeResponse = {
      id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      username: 'vtavares',
      email: 'vtavares@alfabra.com',
      firstName: null,
      lastName: null,
      jobTitle: null,
      avatarUrl: null,
      status: 'ACTIVE',
      tenantId: '00000000-0000-0000-0000-000000000000',
      createdAt: null,
      lastLogin: null,
      roles: [],
    };

    const entity = userAdapter.toEntity(dto);

    assert.strictEqual(entity.firstName, null);
    assert.strictEqual(entity.avatarUrl, null);
    assert.deepStrictEqual(entity.roles, []);
  });
});
