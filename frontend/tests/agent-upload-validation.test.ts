import { test, describe } from 'node:test';
import assert from 'node:assert';
import { validateAgentZipFileName } from '../src/features/admin/agentUploadValidation';

// Reproduz o item 5 da issue #110: a UI deve deixar explícito que o formato exigido é um .zip
// contendo um .md na raiz, em vez de rejeitar arquivos silenciosamente ou com mensagem vaga.
describe('validateAgentZipFileName', () => {
  test('accepts a .zip file name', () => {
    assert.strictEqual(validateAgentZipFileName('agente.zip'), null);
  });

  test('rejects a .md file name with a clear explanation of the required format', () => {
    const error = validateAgentZipFileName('instrucoes.md');
    assert.ok(error);
    assert.match(error, /\.zip/);
    assert.match(error, /\.md/);
  });

  test('rejects any non-.zip file name with a clear explanation', () => {
    const error = validateAgentZipFileName('documento.pdf');
    assert.ok(error);
    assert.match(error, /\.zip/);
  });
});
