import { DocumentStatus, ExecutionStatus, AgentStatus, MessageRole } from '../../types';

export interface User {
  id: string; // UUID
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface Agent {
  id: string;
  name: string;
  version: string;
  tag: string;
  status: AgentStatus;
  description: string;
  tenant: string;
}

export interface Document {
  id: string;
  name: string;
  size: string;
  chunks: number;
  status: DocumentStatus;
  date: string;
  author: string;
}

export interface Conversation {
  id: string; // UUID
  title: string;
  userId: string;
  tenantId: string;
  createdAt: string;
}

export interface Message {
  id?: string;
  conversationId?: string;
  role: MessageRole;
  content: string;
  createdAt?: string;
  citation?: string;
}

export interface AgentExecution {
  id: string; // UUID
  conversationId: string; // UUID
  agentId: string; // UUID
  status: ExecutionStatus;
  prompt: string;
  output: string | null;
  errorMessage: string | null;
  tokensConsumed: number | null;
  startedAt: string | null; // ISO 8601 string
  finishedAt: string | null; // ISO 8601 string
}

export interface Role {
  id: string;
  name: string;
}

export interface Permission {
  id: string;
  name: string;
}
