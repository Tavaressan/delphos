export type AgentStatus = 'PUBLISHED' | 'IN_REVIEW' | 'INACTIVE' | string;

/**
 * Um agente só pode ser reativado (INACTIVE -> PUBLISHED) quando está desativado.
 */
export function canReactivate(status?: AgentStatus): boolean {
  return status === 'INACTIVE';
}

/**
 * Status resultante ao reativar um agente. Reutiliza o mesmo endpoint de
 * publicação (`/api/admin/agents/{id}/publish`), que já aceita a transição
 * INACTIVE -> PUBLISHED sem checagem adicional no backend.
 */
export function reactivateStatus(): AgentStatus {
  return 'PUBLISHED';
}
