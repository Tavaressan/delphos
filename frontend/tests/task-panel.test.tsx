import { test, describe } from 'node:test';
import assert from 'node:assert';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { TaskPanel, Task } from '../src/components/panel/TaskPanel';

describe('TaskPanel (issue #139 — painel de acompanhamento de tarefas)', () => {
  test('renders the task list with names and translated status labels', () => {
    const tasks: Task[] = [
      { id: 1, name: 'REQUESTED', status: 'completed' },
      { id: 2, name: 'QUEUED', status: 'in_progress' },
      { id: 3, name: 'TOOL_RUNNING', status: 'pending' },
    ];

    const html = renderToStaticMarkup(React.createElement(TaskPanel, { tasks }));

    assert.match(html, /REQUESTED/);
    assert.match(html, /Conclu[íi]da/);
    assert.match(html, /QUEUED/);
    assert.match(html, /Em progresso/);
    assert.match(html, /TOOL_RUNNING/);
    assert.match(html, /Pendente/);
  });

  test('shows an empty state message when there are no tasks yet', () => {
    const html = renderToStaticMarkup(React.createElement(TaskPanel, { tasks: [] }));
    assert.match(html, /task-panel-empty/);
  });

  test('reflects a status update (mock progression) between renders — a task moving from pending to failed', () => {
    const initialTasks: Task[] = [{ id: 1, name: 'TOOL_RUNNING', status: 'pending' }];
    const updatedTasks: Task[] = [{ id: 1, name: 'TOOL_RUNNING', status: 'failed' }];

    const beforeHtml = renderToStaticMarkup(React.createElement(TaskPanel, { tasks: initialTasks }));
    const afterHtml = renderToStaticMarkup(React.createElement(TaskPanel, { tasks: updatedTasks }));

    assert.match(beforeHtml, /data-status="pending"/);
    assert.match(beforeHtml, /Pendente/);
    assert.doesNotMatch(beforeHtml, /Falha/);

    assert.match(afterHtml, /data-status="failed"/);
    assert.match(afterHtml, /Falha/);
    assert.doesNotMatch(afterHtml, /Pendente/);
  });
});
