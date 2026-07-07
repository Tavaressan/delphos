import { test, describe } from 'node:test';
import assert from 'node:assert';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ConfirmCard } from '../src/features/chat/hitl/ConfirmCard';
import type { SensitiveAction } from '../src/features/chat/hitl/types';

// Como este projeto ainda não tem @testing-library/react, simulamos o clique
// buscando o handler `onClick` diretamente na árvore de elementos React
// retornada pelo componente (sem DOM real) e invocando-o — equivalente, em
// termos de comportamento, a um clique do usuário no botão correspondente.
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

const action: SensitiveAction = {
  id: 'act-1',
  agentId: 'agent-1',
  agentName: 'Agente Financeiro',
  actionLabel: 'Enviar e-mail para o cliente',
  description: 'Esta ação envia uma comunicação externa em nome da empresa.',
};

describe('ConfirmCard (issue #137 — HITL)', () => {
  test('renders a blocking confirmation card with approve and reject actions', () => {
    const html = renderToStaticMarkup(
      React.createElement(ConfirmCard, { action, onApprove: () => {}, onReject: () => {} })
    );

    assert.match(html, /Agente Financeiro/);
    assert.match(html, /Enviar e-mail para o cliente/);
    assert.match(html, /aria-label="Aprovar ação"/);
    assert.match(html, /aria-label="Rejeitar ação"/);
  });

  test('simulating approval calls onApprove and not onReject', () => {
    let approved = false;
    let rejected = false;

    const element = ConfirmCard({
      action,
      onApprove: () => { approved = true; },
      onReject: () => { rejected = true; },
    }) as any;

    const approveProps = findByProp<{ onClick: () => void; 'aria-label': string }>(
      element,
      (props: any) => props['aria-label'] === 'Aprovar ação'
    );
    assert.ok(approveProps, 'approve button not found');
    approveProps!.onClick();

    assert.strictEqual(approved, true);
    assert.strictEqual(rejected, false);
  });

  test('simulating rejection calls onReject and not onApprove', () => {
    let approved = false;
    let rejected = false;

    const element = ConfirmCard({
      action,
      onApprove: () => { approved = true; },
      onReject: () => { rejected = true; },
    }) as any;

    const rejectProps = findByProp<{ onClick: () => void; 'aria-label': string }>(
      element,
      (props: any) => props['aria-label'] === 'Rejeitar ação'
    );
    assert.ok(rejectProps, 'reject button not found');
    rejectProps!.onClick();

    assert.strictEqual(rejected, true);
    assert.strictEqual(approved, false);
  });
});
