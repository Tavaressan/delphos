<!--
Template de corpo do actions.md
Carregado por /reversa-to-do e atualizado por /reversa-coding.

REGRAS DE PREENCHIMENTO:
- IDs estáveis: T001, T002, ..., zero-padded três dígitos. Nunca recicle.
- Marcador de paralelismo é [//] no início da linha de ID. Tarefas [//] não compartilham arquivo alvo.
- Coluna "Dependências" lista IDs separados por vírgula. Ações sem dependência usam "-".
- Status inicial é [ ]. /reversa-coding muda para [X] ao concluir.
- Toda ação precisa ser ATÔMICA: cabe num turno do agente, sem precisar de feedback humano no meio.
-->

# Actions: Embedding Service

> Identificador: `001-embedding-service`
> Data: `2026-06-02`
> Roadmap: `_reversa_forward/001-embedding-service/roadmap.md`

## Resumo

| Métrica | Valor |
|---------|-------|
| Total de ações | 12 |
| Paralelizáveis (`[//]`) | 2 |
| Maior cadeia de dependência | 6 |

## Fase 1, Preparação

<!-- Setup, scaffolding, migrações iniciais, configuração de infraestrutura local. -->

| ID | Descrição | Dependências | Paralelismo | Arquivo alvo | Confidência | Status |
|----|-----------|--------------|-------------|--------------|-------------|--------|
| T001 | Adicionar dependências (`reqwest`, `serde`, `serde_json`, `tokio-retry`, `async-trait`) no Cargo.toml do `embedding-service` | - | `[//]` | `rust-services/embedding-service/Cargo.toml` | 🟢 | `[X]` |
| T002 | Definir variáveis de ambiente no `.env` e mapeá-las no `docker-compose.yml` para configurar o container `embedding-service` | - | `[//]` | `.env`, `docker-compose.yml` | 🟢 | `[X]` |

## Fase 2, Testes

<!-- Testes que precisam existir antes ou logo após o núcleo. Omitir se a equipe não pratica TDD. -->

| ID | Descrição | Dependências | Paralelismo | Arquivo alvo | Confidência | Status |
|----|-----------|--------------|-------------|--------------|-------------|--------|
| T003 | Escrever testes unitários para a rota POST `/embeddings` validando payloads corretos e erros comuns de validação (como input vazio) | T001 | - | `rust-services/embedding-service/src/main.rs` | 🟢 | `[X]` |
| T004 | Escrever testes de integração simulando falhas de rede nas APIs externas para validar o retry exponencial e o failover para o fallback | T003 | - | `rust-services/embedding-service/src/main.rs` | 🟡 | `[X]` |

## Fase 3, Núcleo

<!-- Lógica central da feature. -->

| ID | Descrição | Dependências | Paralelismo | Arquivo alvo | Confidência | Status |
|----|-----------|--------------|-------------|--------------|-------------|--------|
| T005 | Definir a trait `EmbeddingProvider` no arquivo local, contendo a assinatura assíncrona da geração de vetores | T001 | - | `rust-services/embedding-service/src/main.rs` | 🟢 | `[X]` |
| T006 | Implementar as structs de entrada e saída correspondentes aos contratos da requisição JSON de embeddings | T001 | - | `rust-services/embedding-service/src/main.rs` | 🟢 | `[X]` |
| T007 | Implementar o provedor de embeddings Mock (simulado) utilizando hash estável para desenvolvimento offline | T005, T006 | - | `rust-services/embedding-service/src/main.rs` | 🟢 | `[X]` |
| T008 | Implementar os provedores baseados em API HTTP (`OpenAIEmbeddingProvider`, `VoyageEmbeddingProvider`, `CohereEmbeddingProvider`, `VertexAIEmbeddingProvider`) consumindo os endpoints REST externos com `reqwest` | T005, T006 | - | `rust-services/embedding-service/src/main.rs` | 🟢 | `[X]` |
| T009 | Desenvolver a lógica do orquestrador de provedores que gerencia o fluxo de retentativa exponencial com jitter e fallback automático em caso de falha | T007, T008 | - | `rust-services/embedding-service/src/main.rs` | 🟡 | `[X]` |

## Fase 4, Integração

<!-- Cola com outras partes do sistema, contratos externos, ganchos. -->

| ID | Descrição | Dependências | Paralelismo | Arquivo alvo | Confidência | Status |
|----|-----------|--------------|-------------|--------------|-------------|--------|
| T010 | Registrar a rota POST `/embeddings` no roteador Axum, instanciando o provedor correto de acordo com as variáveis de ambiente carregadas | T009 | - | `rust-services/embedding-service/src/main.rs` | 🟢 | `[X]` |

## Fase 5, Polimento

<!-- Logs, telemetria, mensagens de erro, documentação corta. -->

| ID | Descrição | Dependências | Paralelismo | Arquivo alvo | Confidência | Status |
|----|-----------|--------------|-------------|--------------|-------------|--------|
| T011 | Implementar tratamento de erros customizado traduzindo códigos de falha dos provedores em respostas REST apropriadas (400, 429, 503) | T010 | - | `rust-services/embedding-service/src/main.rs` | 🟢 | `[X]` |
| T012 | Adicionar logging estruturado registrando tempo de processamento, provedor acionado (principal ou fallback) e ocorrência de retries | T010 | - | `rust-services/embedding-service/src/main.rs` | 🟡 | `[X]` |

## Notas de execução

<!--
Reservado para /reversa-coding registrar avisos ou observações que surgiram durante a execução.
Não use isso para corrigir ações, edits manuais ficam fora desse arquivo, vão direto no código.
-->

## Histórico de alterações

| Data | Alteração | Autor |
|------|-----------|-------|
| 2026-06-02 | Versão inicial gerada por `/reversa-to-do` | Reversa |
| 2026-06-02 | Ajuste de tarefas para implementação da trait de provedores genéricos baseada na ADR | Reversa |
