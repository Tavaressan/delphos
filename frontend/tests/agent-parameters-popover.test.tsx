import { test, describe } from 'node:test';
import assert from 'node:assert';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ModelParametersPopover } from '../src/features/agents/components/popover/ModelParametersPopover';
import { KnowledgeBaseParametersPopover } from '../src/features/agents/components/popover/KnowledgeBaseParametersPopover';
import { DEFAULT_KNOWLEDGE_BASE_CONFIG, DEFAULT_MODEL_CONFIG, updateModelConfig, updateKnowledgeBaseConfig } from '../src/features/agents/modelConfig';
import { DimensionSelect } from '../src/features/agents/components/select/DimensionSelect';
import { AgentModelConfig, AgentKnowledgeBaseConfig } from '../src/domain/entities';

describe('ModelParametersPopover (issue #143)', () => {
  test('renders only the trigger when closed, and the parameter panel when open', () => {
    const closedHtml = renderToStaticMarkup(
      React.createElement(ModelParametersPopover, {
        isOpen: false,
        config: DEFAULT_MODEL_CONFIG,
        onToggle: () => {},
        onChange: () => {},
      })
    );
    assert.ok(!closedHtml.includes('role="dialog"'));

    const openHtml = renderToStaticMarkup(
      React.createElement(ModelParametersPopover, {
        isOpen: true,
        config: DEFAULT_MODEL_CONFIG,
        onToggle: () => {},
        onChange: () => {},
      })
    );
    assert.match(openHtml, /role="dialog"/);
    assert.match(openHtml, /Temperatura/);
  });

  test('changing the temperature slider persists the new value via onChange (simulating agent config update)', () => {
    let persistedConfig: AgentModelConfig = DEFAULT_MODEL_CONFIG;

    const handleChange = (next: AgentModelConfig) => {
      persistedConfig = updateModelConfig(persistedConfig, { temperature: next.temperature });
    };

    const element = ModelParametersPopover({
      isOpen: true,
      config: persistedConfig,
      onToggle: () => {},
      onChange: handleChange,
    }) as any;

    // dialog panel é o segundo filho de children[1] (o div isOpen && (...)); localiza o input de temperatura.
    const panel = element.props.children[1].props.children;
    const temperatureLabel = panel[1];
    const temperatureInput = temperatureLabel.props.children[1];

    assert.strictEqual(temperatureInput.props.value, DEFAULT_MODEL_CONFIG.temperature);

    temperatureInput.props.onChange({ target: { value: '0.2' } });

    assert.strictEqual(persistedConfig.temperature, 0.2);
  });

  test('rejects an out-of-range temperature and does not persist it', () => {
    assert.throws(() => updateModelConfig(DEFAULT_MODEL_CONFIG, { temperature: 1.5 }), /entre 0 e 1/);
  });
});

describe('KnowledgeBaseParametersPopover (issue #143)', () => {
  test('changing the dimension select persists the new value via onChange', () => {
    let persistedConfig: AgentKnowledgeBaseConfig = DEFAULT_KNOWLEDGE_BASE_CONFIG;

    const handleChange = (next: AgentKnowledgeBaseConfig) => {
      persistedConfig = updateKnowledgeBaseConfig(persistedConfig, { dimension: next.dimension });
    };

    const element = KnowledgeBaseParametersPopover({
      isOpen: true,
      config: persistedConfig,
      onToggle: () => {},
      onChange: handleChange,
    }) as any;

    const panel = element.props.children[1].props.children;
    const dimensionSelectElement = panel[1];
    const dimensionSelectLabel = DimensionSelect(dimensionSelectElement.props) as any;
    const dimensionSelect = dimensionSelectLabel.props.children[1];

    dimensionSelect.props.onChange({ target: { value: '1536' } });

    assert.strictEqual(persistedConfig.dimension, 1536);
  });
});
