import { test, describe } from 'node:test';
import assert from 'node:assert';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MessageContent } from '../src/features/chat/MessageContent';

describe('MessageContent (issue #130 — markdown rendering)', () => {
  test('ASSISTANT messages render markdown (bold + list + code block) as HTML, not raw syntax', () => {
    const content = [
      '**Resumo importante**',
      '',
      '- primeiro item',
      '- segundo item',
      '',
      '```js',
      'const x = 1;',
      '```',
    ].join('\n');

    const html = renderToStaticMarkup(
      React.createElement(MessageContent, { role: 'ASSISTANT', content })
    );

    // Markdown foi interpretado: tags reais, não sintaxe literal.
    assert.match(html, /<strong[^>]*>Resumo importante<\/strong>/);
    assert.match(html, /<ul[^>]*>/);
    assert.match(html, /<li[^>]*>primeiro item<\/li>/);
    assert.match(html, /<pre[^>]*>/);
    assert.match(html, /const x = 1;/);

    // A sintaxe markdown crua não deve aparecer literalmente no texto renderizado.
    assert.ok(!html.includes('**Resumo importante**'));
    assert.ok(!html.includes('- primeiro item'));
  });

  test('USER messages are rendered as plain text (markdown syntax is NOT interpreted)', () => {
    const content = '**não deveria virar negrito** e - isto não é lista';

    const html = renderToStaticMarkup(
      React.createElement(MessageContent, { role: 'USER', content })
    );

    assert.ok(!html.includes('<strong'));
    assert.ok(!html.includes('<ul'));
    assert.ok(html.includes('**não deveria virar negrito**'));
  });
});
