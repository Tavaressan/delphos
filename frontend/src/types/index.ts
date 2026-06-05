export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  content: T[];
  totalPages: number;
  totalElements: number;
  size: number;
  number: number;
}

export interface ErrorResponse {
  error: string;
  message?: string;
  status?: number;
}

export type DocumentStatus = 'UPLOADING' | 'PROCESSING' | 'INDEXED' | 'FAILED';
export type ExecutionStatus = 'REQUESTED' | 'QUEUED' | 'THINKING' | 'TOOL_RUNNING' | 'COMPLETED' | 'FAILED';
export type AgentStatus = 'DRAFT' | 'IN_REVIEW' | 'PUBLISHED' | 'ARCHIVED';
export type MessageRole = 'USER' | 'ASSISTANT' | 'SYSTEM';
