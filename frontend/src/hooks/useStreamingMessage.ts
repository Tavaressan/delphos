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
 * Streaming real via SSE (Server-Sent Events) está desabilitado até o
 * backend expor o endpoint (issue #276): `ExecutionController` (java-core)
 * só tem `POST /`, `GET /`, `GET /{id}` e `POST /{id}/cancel` — nenhum
 * mapeamento para `/stream` existe. Com a suposição da issue #142 ativa,
 * `start()` abria uma conexão para um endpoint 404, disparava `onerror` e
 * caía silenciosamente no fallback de polling — ou seja, a feature nunca
 * funcionava de fato. Esta constante mantém a implementação de streaming
 * pronta (montagem incremental de chunks, parsing de linhas SSE) para
 * quando o endpoint existir de fato no backend, sem tentar abrir conexões
 * fadadas a falhar enquanto isso não acontece.
 */
export const isStreamingEnabled = (): boolean => false;

/**
 * Hook de streaming de mensagens do agente via SSE (Server-Sent Events).
 *
 * Ver `isStreamingEnabled` acima: `start()` é um no-op até o backend expor
 * `GET /api/executions/{id}/stream`. O contrato assumido é consistente com
 * o padrão REST já usado em `/api/executions/{id}`: `text/event-stream` com
 * eventos `data: <token>` incrementais e um evento final `event: done`.
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

    if (!isStreamingEnabled() || typeof EventSource === 'undefined') {
      // Streaming desabilitado (backend ainda não expõe o endpoint — issue
      // #276) ou ambiente sem suporte a EventSource (ex.: SSR): o chamador
      // deve continuar usando o polling existente como fallback.
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
