import { test, describe } from 'node:test';
import assert from 'node:assert';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { PanelDock, DockPanel } from '../src/components/panel/PanelDock';

// Como este projeto ainda não tem @testing-library/react, simulamos o clique
// buscando o handler `onClick` diretamente na árvore de elementos React
// retornada pelo componente (sem DOM real) e invocando-o.
function findByProp<T extends { onClick?: unknown }>(
  node: any,
  predicate: (props: T) => boolean
): T | null {
  if (!node || typeof node !== 'object') return null;
  if (node.props && predicate(node.props)) return node.props;

  const children = node.props?.children;
  const list = Array.isArray(children) ? children : [children];
  for (const child of list) {
    const found = findByProp(child, predicate);
    if (found) return found;
  }
  return null;
}

const panels: DockPanel[] = [
  { id: 'kb', title: 'Base de Conhecimento', content: React.createElement('span', null, 'KB content') },
  { id: 'mcp', title: 'MCP & Skills', content: React.createElement('span', null, 'MCP content') },
];

describe('PanelDock (issue #146 — painel dockável para múltiplos painéis)', () => {
  test('renders two or more panels open side by side', () => {
    const html = renderToStaticMarkup(
      React.createElement(PanelDock, { panels, onClosePanel: () => {} })
    );

    assert.match(html, /panel-dock/);
    assert.match(html, /panel-kb/);
    assert.match(html, /panel-mcp/);
    assert.match(html, /Base de Conhecimento/);
    assert.match(html, /MCP &amp; Skills/);
  });

  test('renders an empty state (PanelEmpty) when there are no open panels', () => {
    const html = renderToStaticMarkup(
      React.createElement(PanelDock, { panels: [], onClosePanel: () => {} })
    );
    assert.match(html, /panel-empty/);
    assert.doesNotMatch(html, /panel-dock/);
  });

  test('closing one panel individually calls onClosePanel with only that panel id', () => {
    let closedId: string | null = null;

    const element = PanelDock({
      panels,
      onClosePanel: (id: string) => { closedId = id; },
    }) as any;

    const closeMcpProps = findByProp<{ onClick: () => void }>(
      element,
      (props: any) => props['data-testid'] === 'panel-close-mcp'
    );
    assert.ok(closeMcpProps, 'close button for mcp panel not found');
    closeMcpProps!.onClick();

    assert.strictEqual(closedId, 'mcp');
  });

  test('issue #230: usa flex-col no mobile e flex-row no desktop', () => {
    const html = renderToStaticMarkup(
      React.createElement(PanelDock, { panels, onClosePanel: () => {} })
    );

    // Parent container deve ser responsivo
    assert.match(html, /flex-col/);
    assert.match(html, /md:flex-row/);
    assert.match(html, /overflow-y-auto/);
    assert.match(html, /md:overflow-x-auto/);

    // Child deve ser responsivo, sem min-width fixo forçado no mobile
    assert.match(html, /md:min-w-\[280px\]/);
  });
});
