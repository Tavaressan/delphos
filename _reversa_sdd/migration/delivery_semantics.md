# Semântica de Entrega e Confiabilidade de Mensagens

Este documento estabelece as garantias transacionais, controle de idempotência e políticas de tratamento de falhas implementadas na infraestrutura de mensageria (RabbitMQ) da **Enterprise Agent Operating Platform**.

---

## 1. Semântica `at-least-once` (Entrega pelo menos uma vez)

Para evitar perdas de execuções cognitivas críticas ou falhas silenciosas na indexação de documentos, a plataforma adota a semântica **at-least-once**:
1. **Acknowledge Manual (ACK):** Os workers no Kubernetes não utilizam auto-ack. O RabbitMQ só remove a mensagem da fila quando recebe uma sinalização manual de `ACK` do worker.
2. **Confirmações de Escrita:** O worker só envia o `ACK` após confirmar a persistência dos resultados parciais ou finais no `Memory Service` e as auditorias imutáveis no PostgreSQL.
3. **Redepacho:** Se um Pod do worker cair ou reiniciar no meio da execução (gerando quebra de canal TCP com o broker), a mensagem é automaticamente recolocada na fila de origem e despachada para outro worker ativo.

---

## 2. Idempotência e Deduplicação

Devido à possibilidade de entregas duplicadas na semântica `at-least-once`, todos os consumidores de filas devem implementar mecanismos de idempotência:
- **Chave de Idempotência:** Toda solicitação de execução carrega um ID de transação imutável (`execution_id` no formato UUIDv4) gerado na camada Spring.
- **Tabela de Controle:** Antes de inicializar o processamento, o worker tenta realizar um insert atômico na tabela de auditoria `agent_executions`.
- **Deduplicação:** Se a inserção falhar devido a uma violação de chave primária (`id` duplicado) e o status do registro já for `STARTED`, `COMPLETED` ou `THINKING`, o worker ignora silenciosamente a mensagem duplicada, evitando re-processamento cognitivo e cobranças duplicadas de tokens de LLMs.

---

## 3. Políticas de Retry e Dead Letter Exchange (DLX)

Falhas transientes ou sistemáticas seguem um pipeline rigoroso de isolamento:

```
[Fila Principal] ──► (Falha Transiente?) ─► [Fila Retry (TTL + Backoff)]
       │                                           │
(Esgotou Retries?)                            (Retry)
       │                                           │
       ▼                                           ▼
[Dead Letter Queue (DLQ)]                  [Fila Principal]
```

### 3.1. Tratamento de Falhas Transientes
- **Ação:** Erros de comunicação de rede temporários com APIs de LLMs ou timeout de banco de dados geram um `NACK` (Negative Acknowledge) com a opção `requeue = false`.
- **Fila de Retry com Backoff Exponencial:** A mensagem é roteada para a fila de retry via Dead Letter Exchange. A fila de retry possui propriedades de TTL (Time-To-Live) crescentes (ex: 5s, 30s, 300s) atuando como backoff exponencial antes de devolver a mensagem para a fila principal.
- **Limite de Tentativas:** O cabeçalho da mensagem armazena a contagem de tentativas (`x-delivery-count`). Ao atingir o limite máximo de **3 tentativas**, a mensagem é definitivamente encaminhada para a Dead Letter Queue (DLQ).

### 3.2. Dead Letter Queue (DLQ) e Filas de Veneno (Poison Queues)
- **Mensagens Inválidas:** Mensagens com payloads malformatados ou erros de validação sintática (que causariam falhas determinísticas infinitas) são descartadas imediatamente com `NACK` e enviadas diretamente para a DLQ (`agent.execution.dlq`) sem passar por tentativas de retry.
- **Monitoramento e Alertas:** A presença de mensagens na DLQ dispara alertas de monitoramento urgentes de nível 1 (PagerDuty) para atuação imediata dos engenheiros de confiabilidade de site (SRE).
