'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useExecution } from '../../hooks/useExecution';
import { ChatInput } from '../../components/forms/ChatInput';
import { Message } from '../../domain/entities';
import { Terminal, Activity, ShieldCheck, FileText, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const INITIAL_MOCK_CHAT: Message[] = [
  { role: 'SYSTEM', content: 'Iniciando Assistente Técnico Alfabra. RAG ativo com busca híbrida de cosseno parametrizada.' },
  { role: 'USER', content: 'Qual a periodicidade obrigatória para checagem dos cabos de tração em elevadores industriais de carga?' },
  { 
    role: 'ASSISTANT', 
    content: 'De acordo com a seção 4.2.1 do manual_manutencao_elevadores_seda_v5.pdf, elevadores de carga industriais exigem uma inspeção visual completa dos cabos de tração a cada 30 dias operacionais ou 500 ciclos de viagem, o que ocorrer primeiro. Caso apresentem desgaste superior a 10% do diâmetro nominal, a troca imediata é mandatória.', 
    citation: 'manual_manutencao_elevadores_seda_v5.pdf - Pág. 12' 
  }
];

export const ChatCanvas: React.FC = () => {
  const [chatHistory, setChatHistory] = useState<Message[]>(INITIAL_MOCK_CHAT);
  const [inputMsg, setInputMsg] = useState<string>('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  const { submitPrompt, isLoading, timeline, error } = useExecution((output) => {
    // Callback when prompt execution finishes successfully
    setChatHistory(prev => [
      ...prev,
      {
        role: 'ASSISTANT',
        content: output,
        citation: 'Contexto RAG - Resposta do Backend'
      }
    ]);
  });

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMsg.trim() || isLoading) return;

    const userPrompt = inputMsg.trim();
    setInputMsg('');

    // Add user message to history
    setChatHistory(prev => [...prev, { role: 'USER', content: userPrompt }]);

    // Submit prompt to backend (hook starts polling)
    submitPrompt(userPrompt);
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  return (
    <div className="flex-1 flex flex-col md:flex-row min-h-0 bg-background overflow-hidden p-6 gap-6 font-body">
      
      {/* Chat Area (Left/Main Panel) */}
      <div className="flex-1 bg-white border border-slate-200 rounded-lg shadow-sm flex flex-col min-h-0 overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Terminal className="w-5 h-5 text-primary" />
            <div>
              <h3 className="text-sm font-bold text-slate-800 heading-font uppercase">Console de Interação RAG</h3>
              <p className="text-[11px] text-slate-400">Comunicação e busca vetorial em tempo real via Spring Boot & pgvector.</p>
            </div>
          </div>
          {isLoading && (
            <span className="flex items-center gap-1.5 text-xs text-accent font-semibold animate-pulse">
              <span className="w-2 h-2 rounded-full bg-accent" />
              Executando...
            </span>
          )}
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
                    ? 'bg-slate-800 text-white' 
                    : msg.role === 'SYSTEM' 
                    ? 'bg-slate-200 text-slate-600'
                    : 'bg-primary text-white'
                }`}>
                  {msg.role === 'USER' ? 'US' : msg.role === 'SYSTEM' ? 'SY' : 'AV'}
                </div>

                {/* Content Bubble */}
                <div className="flex flex-col gap-1.5">
                  <div className={`rounded-lg p-3.5 text-xs leading-relaxed ${
                    msg.role === 'USER'
                      ? 'bg-primary text-white rounded-tr-none'
                      : msg.role === 'SYSTEM'
                      ? 'bg-slate-100 text-slate-600 border border-slate-200 italic font-mono text-[11px]'
                      : 'bg-slate-50 text-slate-700 border border-slate-200 rounded-tl-none'
                  }`}>
                    {msg.content}

                    {/* Citations if assistant */}
                    {msg.role === 'ASSISTANT' && msg.citation && (
                      <div className="mt-3 pt-2.5 border-t border-slate-200/60 flex items-center gap-1.5 text-[10px] text-accent font-semibold">
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
              <div className="bg-slate-50 border border-slate-200 rounded-lg rounded-tl-none p-4 flex gap-1 items-center">
                <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </motion.div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-danger rounded-lg p-3.5 text-xs flex flex-col gap-1">
              <span className="font-bold uppercase tracking-wider text-[10px] text-red-600">Erro na Execução</span>
              <span>{error}</span>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Input area */}
        <div className="p-4 border-t border-slate-200 bg-white">
          <ChatInput
            value={inputMsg}
            onChange={setInputMsg}
            onSubmit={handleSend}
            disabled={isLoading}
          />
        </div>
      </div>

      {/* Execution Timeline (Right Panel) */}
      <div className="w-full md:w-80 bg-white border border-slate-200 rounded-lg p-5 shadow-sm flex flex-col gap-4 min-h-0">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider heading-font">Progresso de Execução</span>
          <Activity className={`w-4 h-4 text-accent ${isLoading ? 'animate-pulse' : ''}`} />
        </div>

        <div className="overflow-y-auto flex-1 flex flex-col gap-4 pr-1">
          {timeline.length > 0 ? (
            timeline.map((event) => (
              <div key={event.id} className="flex gap-3 text-xs">
                <div className="flex flex-col items-center">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white transition-colors duration-300 ${
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
                  <div className="w-[1.5px] h-full bg-slate-100 mt-1" />
                </div>
                <div className="flex flex-col flex-1 pb-1">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-700">{event.name}</span>
                    <span className="text-[9px] font-mono text-slate-400">{event.time}</span>
                  </div>
                  <p className="text-slate-500 mt-0.5 text-[11px] leading-relaxed">{event.details}</p>
                </div>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 text-center py-12 gap-2">
              <Activity className="w-8 h-8 text-slate-300" />
              <span className="text-xs">Aguardando envio de prompt para iniciar o monitoramento.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
