# Legacy Impact: Execução Determinística e Sandboxing de Workflows (Workflow Worker)

> Identificador da feature: `004-workflow-worker`
> Data: `2026-06-03`

Este documento consolida a análise de impacto sobre a base de código e infraestrutura legada decorrente da introdução do `workflow-worker`.

## 1. Arquivos Afetados

| Arquivo afetado | Componente | Tipo | Severidade | Justificativa |
|-----------------|------------|------|------------|---------------|
| `java-core/src/main/resources/db/migration/V3__workflow_schema.sql` | Postgres RAG DB | delta-de-dados | LOW | Criação de tabelas e índices isolados para persistência das DAGs. |
| `rust-services/workflow-worker/*` | `workflow-worker` | componente-novo | LOW | Materialização do worker de execução de DAGs determinísticas em Rust. |
| `docker-compose.yml` | Orquestração Compose | regra-alterada | LOW | Injeção de variáveis de ambiente para conexão do workflow-worker. |
| `java-core/src/test/resources/features/04-workflow-execution.feature` | Suíte de Testes | regra-nova | LOW | Adição de especificações integradas Cucumber para validação. |

## 2. Diff Conceitual por Componente

* **Postgres RAG DB:** Ingestão de novas tabelas de topologia de DAG (`workflow_definitions`, `workflow_versions`, `workflow_nodes`, `workflow_edges`). Nenhuma tabela existente foi alterada ou removida, garantindo compatibilidade reversa total com os dados do legado.
* **workflow-worker:** O worker dummy original em Rust foi substituído por uma engine real assíncrona baseada no Tokio runtime que conecta ao Postgres, decodifica a topologia de DAG, executa sequencialmente os nós associados (RAG, TOOL) sob timeout de 15 segundos e publica os eventos correspondentes no broker RabbitMQ.
* **Orquestração Compose:** A configuração do compose foi enriquecida com a injeção explícita de `DATABASE_URL` e `RABBITMQ_URL` no container do `workflow-worker`.

## 3. Seção "Preservadas"

As seguintes regras de domínio descritas em `_reversa_sdd/domain.md` foram totalmente preservadas e permanecem intactas:

* **[DR01] Hierarquia de Papéis:** O controle RBAC gerenciado pela API central Spring Boot permanece sem alterações.
* **[DR02] Isolamento de Conversas:** O isolamento lógico de chats por usuário é preservado.
* **[DR03] Dimensionalidade Parametrizável de Vetores:** As definições de embeddings mantêm a compatibilidade com dimensões dinâmicas.
* **[DR04] Busca por Similaridade de Cosseno:** O índice HNSW no postgres e a busca vetorial em pgvector permanecem inalterados.
* **[DR05] Heartbeat de Ingestão:** O loop de heartbeat de 60 segundos do `ingestion-worker` permanece ativo e intocado.
* **[DR06] Monitoramento de Microsserviços:** A rota GET `/healthz` continua ativa nos microsserviços legados e foi estendida para o `workflow-worker` na porta 8000.
* **[DR07] Restrição de Entrada no Firewall:** As whitelists de host corporativo de segurança estão intactas.
* **[DR08] Isolamento de Portas de Banco de Dados:** Banco e Redis continuam isolados na rede Docker interna.

## 4. Seção "Modificadas"

Nenhuma regra de domínio existente foi modificada ou removida de forma destrutiva.
