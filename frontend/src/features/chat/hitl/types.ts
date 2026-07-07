// Tipos do fluxo de human-in-the-loop (HITL) — issue #137.
//
// NOTA (lacuna de integração): o backend ainda não emite um evento real de
// "ação sensível pendente" (ex.: via SSE/WebSocket). Estas peças de UI são
// consumidas por props tipadas e mockáveis; a integração real com o
// orquestrador de agentes fica como próximo passo.

/** Modo de permissão configurável por agente ou por sessão. */
export type PermissionMode = 'auto' | 'ask' | 'deny';

/** Ação sensível solicitada por um agente, aguardando decisão humana. */
export interface SensitiveAction {
  id: string;
  agentId: string;
  agentName: string;
  actionLabel: string;
  description?: string;
}
