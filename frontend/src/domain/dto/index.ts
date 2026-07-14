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

export interface GetExecutionSource {
  documentId: string | null;
  documentName: string | null;
  similarityScore: number;
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
  sources?: GetExecutionSource[];
}

export interface ListExecutionItemResponse {
  executionId: string;
  status: ExecutionStatus;
  prompt: string | null;
  startedAt: string | null;
  finishedAt: string | null;
}

export interface CreateScheduleRequest {
  agentId: string;
  cronExpression: string;
  prompt: string;
  tenantId?: string;
}

export interface ScheduleResponse {
  scheduleId: string;
  agentId: string;
  agentName: string | null;
  cronExpression: string;
  prompt: string;
  status: 'ACTIVE' | 'CANCELLED';
  createdAt: string;
  nextRunAt: string | null;
}

export interface GetMeResponse {
  id: string;
  username: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  jobTitle: string | null;
  avatarUrl: string | null;
  status: string;
  tenantId: string;
  createdAt: string | null;
  lastLogin: string | null;
  roles: string[];
}

export interface UpdateProfileRequest {
  firstName?: string;
  lastName?: string;
  jobTitle?: string;
  email?: string;
}

export interface UploadAvatarResponse {
  avatarUrl: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface UserSessionResponse {
  id: string;
  userAgent: string | null;
  ipAddress: string | null;
  createdAt: string | null;
  lastActiveAt: string | null;
}
