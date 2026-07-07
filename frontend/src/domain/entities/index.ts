import { DocumentStatus, ExecutionStatus, AgentStatus, MessageRole } from '../../types';

export interface User {
  id: string; // UUID
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  status: 'ACTIVE' | 'INACTIVE';
  role?: 'ROLE_USER' | 'ROLE_ADMIN';
}

export interface UserSession {
  id: string; // UUID
  userAgent: string | null;
  ipAddress: string | null;
  createdAt: string | null;
  lastActiveAt: string | null;
}

export interface UserProfile {
  id: string; // UUID
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

export interface RetrievalSource {
  documentId: string | null;
  documentName: string | null;
  similarityScore: number;
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
  sources?: RetrievalSource[];
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
  sources?: RetrievalSource[];
}

export interface Role {
  id: string;
  name: string;
}

export interface Permission {
  id: string;
  name: string;
}

// Painel de integrações do agente (issue #136): servidores MCP e skills customizadas.
export type McpTransport = 'stdio' | 'sse';

export interface McpServerConfig {
  id: string;
  name: string;
  command: string; // comando (stdio) ou URL (sse) do servidor MCP
  transport: McpTransport;
}

export interface AgentSkill {
  id: string;
  name: string;
  description: string;
}
