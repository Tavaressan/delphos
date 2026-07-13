import { test, describe } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(dirname, '../../.env');

describe('Environment variables smoke test', () => {
  // O .env não existe no CI; sem ele não há o que verificar (comportamento
  // preservado do runner anterior, que apenas logava e seguia).
  test('NEXT_PUBLIC_BACKEND_URL is defined with an http(s) value', { skip: !fs.existsSync(envPath) }, () => {
    const envContent = fs.readFileSync(envPath, 'utf8');
    assert(envContent.includes('NEXT_PUBLIC_BACKEND_URL='), 'NEXT_PUBLIC_BACKEND_URL should be defined in .env');

    const backendUrlMatch = envContent.match(/NEXT_PUBLIC_BACKEND_URL=(.+)/);
    assert(backendUrlMatch, 'NEXT_PUBLIC_BACKEND_URL should have a value');

    const backendUrl = backendUrlMatch[1].trim();
    assert(
      backendUrl.startsWith('http://') || backendUrl.startsWith('https://'),
      'NEXT_PUBLIC_BACKEND_URL should start with http:// or https://',
    );
  });
});
