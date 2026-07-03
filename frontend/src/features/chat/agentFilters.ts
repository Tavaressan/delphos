export interface SelectableAgent {
  id: string;
  status?: string;
  [key: string]: unknown;
}

/**
 * Filtra agentes desativados (status INACTIVE) da lista usada no seletor do chat.
 * Defesa em profundidade: o backend (GET /api/agents) já filtra por status,
 * mas mantemos o filtro aqui para o caso de a API retornar dados desatualizados.
 */
export function filterSelectableAgents<T extends SelectableAgent>(agents: T[]): T[] {
  return agents.filter(agent => agent.status !== 'INACTIVE');
}
