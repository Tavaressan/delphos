import { Conversation, Message } from '../../domain/entities';
import { apiClient } from '../api/apiClient';

export class ConversationRepository {
  async list(tenantId: string): Promise<Conversation[]> {
    return apiClient.get<Conversation[]>(`/api/chats?tenantId=${tenantId}`);
  }

  async create(tenantId: string, title: string, agentId?: string): Promise<Conversation> {
    return apiClient.post<Conversation>('/api/chats', { tenantId, title, agentId });
  }

  async getMessages(conversationId: string): Promise<Message[]> {
    return apiClient.get<Message[]>(`/api/chats/${conversationId}/messages`);
  }

  async delete(conversationId: string): Promise<void> {
    return apiClient.delete<void>(`/api/chats/${conversationId}`);
  }
}

export const conversationRepository = new ConversationRepository();
