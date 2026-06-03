# Roadmap: Compartimentação e Integração do RAG Worker com AnythingLLM

> Identificador: `003-rag-worker-rust`
> Data: `2026-06-03`
> Requirements: `_reversa_forward/003-rag-worker-rust/requirements.md`
> Confidência: 🟢 CONFIRMADO, 🟡 INFERIDO, 🔴 LACUNA

## 1. Resumo da abordagem

O `rag-worker` será desenvolvido como um serviço assíncrono modular em Rust integrado ao Cargo Workspace de `rust-services/`. Ele consumirá tarefas de recuperação contextualizada (RAG) da fila `agent.retrieval.queue` do RabbitMQ, repassará a pergunta para a API REST do AnythingLLM, e publicará as respostas e trechos (chunks) recuperados de volta na exchange de execução de agentes como eventos do ciclo de vida (`RetrievalStarted`, `RetrievalCompleted`).

O código do worker será compartimentado sob `src/` em submódulos idiomáticos Rust:
- `src/main.rs`: Inicialização e orquestração do loop de consumo.
- `src/config.rs`: Carregamento e validação de configurações ambientais (`RABBITMQ_URL`, `ANYTHINGLLM_API_KEY`, etc.).
- `src/rabbitmq.rs`: Gerenciamento de conexão com lapin, declaração de filas, consumo e publicação.
- `src/anythingllm.rs`: Cliente HTTP assíncrono (reqwest) para interação com a API de chat do AnythingLLM.
- `src/error.rs`: Tipagem de erros unificada e tratamento de falhas.

## 2. Princípios aplicados

Nenhum princípio formal definido no repositório legado `.reversa/principles.md`.

## 3. Decisões técnicas

| ID | Decisão | Justificativa | Alternativas descartadas | Confidência |
|----|---------|----------------|--------------------------|-------------|
| D-01 | Uso do driver `lapin` para RabbitMQ | Mantém a consistência de comunicação e as mesmas abstrações já implementadas no `ingestion-worker` legado. | Utilizar outros protocolos de mensageria ou clientes gRPC proprietários. | 🟢 |
| D-02 | Orquestração RAG 100% delegada ao AnythingLLM | Atende à restrição de design do usuário para usar o AnythingLLM como motor único de contexto de chat e busca vetorial de POC. | Implementar busca vetorial direta no PostgreSQL/pgvector local com cálculo de cosseno e HNSW manual em Rust. | 🟢 |
| D-03 | Mapeamento dinâmico de tenant para workspace slug | Garantir multi-tenancy convertendo `tenant_id` em slugs da API (`tenant-{tenant_id}`) nas chamadas do AnythingLLM. | Usar um único workspace global compartilhado por todos os tenants (inviável por segurança). | 🟢 |
| D-04 | Padronização na porta 3001 | Unificar o mapeamento do compose em "3001:3001" alinha as configurações internas do container com os testes de healthcheck legados. | Manter mapeamentos híbridos (3001 externo e 3000 interno) causando divergências de configuração. | 🟢 |

## 4. Premissas

Nenhuma premissa pendente, todas as dúvidas foram esclarecidas pelo usuário na sessão de `reversa-clarify`.

## 5. Delta arquitetural

| Componente | Arquivo de origem no legado | Tipo de mudança | Resumo |
|------------|------------------------------|-----------------|--------|
| `rag-worker` | `rust-services/rag-worker/src/main.rs` | componente-novo | Worker Rust esqueleto expandido para implementar consumo do RabbitMQ e orquestração HTTP com AnythingLLM. |
| `anythingllm` | `docker-compose.yml` e `docker-compose.override.yml` | contrato-alterado | Porta interna padronizada para 3001 em conformidade com o healthcheck ("3001:3001"). |

## 6. Delta no modelo de dados

- Resumo das mudanças: O `rag-worker` não insere ou gerencia tabelas no PostgreSQL do monorepo, pois toda a indexação vetorial e chats são mantidos internamente pelo AnythingLLM.
- Detalhe completo em: `_reversa_forward/003-rag-worker-rust/data-delta.md`

## 7. Delta de contratos externos

| Contrato | Tipo | Arquivo de detalhe |
|----------|------|--------------------|
| `rabbitmq-rag-jobs` | Fila | `_reversa_forward/003-rag-worker-rust/interfaces/rabbitmq-rag-jobs.md` |
| `anythingllm-api` | HTTP REST | `_reversa_forward/003-rag-worker-rust/interfaces/anythingllm-api.md` |

## 8. Plano de migração

N/A - O microsserviço é stateless em termos de migração do banco relacional.

## 9. Riscos e mitigações

| Risco | Impacto | Probabilidade | Mitigação |
|-------|---------|---------------|-----------|
| Queda da API ou travamento do AnythingLLM | alto | médio | Implementar retry exponencial (backoff de 2s a 10s) no cliente HTTP `anythingllm.rs`. |
| Falhas de conexão iniciais no RabbitMQ na subida do stack | médio | alto | Loop de retry automático na inicialização do worker (10 tentativas com intervalo de 5s). |

## 10. Critério de pronto

- [ ] Todas as ações de desenvolvimento no `actions.md` marcadas com `[X]`
- [ ] O `rag-worker` compilando e executando com sucesso no monorepo via `cargo build`
- [ ] Rota GET `/healthz` na porta 8000 respondendo status 200 HTTP "OK"
- [ ] Docker Compose modificado e inicializando o AnythingLLM na porta 3001 interna/externa
- [ ] Testes unitários do worker de mensageria e cliente HTTP passando

## 11. Histórico de alterações

| Data | Alteração | Autor |
|------|-----------|-------|
| 2026-06-03 | Versão inicial gerada por `/reversa-plan` | Reversa |
