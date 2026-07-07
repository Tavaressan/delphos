import { McpServerConfig, McpTransport } from '../../domain/entities';

export interface McpConfigInput {
  name: string;
  command: string;
  transport: McpTransport;
}

/**
 * Valida os dados de um servidor MCP antes de adicioná-lo à lista.
 * Retorna a mensagem de erro, ou `null` se válido.
 */
export function validateMcpConfigInput(input: McpConfigInput): string | null {
  if (!input.name.trim()) {
    return 'O nome do servidor MCP é obrigatório.';
  }
  if (!input.command.trim()) {
    return 'Informe o comando (stdio) ou a URL (sse) do servidor MCP.';
  }
  return null;
}

/**
 * Adiciona um novo servidor MCP à lista, gerando um id e validando duplicidade de nome.
 * Lança erro se os dados forem inválidos ou o nome já existir.
 */
export function addMcpConfig(list: McpServerConfig[], input: McpConfigInput): McpServerConfig[] {
  const validationError = validateMcpConfigInput(input);
  if (validationError) {
    throw new Error(validationError);
  }
  if (list.some((config) => config.name.toLowerCase() === input.name.trim().toLowerCase())) {
    throw new Error(`Já existe um servidor MCP com o nome "${input.name}".`);
  }

  const newConfig: McpServerConfig = {
    id: `mcp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: input.name.trim(),
    command: input.command.trim(),
    transport: input.transport,
  };

  return [...list, newConfig];
}

/**
 * Remove um servidor MCP da lista pelo id.
 */
export function removeMcpConfig(list: McpServerConfig[], id: string): McpServerConfig[] {
  return list.filter((config) => config.id !== id);
}
