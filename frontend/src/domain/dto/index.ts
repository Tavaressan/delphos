import { ExecutionStatus } from '../../types';

export interface SubmitExecutionRequest {
  prompt: string;
  tenantId?: string;
  agentId?: string;
  conversationId?: string;
}

export interface SubmitExecutionResponse {
  executionId: string;
  conversationId: string;
  status: string;
  prompt: string;
  tenantId: string;
}

export interface GetExecutionResponse {
  executionId: string;
  status: ExecutionStatus;
  prompt: string;
  output: string | null;
  errorMessage: string | null;
  tokensConsumed: number | null;
  startedAt: string | null;
  finishedAt: string | null;
}
