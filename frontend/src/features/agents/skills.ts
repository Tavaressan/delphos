import { AgentSkill } from '../../domain/entities';

export interface SkillInput {
  name: string;
  description: string;
}

/**
 * Valida os dados de uma skill customizada antes de adicioná-la à lista.
 * Retorna a mensagem de erro, ou `null` se válido.
 */
export function validateSkillInput(input: SkillInput): string | null {
  if (!input.name.trim()) {
    return 'O nome da skill é obrigatório.';
  }
  return null;
}

/**
 * Adiciona uma nova skill customizada à lista, gerando um id e validando duplicidade de nome.
 * Lança erro se os dados forem inválidos ou o nome já existir.
 */
export function addSkill(list: AgentSkill[], input: SkillInput): AgentSkill[] {
  const validationError = validateSkillInput(input);
  if (validationError) {
    throw new Error(validationError);
  }
  if (list.some((skill) => skill.name.toLowerCase() === input.name.trim().toLowerCase())) {
    throw new Error(`Já existe uma skill com o nome "${input.name}".`);
  }

  const newSkill: AgentSkill = {
    id: `skill-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: input.name.trim(),
    description: input.description.trim(),
  };

  return [...list, newSkill];
}

/**
 * Remove uma skill customizada da lista pelo id.
 */
export function removeSkill(list: AgentSkill[], id: string): AgentSkill[] {
  return list.filter((skill) => skill.id !== id);
}
