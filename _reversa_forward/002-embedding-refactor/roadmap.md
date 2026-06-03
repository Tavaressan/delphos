# Roadmap: Compartimentação e Organização do Embedding Service

> Identificador: `002-embedding-refactor`
> Data: `2026-06-02`
> Requirements: `_reversa_forward/002-embedding-refactor/requirements.md`
> Confidência: 🟢 CONFIRMADO, 🟡 INFERIDO, 🔴 LACUNA

## 1. Resumo da abordagem

A refatoração dividirá o atual monólito `main.rs` do `embedding-service` em múltiplos arquivos de módulo Rust organizados sob `src/`. Essa estrutura servirá como padrão arquitetural e de design para todos os demais workers Rust do projeto (`document-processing` e `ingestion-worker`).

A estrutura proposta para o `embedding-service` será:
- `src/main.rs`: Entrypoint do binário, inicialização de logs e do servidor HTTP Axum.
- `src/config.rs`: Estrutura de configuração que carrega e valida variáveis de ambiente do serviço.
- `src/providers/mod.rs`: Definição da trait `EmbeddingProvider` e exportação dos provedores.
- `src/providers/mock.rs`: Provedor Mock de hash estável para testes.
- `src/providers/openai.rs`: Integração de embeddings da OpenAI.
- `src/providers/voyage.rs`: Integração de embeddings da Voyage.
- `src/providers/cohere.rs`: Integração de embeddings da Cohere.
- `src/providers/vertex_ai.rs`: Integração de embeddings do Google Vertex AI e AI Studio.
- `src/providers/resilient.rs`: Lógica do orquestrador resiliente com Retry exponencial e Fallback.
- `src/api/mod.rs`: Configuração do Axum Router e rotas (`/healthz`, `/embeddings`).
- `src/api/handlers.rs`: Handlers HTTP e lógica de serialização/tratamento de requests.
- `src/api/contracts.rs`: Structs de Request/Response de embeddings.
- `src/error.rs`: Tipagem de erro do serviço e conversão para status codes e payloads REST.

Os testes de integração e unitários existentes serão migrados para um arquivo dedicado `src/tests.rs` (ou mantidos dentro de módulos de teste específicos em cada arquivo/módulo correspondente).

## 2. Princípios aplicados

Nenhum princípio formal definido no repositório legado `.reversa/principles.md` aplicável à refatoração.

## 3. Decisões técnicas

| ID | Decisão | Justificativa | Alternativas descartadas | Confidência |
|----|---------|----------------|--------------------------|-------------|
| D-01 | Organização estrutural em arquivos de submódulos | Padrão idiomático recomendado para manter arquivos menores de 200 linhas e alta manutenibilidade. | Manter tudo em `main.rs` ou dividir em crates/bibliotecas locais via cargo workspace (descartado por complexidade de dependências internas). | 🟢 |
| D-02 | Estrutura modular padronizada para todos os workers | Garantir consistência estrutural em todo o monorepo Rust (`rust-services/`). | Deixar cada worker com arquiteturas diferentes. | 🟢 |
| D-03 | Prioridade na validação com Vertex AI | Foco na primeira implementação real ativa do RAG definida pelo usuário. | Priorizar OpenAI ou Voyage no pipeline inicial. | 🟢 |

## 4. Premissas

Nenhuma premissa pendente, todas as dúvidas foram esclarecidas pelo usuário.

## 5. Delta arquitetural

| Componente | Arquivo de origem no legado | Tipo de mudança | Resumo |
|------------|------------------------------|-----------------|--------|
| `embedding-service` | `rust-services/embedding-service/src/main.rs` | regra-alterada | Reorganização estrutural em submódulos Rust sem alterar o comportamento ou contratos HTTP externos. |

## 6. Delta no modelo de dados

- Resumo das mudanças: Sem alterações no modelo de dados (PostgreSQL/pgvector ou Redis). A refatoração é puramente de código interno.
- Detalhe completo em: `_reversa_forward/002-embedding-refactor/data-delta.md`

## 7. Delta de contratos externos

Não há alterações de contratos de API REST externa (`/healthz` ou `/embeddings`).

## 8. Plano de migração

N/A - Não há migração de banco de dados ou alteração de estado persistido.

## 9. Riscos e mitigações

| Risco | Impacto | Probabilidade | Mitigação |
|-------|---------|---------------|-----------|
| Regressão lógica de Retry / Fallback | alto | baixo | Validar rigorosamente a migração através da execução dos testes unitários e de integração (`cargo test`). |
| Quebras de compilação por imports cíclicos | médio | baixo | Seguir o padrão de visibilidade (`pub`) e exportação estruturada no módulo de `providers`. |

## 10. Critério de pronto

- [ ] Todas as ações de compartimentação no `actions.md` marcadas `[X]`
- [ ] O projeto `embedding-service` compilando com sucesso via `cargo build`
- [ ] Todos os 5 testes existentes e novos rodando e passando via `cargo test`
- [ ] Readiness check no endpoint `/healthz` retornando "OK"
- [ ] Estrutura do `document-processing` mapeada para futuro alinhamento modular

## 11. Histórico de alterações

| Data | Alteração | Autor |
|------|-----------|-------|
| 2026-06-02 | Versão inicial gerada por `/reversa-plan` | Reversa |
