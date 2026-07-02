import { IExecutionRepository } from '../repositories';
import { AgentExecution } from '../entities';
import { SubmitExecutionRequest } from '../dto';

export class SubmitExecutionUseCase {
  constructor(private executionRepository: IExecutionRepository) {}

  async execute(request: SubmitExecutionRequest): Promise<AgentExecution> {
    return this.executionRepository.submitExecution(request);
  }
}

export class GetExecutionStatusUseCase {
  constructor(private executionRepository: IExecutionRepository) {}

  async execute(id: string): Promise<AgentExecution> {
    return this.executionRepository.getExecution(id);
  }
}

export class MarkExecutionTimeoutUseCase {
  constructor(private executionRepository: IExecutionRepository) {}

  async execute(id: string): Promise<void> {
    return this.executionRepository.markExecutionTimeout(id);
  }
}
