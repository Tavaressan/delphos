import { test, describe } from 'node:test';
import assert from 'node:assert';
import { filterSelectableAgents, NO_ACTIVE_AGENTS_MESSAGE } from '../src/features/chat/agentFilters';
import { canReactivate, reactivateStatus } from '../src/features/catalog/agentStatus';

describe('Agent reactivation (issue #109)', () => {
  test('canReactivate is true only for INACTIVE agents', () => {
    assert.strictEqual(canReactivate('INACTIVE'), true);
    assert.strictEqual(canReactivate('PUBLISHED'), false);
    assert.strictEqual(canReactivate('IN_REVIEW'), false);
    assert.strictEqual(canReactivate(undefined), false);
  });

  test('reactivating an INACTIVE agent makes it selectable in chat', () => {
    const agents = [
      { id: 'agent-1', name: 'Agente Inativo', status: 'INACTIVE' },
    ];

    // Antes de reativar, o agente é filtrado do seletor do chat.
    assert.strictEqual(filterSelectableAgents(agents).length, 0);

    // Reativa o agente (simulando a resposta do endpoint /publish).
    const reactivated = agents.map(a => ({ ...a, status: reactivateStatus() }));

    assert.strictEqual(reactivated[0].status, 'PUBLISHED');
    assert.strictEqual(filterSelectableAgents(reactivated).length, 1);
  });

  test('when there are no selectable agents, an explicit message is available (not a silent empty state)', () => {
    const agents = [
      { id: 'agent-1', name: 'Agente Inativo', status: 'INACTIVE' },
    ];
    const selectable = filterSelectableAgents(agents);

    assert.strictEqual(selectable.length, 0);
    assert.ok(typeof NO_ACTIVE_AGENTS_MESSAGE === 'string' && NO_ACTIVE_AGENTS_MESSAGE.length > 0);
  });
});
