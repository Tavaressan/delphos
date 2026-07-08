'use client';

import { useCallback, useRef, useState } from 'react';
import { BASE_URL } from '../infrastructure/api/apiClient';

/**
 * Concatena um novo chunk de texto ao texto já montado. Extraído como
 * função pura para permitir testar a montagem incremental sem depender de
 * um EventSource real (issue #142).
 */
export const applyStreamChunk = (current: string, chunk: string): string => {
  if (!chunk) return current;
  return current + chunk;
};

/**
 * Extrai o payload de uma linha bruta de SSE (Server-Sent Events) no
 * formato `data: <token>`. Retorna `null` para linhas que não carregam
 * dado (comentários `:heartbeat`, nomes de evento `event: ...`, linhas
 * vazias usadas como delimitador de evento).
 */
export const parseSseDataLine = (rawLine: string): string | null => {
  if (!rawLine.startsWith('data:')) return null;
  return rawLine.slice('data:'.length).replace(/^ /, '');
};

/**
 * Hook de streaming de mensagens do agente via SSE (Server-Sent Events).
 *
 * Suposição documentada (issue #142): no momento em que este hook foi
 * escrito, o backend (java-core `ExecutionController`) ainda não expõe
 * nenhum endpoint de streaming/SSE — apenas o polling síncrono usado por
 * `useExecution`. Assumimos aqui, de forma consistente com o padrão REST
 * já usado em `/api/executions/{id}`, um endpoint
 * `GET /api/executions/{id}/stream` que responde `text/event-stream` com
 * eventos `data: <token>` incrementais e um evento final `event: done`.
 * Quando esse endpoint existir de fato no backend, nenhuma mudança de
 * contrato deveria ser necessária neste hook.
 */
export const useStreamingMessage = () => {
  const [text, setText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  const stop = useCallback(() => {
    eventSourceRef.current?.close();
    eventSourceRef.current = null;
    setIsStreaming(false);
  }, []);

  const reset = useCallback(() => {
    stop();
    setText('');
  }, [stop]);

  const start = useCallback((executionId: string, onDone?: (finalText: string) => void) => {
    reset();

    if (typeof EventSource === 'undefined') {
      // Ambiente sem suporte a EventSource (ex.: SSR) — o chamador deve
      // continuar usando o polling existente como fallback.
      return;
    }

    setIsStreaming(true);
    const url = `${BASE_URL.replace(/\/$/, '')}/api/executions/${executionId}/stream`;
    const source = new EventSource(url);
    eventSourceRef.current = source;

    let assembled = '';

    source.onmessage = (event: MessageEvent) => {
      assembled = applyStreamChunk(assembled, event.data);
      setText(assembled);
    };

    source.addEventListener('done', () => {
      stop();
      onDone?.(assembled);
    });

    source.onerror = () => {
      // Backend ainda não expõe o endpoint de streaming, ou a conexão
      // caiu: encerra a stream e deixa o chamador seguir com o polling.
      stop();
    };
  }, [reset, stop]);

  return { text, isStreaming, start, stop, reset };
};
