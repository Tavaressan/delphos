'use client';

import React, { useState } from 'react';
import { MessageSquarePlus, Trash2, MessageSquare, Loader2 } from 'lucide-react';
import { useConversations } from '../../providers/ConversationProvider';

export const ConversationList: React.FC = () => {
  const { conversations, activeConversationId, setActiveConversationId, createConversation, deleteConversation, isLoading } = useConversations();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleNew = async () => {
    await createConversation();
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setDeletingId(id);
    try {
      await deleteConversation(id);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      {/* Header + New Chat */}
      <div className="px-3 pt-3 pb-2 flex items-center justify-between">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest heading-font">
          Histórico
        </span>
        <button
          onClick={handleNew}
          className="flex items-center gap-1 text-[10px] font-semibold text-primary hover:text-primary/80 transition-colors"
          title="Nova conversa"
        >
          <MessageSquarePlus className="w-3.5 h-3.5" />
          <span>Novo</span>
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto flex flex-col gap-0.5 px-2 pb-2">
        {isLoading && conversations.length === 0 && (
          <div className="flex items-center justify-center py-6 text-slate-400">
            <Loader2 className="w-4 h-4 animate-spin" />
          </div>
        )}

        {!isLoading && conversations.length === 0 && (
          <div className="text-[11px] text-slate-400 text-center py-6 px-2">
            Nenhuma conversa ainda.
          </div>
        )}

        {conversations.map((conv) => {
          const isActive = conv.id === activeConversationId;
          return (
            <button
              key={conv.id}
              onClick={() => setActiveConversationId(conv.id)}
              className={`group flex items-center gap-2 w-full text-left rounded px-2 py-2 transition-colors text-xs ${
                isActive
                  ? 'bg-primary/10 text-primary font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800/50'
              }`}
            >
              <MessageSquare className={`w-3.5 h-3.5 flex-shrink-0 ${isActive ? 'text-primary' : 'text-slate-400'}`} />
              <span className="flex-1 truncate">{conv.title}</span>
              <button
                onClick={(e) => handleDelete(e, conv.id)}
                className={`flex-shrink-0 rounded p-0.5 transition-colors opacity-0 group-hover:opacity-100 ${
                  isActive ? 'opacity-100' : ''
                } hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-600`}
                title="Deletar conversa"
              >
                {deletingId === conv.id ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Trash2 className="w-3 h-3" />
                )}
              </button>
            </button>
          );
        })}
      </div>
    </div>
  );
};
