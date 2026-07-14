// Parser/validador simples de expressões cron padrão de 5 campos:
// minuto hora dia-do-mes mes dia-da-semana
// Suporta apenas `*` e listas separadas por vírgula de valores inteiros dentro do range de cada
// campo (sem steps `/` ou ranges `-`), o que cobre o caso de uso de agendamento recorrente da UI.

interface CronField {
  label: string;
  min: number;
  max: number;
}

const FIELDS: CronField[] = [
  { label: 'minuto', min: 0, max: 59 },
  { label: 'hora', min: 0, max: 23 },
  { label: 'dia do mês', min: 1, max: 31 },
  { label: 'mês', min: 1, max: 12 },
  { label: 'dia da semana', min: 0, max: 6 },
];

function validateField(rawValue: string, field: CronField): string | null {
  if (rawValue === '*') return null;

  const tokens = rawValue.split(',');
  for (const token of tokens) {
    if (!/^\d+$/.test(token)) {
      return `Campo "${field.label}" inválido: "${token}" deve ser "*" ou um número inteiro.`;
    }
    const value = Number(token);
    if (value < field.min || value > field.max) {
      return `Campo "${field.label}" fora do intervalo permitido (${field.min}-${field.max}): "${token}".`;
    }
  }
  return null;
}

/**
 * Valida uma expressão cron de 5 campos. Retorna `null` se válida, ou uma mensagem de erro
 * em português explicando o problema encontrado.
 */
export function validateCronExpression(expression: string): string | null {
  const trimmed = expression.trim();
  if (!trimmed) {
    return 'Informe uma expressão cron.';
  }

  const parts = trimmed.split(/\s+/);
  if (parts.length !== 5) {
    return `Expressão cron inválida: são esperados 5 campos (minuto hora dia mês dia-da-semana), recebidos ${parts.length}.`;
  }

  for (let i = 0; i < FIELDS.length; i++) {
    const error = validateField(parts[i], FIELDS[i]);
    if (error) return error;
  }

  return null;
}

/**
 * Descreve uma expressão cron válida de forma legível em português. Assume que a expressão já
 * foi validada por `validateCronExpression`.
 */
export function describeCronExpression(expression: string): string {
  const parts = expression.trim().split(/\s+/);
  if (parts.length !== 5) return expression;

  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;

  if (minute === '*' && hour === '*' && dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
    return 'Executa todo minuto.';
  }

  if (dayOfMonth === '*' && month === '*' && dayOfWeek === '*' && minute !== '*' && hour !== '*') {
    const hh = hour.padStart(2, '0');
    const mm = minute.padStart(2, '0');
    return `Executa diariamente às ${hh}:${mm}.`;
  }

  return `Executa conforme a expressão "${expression}".`;
}
