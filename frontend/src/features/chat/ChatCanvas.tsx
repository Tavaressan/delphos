'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useExecution } from '../../hooks/useExecution';
import { ChatInput } from '../../components/forms/ChatInput';
import { Message } from '../../domain/entities';
import { Terminal, Activity, ShieldCheck, FileText, CheckCircle2, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, MessageSquarePlus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../providers/AuthProvider';
import { apiClient } from '../../infrastructure/api/apiClient';
import { useConversations } from '../../providers/ConversationProvider';
import { conversationRepository } from '../../infrastructure/repositories/ConversationRepository';

export const ChatCanvas: React.FC = () => {
  const { tenantId } = useAuth();
  const { activeConversationId, setActiveConversationId, createConversation, refreshConversations } = useConversations();
  const [agents, setAgents] = useState<any[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');
  const [chatHistory, setChatHistory] = useState<Message[]>([]);
  const [inputMsg, setInputMsg] = useState<string>('');
  const [isTimelineCollapsed, setIsTimelineCollapsed] = useState<boolean>(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const currentConversationIdRef = useRef<string | null>(null);

  const { submitPrompt, isLoading, timeline, error, activeExecution } = useExecution((output) => {
    setChatHistory(prev => [
      ...prev,
      {
        role: 'ASSISTANT',
        content: output,
        citation: 'Resposta do agente'
      }
    ]);
    refreshConversations();
  });

  useEffect(() => {
    const fetchAgents = async () => {
      try {
        const list = await apiClient.get<any[]>(`/api/agents?tenantId=${tenantId}`);
        setAgents(list);
        if (list.length > 0) {
          setSelectedAgentId(list[0].id);
        }
      } catch (err) {
        console.error("Erro ao carregar agentes:", err);
      }
    };
    if (tenantId) {
      fetchAgents();
    }
  }, [tenantId]);

  // Load message history when active conversation changes
  useEffect(() => {
    if (activeConversationId === currentConversationIdRef.current) return;
    currentConversationIdRef.current = activeConversationId;
    setChatHistory([]);

    if (!activeConversationId) return;

    conversationRepository.getMessages(activeConversationId).then((messages) => {
      setChatHistory(messages.map(m => ({
        id: m.id,
        conversationId: m.conversationId,
        role: m.role,
        content: m.content,
        createdAt: m.createdAt,
      })));
    }).catch((err) => {
      console.error('Erro ao carregar mensagens:', err);
    });
  }, [activeConversationId]);

  const handleNewChat = async () => {
    currentConversationIdRef.current = null;
    setChatHistory([]);
    setActiveConversationId(null);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMsg.trim() || isLoading) return;

    const userPrompt = inputMsg.trim();
    setInputMsg('');

    // Determine conversation: use active or create new
    let conversationId = activeConversationId;
    if (!conversationId) {
      const firstWords = userPrompt.split(' ').slice(0, 6).join(' ');
      const title = firstWords.length > 50 ? firstWords.substring(0, 50) + '…' : firstWords;
      const conv = await createConversation(title, selectedAgentId || undefined);
      conversationId = conv.id;
      currentConversationIdRef.current = conv.id;
    }

    setChatHistory(prev => [...prev, { role: 'USER', content: userPrompt }]);
    submitPrompt(userPrompt, selectedAgentId || undefined, conversationId);
  };


  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  return (
    <div className="flex-1 flex flex-col md:flex-row min-h-0 bg-background overflow-hidden p-6 gap-6 font-body transition-colors duration-200">
      
      {/* Chat Area (Left/Main Panel) */}
      <div className="flex-1 bg-surface border border-border-color rounded-lg shadow-sm flex flex-col min-h-0 overflow-hidden transition-all duration-300">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-border-color bg-secondary/15 dark:bg-slate-900/40 flex items-center justify-between transition-colors duration-200 flex-wrap gap-4">
          <div className="flex items-center gap-2.5">
            <Terminal className="w-5 h-5 text-primary" />
            <div>
              <h3 className="text-sm font-bold text-text-primary heading-font uppercase">Console de Interação Agêntica</h3>
              <span className="text-[10px] text-text-secondary font-mono">Selecione o agente e envie seu prompt técnico</span>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {agents.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-text-secondary">Agente:</span>
                <select
                  value={selectedAgentId}
                  onChange={(e) => setSelectedAgentId(e.target.value)}
                  className="bg-surface border border-border-color rounded px-2.5 py-1 text-xs text-text-primary focus:outline-none focus:border-primary transition-colors cursor-pointer"
                >
                  {agents.map((agent) => (
                    <option key={agent.id} value={agent.id}>
                      {agent.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {isLoading && (
              <span className="flex items-center gap-1.5 text-xs text-accent font-semibold animate-pulse">
                <span className="w-2 h-2 rounded-full bg-accent" />
                Executando...
              </span>
            )}

            <button
              onClick={handleNewChat}
              className="flex items-center gap-1.5 text-xs font-semibold text-text-secondary hover:text-primary border border-border-color hover:border-primary rounded px-2.5 py-1 transition-colors"
              title="Nova conversa"
            >
              <MessageSquarePlus className="w-3.5 h-3.5" />
              Novo Chat
            </button>
          </div>
        </div>

        {/* Message Log */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
          <AnimatePresence initial={false}>
            {chatHistory.map((msg, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex gap-3 max-w-[85%] ${
                  msg.role === 'USER' ? 'ml-auto flex-row-reverse' : 'mr-auto'
                }`}
              >
                {/* Avatar */}
                <div className={`w-8 h-8 rounded flex-shrink-0 flex items-center justify-center text-xs font-bold font-mono select-none ${
                  msg.role === 'USER' 
                    ? 'bg-slate-800 text-white dark:bg-slate-700' 
                    : msg.role === 'SYSTEM' 
                    ? 'bg-secondary dark:bg-slate-800 text-text-secondary'
                    : 'bg-primary text-white'
                }`}>
                  {msg.role === 'USER' ? 'US' : msg.role === 'SYSTEM' ? 'SY' : 'AG'}
                </div>

                {/* Content Bubble */}
                <div className="flex flex-col gap-1.5">
                  <div className={`rounded-lg p-3.5 text-xs leading-relaxed ${
                    msg.role === 'USER'
                      ? 'bg-primary text-white rounded-tr-none'
                      : msg.role === 'SYSTEM'
                      ? 'bg-secondary/40 text-text-secondary border border-border-color italic font-mono text-[11px]'
                      : 'bg-secondary/20 dark:bg-slate-800/40 text-text-primary border border-border-color rounded-tl-none'
                  }`}>
                    {msg.content}

                    {/* Citations if assistant */}
                    {msg.role === 'ASSISTANT' && msg.citation && (
                      <div className="mt-3 pt-2.5 border-t border-border-color/40 flex items-center gap-1.5 text-[10px] text-accent font-semibold">
                        <FileText className="w-3.5 h-3.5" />
                        <span>Citação: {msg.citation}</span>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex gap-3 mr-auto items-center"
            >
              <div className="w-8 h-8 rounded bg-primary text-white font-bold flex items-center justify-center text-xs animate-pulse">
                AV
              </div>
              <div className="bg-secondary/20 dark:bg-slate-800/40 border border-border-color rounded-lg rounded-tl-none p-4 flex gap-1 items-center">
                <span className="w-2 h-2 rounded-full bg-slate-400 dark:bg-slate-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 rounded-full bg-slate-400 dark:bg-slate-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 rounded-full bg-slate-400 dark:bg-slate-500 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </motion.div>
          )}

          {error && (
            <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 text-danger rounded-lg p-3.5 text-xs flex flex-col gap-1">
              <span className="font-bold uppercase tracking-wider text-[10px] text-red-600 dark:text-red-400">Erro na Execução</span>
              <span>{error}</span>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Input area */}
        <div className="p-4 border-t border-border-color bg-surface transition-colors duration-200">
          <ChatInput
            value={inputMsg}
            onChange={setInputMsg}
            onSubmit={handleSend}
            disabled={isLoading}
          />
        </div>
      </div>

      {/* Execution Timeline — desktop: right panel; mobile: bottom collapsible strip */}
      <div className={`
        transition-all duration-300 flex-shrink-0 bg-surface border border-border-color rounded-lg shadow-sm flex flex-col overflow-hidden
        ${isTimelineCollapsed
          ? 'p-3 h-12 md:h-auto md:w-12'
          : 'p-5 h-52 md:h-auto w-full md:w-80'}
      `}>
        {/* Panel header */}
        <div className="flex items-center justify-between border-b border-border-color pb-2 flex-shrink-0">
          {!isTimelineCollapsed && (
            <span className="text-xs font-bold text-text-secondary uppercase tracking-wider heading-font">Progresso de Execução</span>
          )}
          <div className={`flex items-center gap-2 ${isTimelineCollapsed ? 'w-full justify-center' : 'ml-auto'}`}>
            {!isTimelineCollapsed && (
              <Activity className={`w-4 h-4 text-accent ${isLoading ? 'animate-pulse' : ''}`} />
            )}
            <button
              onClick={() => setIsTimelineCollapsed(!isTimelineCollapsed)}
              className="text-text-secondary hover:text-text-primary p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center justify-center"
              aria-label={isTimelineCollapsed ? 'Expandir Linha do Tempo' : 'Recolher Linha do Tempo'}
            >
              {/* Mobile: chevron vertical; desktop: chevron horizontal */}
              <span className="md:hidden">
                {isTimelineCollapsed ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </span>
              <span className="hidden md:block">
                {isTimelineCollapsed ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </span>
            </button>
          </div>
        </div>

        {!isTimelineCollapsed && (
          <div className="overflow-y-auto flex-1 flex flex-col gap-4 pr-1 mt-4">
            {timeline.length > 0 ? (
              timeline.map((event) => (
                <div key={event.id} className="flex gap-3 text-xs">
                  <div className="flex flex-col items-center">
                    <div className={`w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center text-[9px] font-bold text-white transition-colors duration-300 ${
                      event.status === 'success' ? 'bg-success' :
                      event.status === 'warning' ? 'bg-warning' :
                      event.status === 'danger' ? 'bg-danger' :
                      'bg-slate-200 text-slate-500'
                    }`}>
                      {event.status === 'success' ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                      ) : (
                        event.id
                      )}
                    </div>
                    <div className="w-[1.5px] flex-1 bg-border-color mt-1" />
                  </div>
                  <div className="flex flex-col flex-1 pb-1">
                    <div className="flex justify-between items-center gap-2">
                      <span className="font-bold text-text-primary truncate">{event.name}</span>
                      <span className="text-[9px] font-mono text-text-secondary flex-shrink-0">{event.time}</span>
                    </div>
                    <p className="text-text-secondary mt-0.5 text-[11px] leading-relaxed">{event.details}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-text-secondary text-center py-8 gap-2">
                <Activity className="w-8 h-8 text-text-secondary opacity-60" />
                <span className="text-xs">Envie uma mensagem para começar.</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
