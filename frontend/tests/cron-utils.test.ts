import { test, describe } from 'node:test';
import assert from 'node:assert';
import { validateCronExpression, describeCronExpression } from '../src/features/schedule/cronUtils';

// Reproduz a issue #134: a UI de agendamento precisa validar a expressão cron
// informada pelo usuário antes de permitir a criação do agendamento.
describe('validateCronExpression', () => {
  test('accepts a standard 5-field cron expression', () => {
    assert.strictEqual(validateCronExpression('0 9 * * 1'), null);
  });

  test('accepts wildcard-only expression (every minute)', () => {
    assert.strictEqual(validateCronExpression('* * * * *'), null);
  });

  test('accepts comma-separated lists within valid ranges', () => {
    assert.strictEqual(validateCronExpression('0,30 9,18 * * 1,3,5'), null);
  });

  test('rejects an empty expression', () => {
    const error = validateCronExpression('');
    assert.ok(error);
  });

  test('rejects expressions with the wrong number of fields', () => {
    const error = validateCronExpression('0 9 * *');
    assert.ok(error);
    assert.match(error, /5 campos/);
  });

  test('rejects a field value out of range', () => {
    const error = validateCronExpression('0 25 * * *');
    assert.ok(error);
    assert.match(error, /hora/i);
  });

  test('rejects non-numeric, non-wildcard tokens', () => {
    const error = validateCronExpression('a 9 * * *');
    assert.ok(error);
  });
});

describe('describeCronExpression', () => {
  test('describes an every-minute expression in Portuguese', () => {
    assert.match(describeCronExpression('* * * * *'), /todo minuto/i);
  });

  test('describes a daily fixed-time expression in Portuguese', () => {
    assert.match(describeCronExpression('0 9 * * *'), /09:00/);
  });
});
