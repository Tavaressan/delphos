import { test, describe } from 'node:test';
import assert from 'node:assert';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { TeamSidebar } from '../src/components/team/TeamSidebar';
import type { Agent } from '../src/domain/entities';

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

const agents: Agent[] = [
  { id: 'agent-1', name: 'Agente Financeiro', version: '1.0', tag: 'stable', status: 'PUBLISHED', description: '', tenant: 't1' },
  { id: 'agent-2', name: 'Agente Jurídico', version: '1.0', tag: 'stable', status: 'PUBLISHED', description: '', tenant: 't1' },
];

describe('TeamSidebar (issue #144 — sidebar de equipe de agentes)', () => {
  test('renders the agents of the current workspace/team', () => {
    const html = renderToStaticMarkup(
      React.createElement(TeamSidebar, { agents, activeAgentId: 'agent-1', onSelectAgent: () => {} })
    );

    assert.match(html, /Agente Financeiro/);
    assert.match(html, /Agente Jurídico/);
  });

  test('shows an empty state when the team has no agents', () => {
    const html = renderToStaticMarkup(
      React.createElement(TeamSidebar, { agents: [], activeAgentId: null, onSelectAgent: () => {} })
    );
    assert.match(html, /team-sidebar-empty/);
  });

  test('marks the active agent and switches it when another agent is selected', () => {
    let activeAgentId = 'agent-1';

    const element = TeamSidebar({
      agents,
      activeAgentId,
      onSelectAgent: (id: string) => { activeAgentId = id; },
    }) as any;

    const activeItemProps = findByProp<{ onClick?: unknown; 'data-active': boolean; 'data-testid': string }>(
      element,
      (props: any) => props['data-testid'] === 'team-agent-agent-1'
    );
    assert.ok(activeItemProps, 'agent-1 item not found');
    assert.strictEqual(activeItemProps!['data-active'], true);

    const nextItemProps = findByProp<{ onClick: () => void; 'data-active': boolean }>(
      element,
      (props: any) => props['data-testid'] === 'team-agent-agent-2'
    );
    assert.ok(nextItemProps, 'agent-2 item not found');
    assert.strictEqual(nextItemProps!['data-active'], false);

    (nextItemProps as any).onClick();

    assert.strictEqual(activeAgentId, 'agent-2');
  });
});
