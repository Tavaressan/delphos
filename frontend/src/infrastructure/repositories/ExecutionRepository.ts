import { IExecutionRepository } from '../../domain/repositories';
import { AgentExecution } from '../../domain/entities';
import { SubmitExecutionRequest, SubmitExecutionResponse, GetExecutionResponse, ListExecutionItemResponse } from '../../domain/dto';
import { apiClient } from '../api/apiClient';
import { executionAdapter } from '../adapters/executionAdapter';

export class ExecutionRepository implements IExecutionRepository {
  async submitExecution(request: SubmitExecutionRequest): Promise<AgentExecution> {
    const response = await apiClient.post<SubmitExecutionResponse>('/api/executions', request);
    return executionAdapter.fromSubmitResponse(response);
  }

  async getExecution(id: string): Promise<AgentExecution> {
    const response = await apiClient.get<GetExecutionResponse>(`/api/executions/${id}`);
    return executionAdapter.toEntity(response);
  }

  async markExecutionTimeout(id: string): Promise<void> {
    await apiClient.patch(`/api/executions/${id}/timeout`);
  }

  async listExecutions(tenantId: string): Promise<ListExecutionItemResponse[]> {
    return apiClient.get<ListExecutionItemResponse[]>(`/api/executions?tenantId=${tenantId}`);
  }
}

export const executionRepository = new ExecutionRepository();
