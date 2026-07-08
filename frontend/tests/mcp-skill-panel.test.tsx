import { test, describe } from 'node:test';
import assert from 'node:assert';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { McpPanel } from '../src/features/agents/components/McpPanel';
import { SkillPanel } from '../src/features/agents/components/SkillPanel';
import { addMcpConfig, removeMcpConfig } from '../src/features/agents/mcpConfig';
import { addSkill, removeSkill } from '../src/features/agents/skills';

describe('McpPanel (issue #136)', () => {
  test('renders empty state and "Adicionar" action when there are no MCP configs', () => {
    const html = renderToStaticMarkup(
      React.createElement(McpPanel, { configs: [], onChange: () => {} })
    );

    assert.match(html, /Nenhum servidor MCP configurado/);
    assert.match(html, />Adicionar</);
  });

  test('renders a created MCP config, and no longer renders it after removal (via pure state functions)', () => {
    const withOne = addMcpConfig([], { name: 'GitHub MCP', command: 'npx github-mcp', transport: 'stdio' });

    const htmlWithConfig = renderToStaticMarkup(
      React.createElement(McpPanel, { configs: withOne, onChange: () => {} })
    );
    assert.match(htmlWithConfig, /GitHub MCP/);
    assert.doesNotMatch(htmlWithConfig, /Nenhum servidor MCP configurado/);

    const afterRemoval = removeMcpConfig(withOne, withOne[0].id);
    const htmlAfterRemoval = renderToStaticMarkup(
      React.createElement(McpPanel, { configs: afterRemoval, onChange: () => {} })
    );
    assert.doesNotMatch(htmlAfterRemoval, /GitHub MCP/);
    assert.match(htmlAfterRemoval, /Nenhum servidor MCP configurado/);
  });
});

describe('SkillPanel (issue #136)', () => {
  test('renders empty state and "Adicionar" action when there are no skills', () => {
    const html = renderToStaticMarkup(
      React.createElement(SkillPanel, { skills: [], onChange: () => {} })
    );

    assert.match(html, /Nenhuma skill customizada atribuída/);
    assert.match(html, />Adicionar</);
  });

  test('renders a created skill, and no longer renders it after removal (via pure state functions)', () => {
    const withOne = addSkill([], { name: 'Resumo Executivo', description: 'Gera resumos executivos.' });

    const htmlWithSkill = renderToStaticMarkup(
      React.createElement(SkillPanel, { skills: withOne, onChange: () => {} })
    );
    assert.match(htmlWithSkill, /Resumo Executivo/);
    assert.doesNotMatch(htmlWithSkill, /Nenhuma skill customizada atribuída/);

    const afterRemoval = removeSkill(withOne, withOne[0].id);
    const htmlAfterRemoval = renderToStaticMarkup(
      React.createElement(SkillPanel, { skills: afterRemoval, onChange: () => {} })
    );
    assert.doesNotMatch(htmlAfterRemoval, /Resumo Executivo/);
    assert.match(htmlAfterRemoval, /Nenhuma skill customizada atribuída/);
  });
});
