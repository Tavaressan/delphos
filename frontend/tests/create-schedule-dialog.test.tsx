import { test, describe } from 'node:test';
import assert from 'node:assert';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { CreateScheduleDialog } from '../src/features/schedule/components/CreateScheduleDialog';

const baseProps = {
  agents: [{ id: 'agent-1', name: 'Agente de Suporte' }],
  onAgentChange: () => {},
  onCronChange: () => {},
  onPromptChange: () => {},
  onSubmit: () => {},
  onClose: () => {},
};

describe('CreateScheduleDialog (issue #134 — criação de agendamento)', () => {
  test('renders nothing when closed', () => {
    const html = renderToStaticMarkup(
      React.createElement(CreateScheduleDialog, {
        ...baseProps,
        isOpen: false,
        agentId: '',
        cronExpression: '',
        prompt: '',
      })
    );
    assert.strictEqual(html, '');
  });

  test('shows a validation error for an invalid cron expression and disables submit', () => {
    const html = renderToStaticMarkup(
      React.createElement(CreateScheduleDialog, {
        ...baseProps,
        isOpen: true,
        agentId: 'agent-1',
        cronExpression: '0 25 * * *',
        prompt: 'Gerar relatório diário',
      })
    );
    assert.match(html, /data-testid="cron-error"/);
    assert.match(html, /hora/i);
    assert.match(html, /disabled=""/);
  });

  test('shows a human-readable description and enables submit for a valid cron expression', () => {
    const html = renderToStaticMarkup(
      React.createElement(CreateScheduleDialog, {
        ...baseProps,
        isOpen: true,
        agentId: 'agent-1',
        cronExpression: '0 9 * * 1',
        prompt: 'Gerar relatório diário',
      })
    );
    assert.ok(!html.includes('data-testid="cron-error"'));
    assert.match(html, /data-testid="cron-description"/);
    assert.ok(!html.includes('disabled=""'));
  });

  test('renders the list of agents as select options', () => {
    const html = renderToStaticMarkup(
      React.createElement(CreateScheduleDialog, {
        ...baseProps,
        isOpen: true,
        agentId: '',
        cronExpression: '',
        prompt: '',
      })
    );
    assert.match(html, /Agente de Suporte/);
  });
});
