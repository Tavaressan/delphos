import { test, describe } from 'node:test';
import assert from 'node:assert';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ToolCallRenderer } from '../src/features/chat/tool-renderers/ToolCallRenderer';
import type { ToolCallPayload } from '../src/features/chat/tool-renderers/types';

describe('ToolCallRenderer (issue #138 — tool-renderers ricos no chat)', () => {
  test('renders BashRenderer for a shell command tool-call', () => {
    const toolCall: ToolCallPayload = {
      toolName: 'bash',
      input: { command: 'ls -la' },
      output: 'total 0\ndrwxr-xr-x  2 user  staff  64 Jan  1 00:00 .',
      status: 'COMPLETED',
    };

    const html = renderToStaticMarkup(React.createElement(ToolCallRenderer, { toolCall }));

    assert.match(html, /data-testid="tool-renderer-bash"/);
    assert.ok(html.includes('ls -la'));
    assert.ok(html.includes('total 0'));
  });

  test('renders EditRenderer with a diff for an edit tool-call', () => {
    const toolCall: ToolCallPayload = {
      toolName: 'edit',
      input: {
        filePath: 'src/foo.ts',
        oldString: 'const a = 1;',
        newString: 'const a = 2;',
      },
      status: 'COMPLETED',
    };

    const html = renderToStaticMarkup(React.createElement(ToolCallRenderer, { toolCall }));

    assert.match(html, /data-testid="tool-renderer-edit"/);
    assert.ok(html.includes('src/foo.ts'));
    assert.ok(html.includes('const a = 1;'));
    assert.ok(html.includes('const a = 2;'));
  });

  test('renders ReadRenderer for a file read tool-call', () => {
    const toolCall: ToolCallPayload = {
      toolName: 'read',
      input: { filePath: 'README.md' },
      status: 'COMPLETED',
    };

    const html = renderToStaticMarkup(React.createElement(ToolCallRenderer, { toolCall }));

    assert.match(html, /data-testid="tool-renderer-read"/);
    assert.ok(html.includes('README.md'));
  });

  test('renders WriteRenderer for a file write tool-call', () => {
    const toolCall: ToolCallPayload = {
      toolName: 'write',
      input: { filePath: 'notes.txt', content: 'hello world' },
      status: 'COMPLETED',
    };

    const html = renderToStaticMarkup(React.createElement(ToolCallRenderer, { toolCall }));

    assert.match(html, /data-testid="tool-renderer-write"/);
    assert.ok(html.includes('notes.txt'));
  });

  test('renders SearchRenderer for glob/grep tool-calls', () => {
    const globCall: ToolCallPayload = {
      toolName: 'glob',
      input: { pattern: '**/*.tsx' },
      status: 'COMPLETED',
    };
    const grepCall: ToolCallPayload = {
      toolName: 'grep',
      input: { pattern: 'TODO' },
      status: 'COMPLETED',
    };

    const globHtml = renderToStaticMarkup(React.createElement(ToolCallRenderer, { toolCall: globCall }));
    const grepHtml = renderToStaticMarkup(React.createElement(ToolCallRenderer, { toolCall: grepCall }));

    assert.match(globHtml, /data-testid="tool-renderer-search"/);
    assert.ok(globHtml.includes('**/*.tsx'));
    assert.match(grepHtml, /data-testid="tool-renderer-search"/);
    assert.ok(grepHtml.includes('TODO'));
  });

  test('falls back to GenericToolRenderer for an unknown tool type', () => {
    const toolCall: ToolCallPayload = {
      toolName: 'custom_unknown_tool',
      input: { foo: 'bar' },
      status: 'COMPLETED',
    };

    const html = renderToStaticMarkup(React.createElement(ToolCallRenderer, { toolCall }));

    assert.match(html, /data-testid="tool-renderer-generic"/);
    assert.ok(html.includes('custom_unknown_tool'));
    assert.ok(html.includes('bar'));
  });
});
