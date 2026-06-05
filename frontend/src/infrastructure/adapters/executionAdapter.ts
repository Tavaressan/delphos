import { AgentExecution } from '../../domain/entities';
import { GetExecutionResponse, SubmitExecutionResponse } from '../../domain/dto';

export const executionAdapter = {
  toEntity(dto: GetExecutionResponse): AgentExecution {
    return {
      id: dto.executionId,
      conversationId: '', // To be filled/handled if needed, backend GET doesn't return conversationId directly in getExecution
      agentId: '', // Default placeholder
      status: dto.status,
      prompt: dto.prompt,
      output: dto.output,
      errorMessage: dto.errorMessage,
      tokensConsumed: dto.tokensConsumed,
      startedAt: dto.startedAt,
      finishedAt: dto.finishedAt,
    };
  },

  fromSubmitResponse(dto: SubmitExecutionResponse): AgentExecution {
    return {
      id: dto.executionId,
      conversationId: dto.conversationId,
      agentId: '', // Default placeholder
      status: dto.status as any,
      prompt: dto.prompt,
      output: null,
      errorMessage: null,
      tokensConsumed: null,
      startedAt: new Date().toISOString(),
      finishedAt: null,
    };
  }
};
