# Estratégia de Observabilidade Distribuída

Este documento especifica os padrões de tracing, monitoramento de métricas e rastreabilidade distribuída da **Enterprise Agent Operating Platform** usando a especificação **OpenTelemetry**.

---

## 1. Rastreabilidade Distribuída (Correlation IDs)

Para mapear e correlacionar requisições em cenários assíncronos e distribuídos com múltiplos microsserviços (Spring Boot, RabbitMQ, Rust Workers e Python Workers), a plataforma adota o padrão **OpenTelemetry W3C Trace Context**:
- **Geração:** O gateway/camada Spring (`java-core`) inicia o Trace Parent e injeta o cabeçalho `traceparent` (no formato `00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01`) em qualquer mensagem publicada no RabbitMQ.
- **Propagação:** Os workers em Python (`crew-worker`) e em Rust (`workflow-worker` / `ingestion-worker`) lêem o cabeçalho da mensagem do RabbitMQ e inicializam seus contextos locais a partir do Trace ID recebido, garantindo a unificação do trace de ponta a ponta.

---

## 2. Estrutura de Spans no Ciclo de Vida do Agente

Toda execução cognitiva gera traces estruturados contendo os seguintes Spans aninhados:

```
[Span: Agent_Execution_Request] (Spring Gateway)
  └── [Span: Queue_Waiting] (RabbitMQ Latency)
        └── [Span: Crew_Execution] (Python crew-worker)
              ├── [Span: Vector_Retrieval_Ops] (Rust rag-worker)
              └── [Span: Tool_Execution_Call] (Python worker / External MCP)
```

### Detalhamento dos Atributos dos Spans:
- **`Vector_Retrieval_Ops`:** Registra o número de chunks solicitados, as dimensões dos embeddings configurados na coleção, o tempo de processamento físico de cosseno no banco e o ID do documento.
- **`Tool_Execution_Call`:** Registra o nome da ferramenta ativada, a autorização validada, o tempo de execução externa da API e possíveis códigos de erro.

---

## 3. Coleta de Métricas Operacionais

Os serviços expõem métricas estruturadas compatíveis com Prometheus/OpenTelemetry para coleta e geração de dashboards (Grafana):
- **Camada Java:** Uso de CPU, conexões ativas no pool PostgreSQL/HikariCP, mensagens publicadas e expiração de sessões no cache Redis.
- **Mensageria (RabbitMQ):** Profundidade de filas de jobs (`queue_depth`), taxa de mensagens entregues (`publish_rate`) e contagem de retornos para Dead Letter Queues (DLQ).
- **Workers Cognitivos:** Tempo médio de resposta por agente cognitivo, taxa de tokens de prompt/completion consumidos por modelo de LLM, e contagem de Pods escalados dinamicamente via KEDA.
