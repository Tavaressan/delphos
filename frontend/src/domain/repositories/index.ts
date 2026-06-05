import { AgentExecution, Document } from '../entities';
import { SubmitExecutionRequest } from '../dto';

export interface IExecutionRepository {
  submitExecution(request: SubmitExecutionRequest): Promise<AgentExecution>;
  getExecution(id: string): Promise<AgentExecution>;
}

export interface IDocumentRepository {
  listDocuments(): Promise<Document[]>;
  uploadDocument(file: File): Promise<Document>;
}
