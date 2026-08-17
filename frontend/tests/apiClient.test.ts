import { test, describe } from 'node:test';
import assert from 'node:assert';
import { getBaseUrl } from '../src/infrastructure/api/apiClient';

describe('apiClient BASE_URL Configuration', () => {
  test('getBaseUrl should return provided NEXT_PUBLIC_BACKEND_URL when set', () => {
    const originalEnv = process.env.NEXT_PUBLIC_BACKEND_URL;
    process.env.NEXT_PUBLIC_BACKEND_URL = 'http://api.example.com';

    try {
      const url = getBaseUrl();
      assert.strictEqual(url, 'http://api.example.com', 'should return the provided NEXT_PUBLIC_BACKEND_URL');
    } finally {
      if (originalEnv) {
        process.env.NEXT_PUBLIC_BACKEND_URL = originalEnv;
      } else {
        delete process.env.NEXT_PUBLIC_BACKEND_URL;
      }
    }
  });

  test('getBaseUrl should fallback to localhost in development when NEXT_PUBLIC_BACKEND_URL is not set', () => {
    const originalEnv = process.env.NEXT_PUBLIC_BACKEND_URL;
    delete process.env.NEXT_PUBLIC_BACKEND_URL;

    try {
      const url = getBaseUrl();
      assert.strictEqual(url, 'http://localhost:8000', 'should fallback to localhost in development');
    } finally {
      if (originalEnv) {
        process.env.NEXT_PUBLIC_BACKEND_URL = originalEnv;
      }
    }
  });

  test('should NOT use hardcoded production URL as fallback', () => {
    const originalEnv = process.env.NEXT_PUBLIC_BACKEND_URL;
    delete process.env.NEXT_PUBLIC_BACKEND_URL;

    try {
      const url = getBaseUrl();
      assert.notStrictEqual(
        url,
        'https://rag-corporativo.duckdns.org',
        'should NOT fallback to hardcoded production URL'
      );
    } finally {
      if (originalEnv) {
        process.env.NEXT_PUBLIC_BACKEND_URL = originalEnv;
      }
    }
  });
});
