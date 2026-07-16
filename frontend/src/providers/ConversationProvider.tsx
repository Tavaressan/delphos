'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { Conversation } from '../domain/entities';
import { conversationRepository } from '../infrastructure/repositories/ConversationRepository';
import { useAuth } from './AuthProvider';

interface ConversationContextValue {
  conversations: Conversation[];
  activeConversationId: string | null;
  setActiveConversationId: (id: string | null) => void;
  createConversation: (title?: string, agentId?: string) => Promise<Conversation>;
  deleteConversation: (id: string) => Promise<void>;
  refreshConversations: () => Promise<void>;
  isLoading: boolean;
}

const ConversationContext = createContext<ConversationContextValue | null>(null);

export const ConversationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { tenantId, isLogged } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, _setActiveConversationId] = useState<string | null>(() => {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem('activeConversationId');
    }
    return null;
  });

  const setActiveConversationId = useCallback((id: string | null) => {
    _setActiveConversationId(id);
    if (typeof localStorage !== 'undefined') {
      if (id) {
        localStorage.setItem('activeConversationId', id);
      } else {
        localStorage.removeItem('activeConversationId');
      }
    }
  }, []);
  const [isLoading, setIsLoading] = useState(false);

  const refreshConversations = useCallback(async () => {
    if (!tenantId || !isLogged) return;
    setIsLoading(true);
    try {
      const list = await conversationRepository.list(tenantId);
      setConversations(list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    } catch (err) {
      console.error('Erro ao carregar conversas:', err);
    } finally {
      setIsLoading(false);
    }
  }, [tenantId, isLogged]);

  useEffect(() => {
    refreshConversations();
  }, [refreshConversations]);

  const createConversation = useCallback(async (title = 'Nova Conversa', agentId?: string): Promise<Conversation> => {
    const conversation = await conversationRepository.create(tenantId, title, agentId);
    setConversations(prev => [conversation, ...prev]);
    setActiveConversationId(conversation.id);
    return conversation;
  }, [tenantId]);

  const deleteConversation = useCallback(async (id: string) => {
    await conversationRepository.delete(id);
    setConversations(prev => prev.filter(c => c.id !== id));
    if (activeConversationId === id) {
      setActiveConversationId(null);
    }
  }, [activeConversationId]);

  return (
    <ConversationContext.Provider value={{
      conversations,
      activeConversationId,
      setActiveConversationId,
      createConversation,
      deleteConversation,
      refreshConversations,
      isLoading,
    }}>
      {children}
    </ConversationContext.Provider>
  );
};

export const useConversations = (): ConversationContextValue => {
  const ctx = useContext(ConversationContext);
  if (!ctx) throw new Error('useConversations must be used inside ConversationProvider');
  return ctx;
};
