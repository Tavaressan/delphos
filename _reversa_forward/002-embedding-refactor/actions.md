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

# Actions: Compartimentação e Organização do Embedding Service

> Identificador: `002-embedding-refactor`
> Data: `2026-06-02`
> Roadmap: `_reversa_forward/002-embedding-refactor/roadmap.md`

## Resumo

| Métrica | Valor |
|---------|-------|
| Total de ações | 12 |
| Paralelizáveis (`[//]`) | 4 |
| Maior cadeia de dependência | 5 |

## Fase 1, Preparação

<!-- Setup, scaffolding, migrações iniciais, configuração de infraestrutura local. -->

| ID | Descrição | Dependências | Paralelismo | Arquivo alvo | Confidência | Status |
|----|-----------|--------------|-------------|--------------|-------------|--------|
| T001 | Criar a estrutura física dos novos arquivos e subdiretórios sob `rust-services/embedding-service/src/` | - | - | `rust-services/embedding-service/src/` | 🟢 | `[X]` |
| T002 | Migrar a lógica de configurações ambientais e variáveis de ambiente de `main.rs` para `config.rs` | T001 | - | `rust-services/embedding-service/src/config.rs` | 🟢 | `[X]` |

## Fase 2, Testes

<!-- Testes que precisam existir antes ou logo após o núcleo. Omitir se a equipe não pratica TDD. -->

| ID | Descrição | Dependências | Paralelismo | Arquivo alvo | Confidência | Status |
|----|-----------|--------------|-------------|--------------|-------------|--------|
| T003 | Migrar e estruturar os 5 testes existentes de `main.rs` para um módulo de testes dedicado em `src/tests.rs` | T001 | - | `rust-services/embedding-service/src/tests.rs` | 🟢 | `[X]` |

## Fase 3, Núcleo

<!-- Lógica central da feature. -->

| ID | Descrição | Dependências | Paralelismo | Arquivo alvo | Confidência | Status |
|----|-----------|--------------|-------------|--------------|-------------|--------|
| T004 | Migrar a trait `EmbeddingProvider` e gerenciar sua exportação em `src/providers/mod.rs` | T001 | - | `rust-services/embedding-service/src/providers/mod.rs` | 🟢 | `[X]` |
| T005 | Migrar a implementação de `MockEmbeddingProvider` e a lógica de geração de hashes para `src/providers/mock.rs` | T004 | `[//]` | `rust-services/embedding-service/src/providers/mock.rs` | 🟢 | `[X]` |
| T006 | Migrar os provedores de APIs externas (`OpenAIEmbeddingProvider`, `VoyageEmbeddingProvider`, `CohereEmbeddingProvider`, `VertexAIEmbeddingProvider`) para arquivos separados sob `src/providers/` | T004 | `[//]` | `rust-services/embedding-service/src/providers/` | 🟢 | `[X]` |
| T007 | Migrar o orquestrador `ResilientEmbeddingProvider` (lógica de retry e fallback) para `src/providers/resilient.rs` | T004 | `[//]` | `rust-services/embedding-service/src/providers/resilient.rs` | 🟢 | `[X]` |
| T008 | Migrar a tipagem de erros da API e conversão para Axum Response para `src/error.rs` | T001 | - | `rust-services/embedding-service/src/error.rs` | 🟢 | `[X]` |

## Fase 4, Integração

<!-- Cola com outras partes do sistema, contratos externos, ganchos. -->

| ID | Descrição | Dependências | Paralelismo | Arquivo alvo | Confidência | Status |
|----|-----------|--------------|-------------|--------------|-------------|--------|
| T009 | Migrar structs de contratos e DTOs (`EmbedRequest`, `EmbedResponse`, etc.) para `src/api/contracts.rs` | T001 | `[//]` | `rust-services/embedding-service/src/api/contracts.rs` | 🟢 | `[X]` |
| T010 | Migrar o handler HTTP Axum `handle_embeddings` para `src/api/handlers.rs` | T008, T009, T004 | - | `rust-services/embedding-service/src/api/handlers.rs` | 🟢 | `[X]` |
| T011 | Configurar o roteador Axum e o setup da rota no `src/api/mod.rs` | T010 | - | `rust-services/embedding-service/src/api/mod.rs` | 🟢 | `[X]` |
| T012 | Atualizar o ponto de entrada `src/main.rs` para carregar todos os submódulos, inicializar o AppState e escutar na porta 8000 | T002, T011, T007, T003 | - | `rust-services/embedding-service/src/main.rs` | 🟢 | `[X]` |

## Notas de execução

<!--
Reservado para /reversa-coding registrar avisos ou observações que surgiram durante a execução.
Não use isso para corrigir ações, edits manuais ficam fora desse arquivo, vão direto no código.
-->

## Histórico de alterações

| Data | Alteração | Autor |
|------|-----------|-------|
| 2026-06-02 | Versão inicial gerada por `/reversa-to-do` | Reversa |
| 2026-06-02 | Todas as ações executadas e concluídas com sucesso | Reversa |
