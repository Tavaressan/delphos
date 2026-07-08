import { test, describe } from 'node:test';
import assert from 'node:assert';
import { addMcpConfig, removeMcpConfig, validateMcpConfigInput } from '../src/features/agents/mcpConfig';
import { addSkill, removeSkill, validateSkillInput } from '../src/features/agents/skills';

describe('MCP config panel — state functions (issue #136)', () => {
  test('addMcpConfig appends a new config with a generated id', () => {
    const result = addMcpConfig([], { name: 'GitHub MCP', command: 'npx -y @modelcontextprotocol/server-github', transport: 'stdio' });

    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].name, 'GitHub MCP');
    assert.ok(typeof result[0].id === 'string' && result[0].id.length > 0);
  });

  test('addMcpConfig rejects a duplicate name', () => {
    const existing = addMcpConfig([], { name: 'GitHub MCP', command: 'npx github-mcp', transport: 'stdio' });
    assert.throws(() => addMcpConfig(existing, { name: 'GitHub MCP', command: 'npx other', transport: 'stdio' }));
  });

  test('removeMcpConfig removes the config by id', () => {
    const withOne = addMcpConfig([], { name: 'GitHub MCP', command: 'npx github-mcp', transport: 'stdio' });
    const removed = removeMcpConfig(withOne, withOne[0].id);
    assert.strictEqual(removed.length, 0);
  });

  test('validateMcpConfigInput requires name and command/url', () => {
    assert.strictEqual(validateMcpConfigInput({ name: '', command: '', transport: 'stdio' }), 'O nome do servidor MCP é obrigatório.');
    assert.strictEqual(validateMcpConfigInput({ name: 'A', command: '', transport: 'stdio' }), 'Informe o comando (stdio) ou a URL (sse) do servidor MCP.');
    assert.strictEqual(validateMcpConfigInput({ name: 'A', command: 'npx a', transport: 'stdio' }), null);
  });
});

describe('Skill panel — state functions (issue #136)', () => {
  test('addSkill appends a new skill with a generated id', () => {
    const result = addSkill([], { name: 'Resumo Executivo', description: 'Gera resumos executivos de documentos.' });

    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].name, 'Resumo Executivo');
    assert.ok(typeof result[0].id === 'string' && result[0].id.length > 0);
  });

  test('addSkill rejects a duplicate name', () => {
    const existing = addSkill([], { name: 'Resumo Executivo', description: 'desc' });
    assert.throws(() => addSkill(existing, { name: 'Resumo Executivo', description: 'outra desc' }));
  });

  test('removeSkill removes the skill by id', () => {
    const withOne = addSkill([], { name: 'Resumo Executivo', description: 'desc' });
    const removed = removeSkill(withOne, withOne[0].id);
    assert.strictEqual(removed.length, 0);
  });

  test('validateSkillInput requires a name', () => {
    assert.strictEqual(validateSkillInput({ name: '', description: '' }), 'O nome da skill é obrigatório.');
    assert.strictEqual(validateSkillInput({ name: 'Resumo', description: '' }), null);
  });
});
