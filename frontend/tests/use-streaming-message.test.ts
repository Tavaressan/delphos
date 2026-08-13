import { test, describe } from 'node:test';
import assert from 'node:assert';
import { applyStreamChunk, parseSseDataLine, isStreamingEnabled } from '../src/hooks/useStreamingMessage';

describe('useStreamingMessage streaming assembly (issue #142 — streaming real de mensagens)', () => {
  test('applyStreamChunk concatenates incoming chunks incrementally', () => {
    const chunks = ['Ol', 'á, ', 'tudo ', 'bem', '?'];

    let text = '';
    const snapshots: string[] = [];
    for (const chunk of chunks) {
      text = applyStreamChunk(text, chunk);
      snapshots.push(text);
    }

    assert.deepStrictEqual(snapshots, [
      'Ol',
      'Olá, ',
      'Olá, tudo ',
      'Olá, tudo bem',
      'Olá, tudo bem?',
    ]);
    assert.strictEqual(text, 'Olá, tudo bem?');
  });

  test('applyStreamChunk is a no-op for empty chunks', () => {
    assert.strictEqual(applyStreamChunk('abc', ''), 'abc');
  });

  test('parseSseDataLine extracts the token payload from a raw "data: ..." SSE line', () => {
    assert.strictEqual(parseSseDataLine('data: hello'), 'hello');
    assert.strictEqual(parseSseDataLine('data:hello'), 'hello');
  });

  test('parseSseDataLine returns null for non-data lines (e.g. SSE comments/event names)', () => {
    assert.strictEqual(parseSseDataLine(':heartbeat'), null);
    assert.strictEqual(parseSseDataLine('event: done'), null);
    assert.strictEqual(parseSseDataLine(''), null);
  });

  test('streaming is disabled until the backend exposes GET /api/executions/{id}/stream (issue #276)', () => {
    // ExecutionController (java-core) ainda não expõe endpoint de streaming
    // (issue #276) — start() não deve abrir uma conexão fadada a 404.
    assert.strictEqual(isStreamingEnabled(), false);
  });

  test('simulated SSE stream of chunks assembles the full message incrementally, in order', () => {
    const rawEvents = ['data: The quick', 'data:  brown fox', 'data:  jumps.'];

    let assembled = '';
    const progress: string[] = [];

    for (const raw of rawEvents) {
      const token = parseSseDataLine(raw);
      if (token !== null) {
        assembled = applyStreamChunk(assembled, token);
        progress.push(assembled);
      }
    }

    assert.deepStrictEqual(progress, [
      'The quick',
      'The quick brown fox',
      'The quick brown fox jumps.',
    ]);
  });
});
