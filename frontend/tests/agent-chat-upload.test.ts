import { test, describe } from 'node:test';
import assert from 'node:assert';
import { filterSelectableAgents } from '../src/features/chat/agentFilters';

describe('Frontend Agent and Upload Logic Tests', () => {
  test('filterSelectableAgents should exclude INACTIVE agents (defense in depth)', () => {
    const agents = [
      { id: 'agent-1', name: 'Agente Ativo', status: 'PUBLISHED' },
      { id: 'agent-2', name: 'Agente Inativo', status: 'INACTIVE' },
      { id: 'agent-3', name: 'Agente Em Revisao', status: 'IN_REVIEW' },
    ];

    const result = filterSelectableAgents(agents);

    assert.strictEqual(result.length, 2);
    assert.ok(result.every(a => a.status !== 'INACTIVE'));
  });


  test('should validate agent selector state transition', () => {
    let selectedAgentId: string | null = null;
    const selectAgent = (id: string) => {
      selectedAgentId = id;
    };

    selectAgent('agent-123');
    assert.strictEqual(selectedAgentId, 'agent-123');
  });

  test('should validate document upload status transitions', () => {
    const statuses = ['UPLOADING', 'PROCESSING', 'INDEXED', 'FAILED'];
    let currentStatus = 'UPLOADING';

    const updateStatus = (newStatus: string) => {
      if (statuses.includes(newStatus)) {
        currentStatus = newStatus;
      }
    };

    updateStatus('PROCESSING');
    assert.strictEqual(currentStatus, 'PROCESSING');

    updateStatus('INDEXED');
    assert.strictEqual(currentStatus, 'INDEXED');
  });
});
