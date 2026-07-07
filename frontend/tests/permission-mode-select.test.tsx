import { test, describe } from 'node:test';
import assert from 'node:assert';
import { PermissionModeSelect } from '../src/features/chat/hitl/PermissionModeSelect';
import type { PermissionMode } from '../src/features/chat/hitl/types';

describe('PermissionModeSelect (issue #137 — HITL)', () => {
  test('changing the select value calls onChange with the selected mode', () => {
    let selected: PermissionMode | null = null;

    const element = PermissionModeSelect({
      value: 'ask',
      label: 'Agente Financeiro',
      onChange: (mode) => { selected = mode; },
    }) as any;

    const selectProps = element.props.children[1].props as {
      value: PermissionMode;
      onChange: (e: { target: { value: string } }) => void;
    };

    assert.strictEqual(selectProps.value, 'ask');

    selectProps.onChange({ target: { value: 'deny' } });
    assert.strictEqual(selected, 'deny');
  });
});
