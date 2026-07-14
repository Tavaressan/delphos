import { AgentKnowledgeBaseConfig, AgentModelConfig, EmbeddingModel, LlmModel } from '../../domain/entities';

export const DEFAULT_MODEL_CONFIG: AgentModelConfig = {
  llmModel: 'gemini-1.5-flash',
  temperature: 0.7,
  topP: 0.95,
};

export const DEFAULT_KNOWLEDGE_BASE_CONFIG: AgentKnowledgeBaseConfig = {
  embeddingModel: 'text-embedding-004',
  dimension: 768,
};

export const LLM_MODEL_OPTIONS: Array<{ value: LlmModel; label: string }> = [
  { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
  { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
  { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
];

export const EMBEDDING_MODEL_OPTIONS: Array<{ value: EmbeddingModel; label: string }> = [
  { value: 'text-embedding-004', label: 'text-embedding-004' },
  { value: 'text-multilingual-embedding-002', label: 'text-multilingual-embedding-002' },
];

export const DIMENSION_OPTIONS: number[] = [256, 768, 1536];

/**
 * Valida e aplica uma alteração parcial nos parâmetros de modelo (temperatura, top-p, LLM).
 * Lança erro se o valor estiver fora do intervalo permitido.
 */
export function updateModelConfig(
  config: AgentModelConfig,
  patch: Partial<AgentModelConfig>
): AgentModelConfig {
  if (patch.temperature !== undefined && (patch.temperature < 0 || patch.temperature > 1)) {
    throw new Error('A temperatura deve estar entre 0 e 1.');
  }
  if (patch.topP !== undefined && (patch.topP < 0 || patch.topP > 1)) {
    throw new Error('O top-p deve estar entre 0 e 1.');
  }
  return { ...config, ...patch };
}

/**
 * Valida e aplica uma alteração parcial nos parâmetros da base de conhecimento
 * (modelo de embedding e dimensão do vetor).
 */
export function updateKnowledgeBaseConfig(
  config: AgentKnowledgeBaseConfig,
  patch: Partial<AgentKnowledgeBaseConfig>
): AgentKnowledgeBaseConfig {
  if (patch.dimension !== undefined && patch.dimension <= 0) {
    throw new Error('A dimensão do embedding deve ser um número positivo.');
  }
  return { ...config, ...patch };
}
