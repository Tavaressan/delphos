# Serviços Rust, Tarefas de Implementação

## Pré-requisitos
- [ ] Toolchain Rust atualizada (Cargo/rustc).
- [ ] Servidor MinIO/S3 online e credenciais providenciadas.
- [ ] Banco de Dados PostgreSQL configurado via Pool (com pgvector disponível).

## Tarefas

- [ ] T-01, Inicializar Cargo Workspace com os 4 pacotes (`ingestion`, `rag`, `workflow`, `embedding`).
  - Origem no legado: `rust-services/Cargo.toml`
  - Critério de pronto: Builds de `cargo check` devem passar na raiz e em isolado.
  - Confiança: 🟢

- [ ] T-02, Implementar `embedding-service` (API Axum).
  - Origem no legado: Sub-projeto `embedding-service`
  - Critério de pronto: Servidor HTTP exposto que recebe JSON genérico e devolve Array Float usando API do Google, suportando fallbacks.
  - Confiança: 🟢

- [ ] T-03, Lógica Core do `ingestion-worker`.
  - Origem no legado: Filas AMQP em `rust-services/ingestion-worker`
  - Critério de pronto: Parsing assíncrono. Consumo atômico da Fila. Apaga records pre-existentes do Document (Delete transacional) e grava chunks + vetores em batch.
  - Confiança: 🟢

- [ ] T-04, Implementar Motor de RAG HNSW no `rag-worker`.
  - Origem no legado: SQL Query nativa em `rust-services/rag-worker`
  - Critério de pronto: Consulta vetor usando `<=>` limitando pelos `RAG_TOP_K` definidos na env. Retorna strings formatadas para compor o System Prompt do Agente.
  - Confiança: 🟢

- [ ] T-05, Loop secundário Heartbeat Reaper.
  - Origem no legado: `rust-services/ingestion-worker/reaper.rs` (Inferido logicamente)
  - Critério de pronto: Monitorar na base via query periódica jobs com mais de 15 minutos em andamento para marcar falha total e liberar fila.
  - Confiança: 🟢

## Tarefas de Teste

- [ ] TT-01, Teste unitário de Mock do Embedding Service (bypassando HTTP real e forçando geração hash matemática de embedding) (variável `EMBEDDING_PROVIDER=mock`).
- [ ] TT-02, Forjar documento PDF corrompido em teste end-to-end e garantir que o message rejection incrementa a contagem de entrega do RabbitMQ.
- [ ] TT-03, Testar transação atômica do ingestor: falhar no meio do Batch Insert para verificar se o Delete anterior da transação também sofre rollback corretamente (sem lixo no banco).

## Ordem Sugerida
1. T-01 (Workspace Core)
2. T-02 (Embedding Service - Dependência dos demais)
3. T-03 e T-04 (Os consumidores RabbitMQ reais)
4. T-05 (Resiliência)

## Lacunas Pendentes (🔴)
- A implementação do `workflow-worker` (Engine DAG - PR #308) tem baixa confiança, necessita leitura aprofundada dos modelos JSON e como o Grafo é enfileirado para ser reimplementado corretamente.
