# Actions: Validação e Preparação para Apresentação do POC

> Identificador: `005-poc-preparation`
> Data: `2026-06-05`
> Roadmap: `_reversa_forward/005-poc-preparation/roadmap.md`

## Resumo

| Métrica | Valor |
|---------|-------|
| Total de ações | 7 |
| Paralelizáveis (`[//]`) | 3 |
| Maior cadeia de dependência | 4 |

## Fase 1, Preparação

| ID | Descrição | Dependências | Paralelismo | Arquivo alvo | Confidência | Status |
|----|-----------|--------------|-------------|--------------|-------------|--------|
| T001 | Configurar o arquivo `.env` local com as chaves reais de acesso do Vertex AI, modelo `text-embedding-004` e o domínio DuckDNS. | - | `[//]` | `.env` | 🟢 | `[X]` |

## Fase 2, Testes

| ID | Descrição | Dependências | Paralelismo | Arquivo alvo | Confidência | Status |
|----|-----------|--------------|-------------|--------------|-------------|--------|
| T002 | Implementar testes de integração para o endpoint `/embeddings` no `embedding-service` para cobrir o caso feliz e entrada vazia. | T001 | `[//]` | `rust-services/embedding-service/src/main.rs` | 🟢 | `[X]` |
| T003 | Criar testes unitários para a função `get_embeddings_from_service` no `ingestion-worker` cobrindo sucesso e erro do microsserviço. | T001 | `[//]` | `rust-services/ingestion-worker/src/tests.rs` | 🟢 | `[X]` |

## Fase 3, Núcleo

| ID | Descrição | Dependências | Paralelismo | Arquivo alvo | Confidência | Status |
|----|-----------|--------------|-------------|--------------|-------------|--------|
| T004 | Desenvolver o endpoint `POST /embeddings` em Axum integrando-o com o endpoint `:predict` da Vertex AI e passando a chave nos cabeçalhos. | T002 | - | `rust-services/embedding-service/src/main.rs` | 🟢 | `[X]` |
| T005 | Alterar a lógica de vetorização no `ingestion-worker` para delegar a chamada à rota `/embeddings` do `embedding-service` em lote. | T003, T004 | - | `rust-services/ingestion-worker/src/main.rs` | 🟢 | `[X]` |

## Fase 4, Integração

| ID | Descrição | Dependências | Paralelismo | Arquivo alvo | Confidência | Status |
|----|-----------|--------------|-------------|--------------|-------------|--------|
| T006 | Atualizar dependências e variáveis de rede no `docker-compose.yml` para garantir que `ingestion-worker` se comunique com o `embedding-service`. | T005 | - | `docker-compose.yml` | 🟢 | `[X]` |

## Fase 5, Polimento

| ID | Descrição | Dependências | Paralelismo | Arquivo alvo | Confidência | Status |
|----|-----------|--------------|-------------|--------------|-------------|--------|
| T007 | Validar logs de indexação em lote e garantir a ocultação de credenciais do Vertex AI e segredos em logs de erro ou saídas de depuração. | T006 | - | `rust-services/embedding-service/src/main.rs` | 🟢 | `[X]` |

## Notas de execução

- **T001-T007:** Concluídos e validados via bateria de testes locais (`cargo test`) com sucesso absoluto.

## Histórico de alterações

| Data | Alteração | Autor |
|------|-----------|-------|
| 2026-06-05 | Versão inicial gerada por `/reversa-to-do` | reversa |
| 2026-06-05 | Atualizado o status de todas as ações para concluídas (`[X]`) após implementação e testes bem-sucedidos | reversa |
