# Rust Services, Tarefas de Implementação

> Template do arquivo `tasks.md`. Foca em uma sequência de tarefas executáveis para reimplementar a unit a partir do legado, com rastreabilidade ao código original.

## Pré-requisitos
- [ ] Banco Postgres 15+ com extensão `pgvector` instalada localmente (Docker).

## Tarefas

- [ ] T-01, Setup Cargo Workspace e Dependências
  - Origem no legado: Configs globais inferidas.
  - Critério de pronto: Workspace possuir dependências `tokio`, `sqlx`, `lapin` (ou amqprs) e `axum`.
  - Confiança: 🟢

- [ ] T-02, Implementar Endpoint Axum Healthcheck
  - Origem no legado: Probe para k8s.
  - Critério de pronto: `GET /healthz` retorna `200 OK`.
  - Confiança: 🟢

- [ ] T-03, Query PGVector (`retrieval.rs`)
  - Origem no legado: `rust-services/rag-worker/src/retrieval.rs`
  - Critério de pronto: Função executando query crua com `$1::vector`, filtrando de fato `tenant_id` e ordenando por similaridade.
  - Confiança: 🟢

- [ ] T-04, Sanitização e Roteamento Rabbit
  - Origem no legado: `rust-services/rag-worker/src/main.rs`
  - Critério de pronto: Função Worker descarregando eventos consumidos e devolvendo strings limpas (`escape_chunk_content`) nas filas de resposta.
  - Confiança: 🟢

## Tarefas de Teste
- [ ] TT-01, Inserir Vetor Simulado no DB usando sqlx teste.
- [ ] TT-02, Validar a busca do K-NN (Cosseno) retornando o chunk correto (com limit e distância correta).

## Ordem Sugerida
1. Workspace (T-01) e Healthcheck (T-02).
2. Camada Lógica SQLX / Banco (T-03).
3. Consumer/Producer MQ (T-04).

## Lacunas Pendentes (🔴)
O `workflow-worker` e o `rag-worker` são instanciados em containers diferentes (o repositório é todo containerizado), garantindo isolamento de recursos.
