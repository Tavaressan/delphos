import { AgentExecution, Document, Schedule } from '../entities';
import { SubmitExecutionRequest, CreateScheduleRequest } from '../dto';

export interface IExecutionRepository {
  submitExecution(request: SubmitExecutionRequest): Promise<AgentExecution>;
  getExecution(id: string): Promise<AgentExecution>;
  markExecutionTimeout(id: string): Promise<void>;
}

export interface IDocumentRepository {
  listDocuments(): Promise<Document[]>;
  uploadDocument(file: File): Promise<Document>;
}

export interface IScheduleRepository {
  createSchedule(request: CreateScheduleRequest): Promise<Schedule>;
  listSchedules(tenantId: string): Promise<Schedule[]>;
  cancelSchedule(id: string): Promise<void>;
}
