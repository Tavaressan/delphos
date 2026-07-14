import { test, describe } from 'node:test';
import assert from 'node:assert';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { KnowledgeSearchDrawer, SearchResultItem } from '../src/components/drawer/KnowledgeSearchDrawer';

const baseProps = {
  query: '',
  onQueryChange: () => {},
  onSearch: () => {},
  onClose: () => {},
  isLoading: false,
  error: null,
  results: [] as SearchResultItem[],
};

describe('KnowledgeSearchDrawer (issue #145 — busca semântica ad-hoc)', () => {
  test('renders nothing when closed', () => {
    const html = renderToStaticMarkup(
      React.createElement(KnowledgeSearchDrawer, { ...baseProps, isOpen: false })
    );
    assert.strictEqual(html, '');
  });

  test('renders the query input with current value when open', () => {
    const html = renderToStaticMarkup(
      React.createElement(KnowledgeSearchDrawer, { ...baseProps, isOpen: true, query: 'política de reembolso' })
    );
    assert.match(html, /data-testid="knowledge-search-input"/);
    assert.match(html, /política de reembolso/);
  });

  test('shows top-k results with similarity score from a mocked search response', () => {
    const results: SearchResultItem[] = [
      { id: '1', documentName: 'manual.pdf', excerpt: 'Trecho sobre reembolso de despesas.', score: 0.912 },
      { id: '2', documentName: 'politica.docx', excerpt: 'Regras gerais de política interna.', score: 0.734 },
    ];
    const html = renderToStaticMarkup(
      React.createElement(KnowledgeSearchDrawer, { ...baseProps, isOpen: true, query: 'reembolso', results })
    );
    assert.match(html, /manual\.pdf/);
    assert.match(html, /Trecho sobre reembolso de despesas\./);
    assert.match(html, /91\.2%/);
    assert.match(html, /politica\.docx/);
    assert.match(html, /Regras gerais de política interna\./);
  });

  test('shows an empty state message when a search returns no results', () => {
    const html = renderToStaticMarkup(
      React.createElement(KnowledgeSearchDrawer, { ...baseProps, isOpen: true, query: 'inexistente', results: [] })
    );
    assert.match(html, /data-testid="knowledge-search-empty"/);
  });

  test('shows a loading indicator while the search request is in flight', () => {
    const html = renderToStaticMarkup(
      React.createElement(KnowledgeSearchDrawer, { ...baseProps, isOpen: true, isLoading: true })
    );
    assert.match(html, /data-testid="knowledge-search-loading"/);
  });

  test('shows an error message when the search request fails', () => {
    const html = renderToStaticMarkup(
      React.createElement(KnowledgeSearchDrawer, { ...baseProps, isOpen: true, error: 'Falha ao buscar.' })
    );
    assert.match(html, /Falha ao buscar\./);
  });
});
