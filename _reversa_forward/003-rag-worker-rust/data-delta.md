# Data Delta: Impacto no Modelo de Dados

> Identificador da feature: `003-rag-worker-rust`

Este documento mapeia o delta (mudanças) no modelo de dados do PostgreSQL e do cache Redis decorrentes da implementação do RAG Worker.

## 1. Banco de Dados PostgreSQL

Não existem alterações de DDL ou novos scripts Flyway necessários para o PostgreSQL do Alfabra Vector nesta feature. 

### Justificativa:
*   O `rag-worker` atua de forma puramente stateless em relação ao PostgreSQL da aplicação principal. Ele recebe a tarefa, chama o AnythingLLM e publica os resultados de volta no RabbitMQ.
*   O AnythingLLM gerencia seu próprio banco de dados interno e persistência física de vetores indexados, não exigindo modificações na tabela `document_chunks` ou `documents` do banco relacional por parte deste worker Rust.
*   Todas as queries de auditoria relacional continuam sendo geradas e salvas pela API principal do `java-core`.

## 2. Mensageria RabbitMQ

A feature introduz uma nova fila e chaves de roteamento no RabbitMQ Broker.

### Detalhe da Topologia:
*   **Fila Nova:** `agent.retrieval.queue` (Durable)
*   **Exchange Existente:** `agent.execution.exchange` (Direct)
*   **Routing Key de Entrada:** `agent.retrieval.requested`
*   **Mensagens Trafegadas:** JSON contendo os parâmetros da consulta e o contexto do agente.
