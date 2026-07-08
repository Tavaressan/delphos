/**
 * Payload de uma invocação de ferramenta (tool-call) pelo agente, exibido no
 * chat com um renderer específico por tipo de ferramenta (issue #138).
 *
 * O backend (java-core) já persiste chamadas de ferramenta na entidade
 * ToolCall (tabela tool_calls), mas ainda não as expõe via API associadas às
 * mensagens da conversa — essa é uma dívida técnica separada. Este tipo
 * modela o contrato esperado assim que essa exposição existir.
 */
export interface ToolCallPayload {
  toolName: string;
  input: Record<string, any>;
  output?: string | null;
  status?: 'STARTED' | 'COMPLETED' | 'FAILED';
}
