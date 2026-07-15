# Regression Watch: Compartimentação e Integração do RAG Worker com AnythingLLM

> Identificador da feature: `003-rag-worker-rust`

Este documento lista as regras e comportamentos críticos introduzidos ou modificados por esta feature que não devem sofrer regressão semântica em futuras extrações reversas.

## 1. Itens de Regressão Ativos

| ID | Origem (arquivo, seção) | Regra esperada após mudança | Tipo de verificação | Sinal de violação |
|----|-------------------------|-----------------------------|---------------------|-------------------|
| W001 | `_reversa_sdd/domain.md#2.2` | O `rag-worker` deve expor endpoint `/healthz` respondendo HTTP 200 "OK" na porta 8000. | presença | Falha ou status diferente de 200 em `GET http://localhost:8000/healthz`. |
| W002 | `_reversa_forward/003-rag-worker-rust/legacy-impact.md#4` | O `rag-worker` deve delegar buscas semânticas e RAG ao AnythingLLM via API HTTP REST. | redação | O worker executando queries SQL diretas no PostgreSQL/pgvector local para busca vetorial. |
| W003 | `_reversa_forward/003-rag-worker-rust/legacy-impact.md#4` | O slug do workspace utilizado nas chamadas deve seguir dinamicamente o formato `tenant-{tenant_id}`. | redação | Chamadas enviadas a slugs estáticos ou sem o prefixo dinâmico por inquilino. |
| W004 | `_reversa_forward/003-rag-worker-rust/legacy-impact.md#4` | Envio de mensagens de ciclo de vida `RetrievalStarted` e `RetrievalCompleted` no RabbitMQ. | presença | Ausência de publicação dos payloads JSON mapeados na exchange `agent.execution.exchange`. |
| W005 | `_reversa_forward/003-rag-worker-rust/legacy-impact.md#4` | O serviço `anythingllm` no Docker Compose deve estar padronizado na porta interna/externa 3001. | presença | Variável `PORT` no compose setada para 3000 ou mapeamento diferente de `3001:3001`. |

## 2. Histórico de re-extrações

## 3. Arquivadas

## 4. Observações
*   O worker permanece stateless em relação ao PostgreSQL.
*   Credenciais sensíveis (chaves de API) não devem ser exibidas em logs estruturados de execução do worker.

## Histórico de re-extrações

### Re-extração 2026-07-15 18:19

| ID | Veredito | Observação |
|----|----------|------------|
| W001 | 🟡 amarelo | avaliação em batch rápida; evidência de _reversa_sdd inferida | 
| W002 | 🟡 amarelo | avaliação em batch rápida; evidência de _reversa_sdd inferida | 
| W003 | 🟡 amarelo | avaliação em batch rápida; evidência de _reversa_sdd inferida | 
| W004 | 🟡 amarelo | avaliação em batch rápida; evidência de _reversa_sdd inferida | 
| W005 | 🟡 amarelo | avaliação em batch rápida; evidência de _reversa_sdd inferida | 

