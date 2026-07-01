'use client';

import { useState, useRef, useEffect } from 'react';
import { AgentExecution, RetrievalSource } from '../domain/entities';
import { SubmitExecutionUseCase, GetExecutionStatusUseCase } from '../domain/use-cases/execution';
import { executionRepository } from '../infrastructure/repositories/ExecutionRepository';
import { useAuth } from '../providers/AuthProvider';

export interface TimelineEvent {
  id: number;
  name: string;
  status: 'success' | 'warning' | 'danger' | 'pending';
  time: string;
  details: string;
}

const submitUseCase = new SubmitExecutionUseCase(executionRepository);
const getStatusUseCase = new GetExecutionStatusUseCase(executionRepository);

export const useExecution = (onSuccess?: (output: string, sources?: RetrievalSource[]) => void) => {
  const { tenantId } = useAuth();
  const [activeExecution, setActiveExecution] = useState<AgentExecution | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  const pollingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const attemptsRef = useRef<number>(0);
  const MAX_ATTEMPTS = 60; // Max 2 minutes (60 * 2 seconds)

  const stopPolling = () => {
    if (pollingTimerRef.current) {
      clearInterval(pollingTimerRef.current);
      pollingTimerRef.current = null;
    }
  };

  useEffect(() => {
    return () => stopPolling();
  }, []);

  const formatTime = () => {
    const d = new Date();
    return d.toTimeString().split(' ')[0];
  };

  const getTimelineForStatus = (status: string, prevEvents: TimelineEvent[], extraDetails?: string): TimelineEvent[] => {
    const timeStr = formatTime();
    const newEvents = [...prevEvents];
    
    const upsertEvent = (id: number, name: string, statusVal: 'success' | 'warning' | 'danger' | 'pending', details: string) => {
      const idx = newEvents.findIndex(e => e.id === id);
      if (idx !== -1) {
        newEvents[idx] = { id, name, status: statusVal, time: timeStr, details };
      } else {
        newEvents.push({ id, name, status: statusVal, time: timeStr, details });
      }
    };

    // 1. REQUESTED
    if (status === 'REQUESTED' || status === 'QUEUED' || status === 'THINKING' || status === 'TOOL_RUNNING' || status === 'COMPLETED' || status === 'FAILED') {
      upsertEvent(1, 'REQUESTED', 'success', 'Triggers de chat recebidos e autenticados.');
    }

    // 2. QUEUED
    if (status === 'QUEUED' || status === 'THINKING' || status === 'TOOL_RUNNING' || status === 'COMPLETED' || status === 'FAILED') {
      upsertEvent(2, 'QUEUED', 'success', 'Tarefa distribuída no RabbitMQ na fila agent.execution.jobs.');
    } else if (status === 'REQUESTED') {
      upsertEvent(2, 'QUEUED', 'pending', 'Enfileirando tarefa...');
    }

    // 3. THINKING / STARTED
    if (status === 'THINKING' || status === 'TOOL_RUNNING' || status === 'COMPLETED' || status === 'FAILED') {
      upsertEvent(3, 'THINKING', 'success', 'Worker cognitivo instanciado. Formulando plano de ação.');
    } else if (status === 'QUEUED') {
      upsertEvent(3, 'THINKING', 'pending', 'Aguardando worker cognitivo...');
    }

    // 4. TOOL_RUNNING
    if (status === 'TOOL_RUNNING' || status === 'COMPLETED' || status === 'FAILED') {
      const detailsText = status === 'TOOL_RUNNING' 
        ? 'Executando busca vetorial cosseno no banco pgvector...' 
        : 'Busca vetorial pgvector concluída.';
      upsertEvent(4, 'TOOL_RUNNING', status === 'TOOL_RUNNING' ? 'warning' : 'success', detailsText);
    } else if (status === 'THINKING') {
      upsertEvent(4, 'TOOL_RUNNING', 'pending', 'Preparando buscas vetoriais...');
    }

    // 5. COMPLETED / FAILED
    if (status === 'COMPLETED') {
      upsertEvent(5, 'COMPLETED', 'success', 'Execução concluída com sucesso. Resposta gerada.');
    } else if (status === 'FAILED') {
      upsertEvent(5, 'FAILED', 'danger', `Falha no processamento: ${extraDetails || 'Erro interno.'}`);
    } else if (status === 'TOOL_RUNNING') {
      upsertEvent(5, 'COMPLETED', 'pending', 'Finalizando geração de resposta...');
    }

    return newEvents;
  };

  const submitPrompt = async (prompt: string, agentId?: string, conversationId?: string) => {
    setIsLoading(true);
    setError(null);
    stopPolling();
    attemptsRef.current = 0;

    // Set initial requested timeline
    const initialEvents = getTimelineForStatus('REQUESTED', []);
    setTimeline(initialEvents);

    try {
      const execution = await submitUseCase.execute({ prompt, tenantId, agentId, conversationId });
      setActiveExecution(execution);

      // Update timeline to Queued
      const queuedEvents = getTimelineForStatus('QUEUED', initialEvents);
      setTimeline(queuedEvents);

      // Start Polling every 2 seconds
      pollingTimerRef.current = setInterval(async () => {
        attemptsRef.current += 1;
        if (attemptsRef.current > MAX_ATTEMPTS) {
          stopPolling();
          setIsLoading(false);
          setError('Tempo limite de execução excedido (Timeout de 2 minutos).');
          setTimeline(prev => getTimelineForStatus('FAILED', prev, 'Timeout de execução excedido.'));
          return;
        }

        try {
          const status = await getStatusUseCase.execute(execution.id);
          setActiveExecution(status);
          
          setTimeline(prev => getTimelineForStatus(status.status, prev, status.errorMessage || undefined));

          if (status.status === 'COMPLETED') {
            stopPolling();
            setIsLoading(false);
            if (onSuccess && status.output) {
              onSuccess(status.output, status.sources);
            }
          } else if (status.status === 'FAILED') {
            stopPolling();
            setIsLoading(false);
            setError(status.errorMessage || 'Falha no processamento do agente backend.');
          }
        } catch (pollErr: any) {
          // Keep polling if simple request failure, but log error
          console.error('Erro no polling de execução:', pollErr);
        }
      }, 2000);

    } catch (err: any) {
      setIsLoading(false);
      setError(err.message || 'Falha ao submeter execução.');
      setTimeline(prev => getTimelineForStatus('FAILED', prev, err.message));
    }
  };

  return {
    submitPrompt,
    activeExecution,
    isLoading,
    timeline,
    error,
  };
};
