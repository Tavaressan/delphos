# Requirements: Refatoração e Compartimentação do Embedding Service

> Identificador: `002-embedding-refactor`
> Data: `2026-06-02`
> Pasta da extração reversa: `_reversa_sdd/`
> Confidência: 🟢 CONFIRMADO, 🟡 INFERIDO, 🔴 LACUNA / DÚVIDA

## 1. Resumo executivo

O objetivo desta feature é refatorar o microsserviço de embeddings (`embedding-service`), compartimentando seu código atualmente concentrado em um único arquivo (`main.rs`) em módulos Rust idiomáticos (ex: `config`, `providers`, `api`, `errors`). Essa separação melhora a manutenibilidade, testabilidade e legibilidade do código, seguindo os padrões recomendados da comunidade Rust, sem alterar o comportamento externo das APIs.

## 2. Contexto a partir do legado

As seguintes referências no `_reversa_sdd` sustentam esta feature:

| Fonte | Trecho relevante | Confidência |
|-------|------------------|-------------|
| `_reversa_sdd/architecture.md#4.-dívidas-técnicas-identificadas` | Dívida de API LLM Externa sem Fallback corrigida na feature anterior, mas concentrada em main.rs | 🟢 |
| `_reversa_sdd/domain.md#2.2.-pipeline-rag-e-processamento` | Regras [DR03], [DR04], e [DR06] definem comportamento de dimensionalidade, cosseno, e endpoint `/healthz` | 🟢 |
| `_reversa_sdd/inventory.md#3.-pontos-de-entrada-da-aplicação` | Identificação do entrypoint do `embedding-service` | 🟢 |

## 3. Personas e cenários de uso

| Persona | Objetivo | Cenário-chave |
|---------|----------|---------------|
| Desenvolvedor Backend | Manter e estender o serviço de embeddings com facilidade | Refatorar a estrutura para adicionar suporte a novos provedores sem poluir o entrypoint principal. |
| Desenvolvedor de QA | Garantir cobertura e executar testes unitários direcionados | Executar testes de falha na rede de embeddings sem precisar instanciar o servidor Axum completo. |

## 4. Regras de negócio novas ou alteradas

1. **RN-01:** Compartimentação física dos componentes em módulos Rust (`mod`) no diretório `src/`. 🟢
   - Origem no legado: N/A
   - Tipo: nova
2. **RN-02:** Preservação de comportamento e contratos REST de `/embeddings` e `/healthz`. 🟢
   - Origem no legado: `_reversa_sdd/domain.md#[DR06]`
   - Tipo: alterada
3. **RN-03:** Preservação da lógica resiliente (Retry com backoff exponencial + Fallback). 🟢
   - Origem no legado: `_reversa_sdd/architecture.md#4.-dívidas-técnicas-identificadas` (item 3)
   - Tipo: alterada

## 5. Requisitos Funcionais

| ID | Requisito | Prioridade | Critério de aceite | Confidência |
|----|-----------|------------|--------------------|-------------|
| RF-01 | Divisão em Módulos Rust | Must | O código deve ser organizado em arquivos separados: `main.rs`, `config.rs`, `providers/mod.rs` (com sub-módulos para cada provedor), `api/mod.rs` (handlers e rotas), `error.rs`. | 🟢 |
| RF-02 | Migração e Execução de Testes | Must | Todos os testes unitários e de integração existentes em `main.rs` devem ser migrados para a estrutura adequada e passar com `cargo test`. | 🟢 |
| RF-03 | Rota de Healthcheck `/healthz` | Must | O endpoint `/healthz` deve retornar "OK" e status HTTP 200. | 🟢 |
| RF-04 | Geração de Embeddings `/embeddings` | Must | O endpoint `/embeddings` deve continuar aceitando a estrutura `EmbedRequest` e retornar `EmbedResponse` conforme implementado no legado. | 🟢 |

## 6. Requisitos Não Funcionais

| Tipo | Requisito | Evidência ou justificativa | Confidência |
|------|-----------|----------------------------|-------------|
| Legibilidade | Organização segundo práticas idiomáticas de Rust | Modularização facilita leitura por novos membros da equipe. | 🟢 |
| Manutenibilidade | Semântica de imports limpa | Uso de `pub use` ou imports explícitos evita repetição de caminhos longos. | 🟢 |
| Robustez | Manter a resiliência original | A lógica de retry exponencial com jitter e fallback automático deve permanecer intacta. | 🟢 |

## 7. Critérios de Aceitação

```gherkin
Cenário: Inicialização bem-sucedida do servidor e healthcheck
  Dado que o embedding-service foi compilado e inicializado com sucesso
  Quando uma requisição GET para "/healthz" é feita
  Então o status da resposta deve ser 200 OK
  E o corpo da resposta deve ser "OK"

Cenário: Geração de embeddings com provedor Mock
  Dado que o embedding-service está ativo e configurado com EMBEDDING_PROVIDER="mock"
  Quando uma requisição POST para "/embeddings" com input ["Olá Mundo"] é realizada
  Então o status da resposta deve ser 200 OK
  E deve retornar o payload JSON estruturado contendo a lista de vetores normalizados
```

## 8. Prioridade MoSCoW

| Item | MoSCoW | Justificativa |
|------|--------|---------------|
| RF-01 | Must | Core da refatoração. |
| RF-02 | Must | Garante que nenhuma regressão foi introduzida. |
| RF-03 | Must | Requisito de monitoramento de infraestrutura. |
| RF-04 | Must | Contrato da API utilizado pelo `ingestion-worker`. |

## 9. Esclarecimentos

### Sessão 2026-06-02

- **Q:** Devemos criar um crate de biblioteca interna ou usar a estrutura padrão de módulos de um binário (`main.rs` + `mod`)?
  **R:** Vamos usar a estrutura de módulos em Rust, e isso para todos os workers em Rust, não somente o embedding-service.
- **Q:** Existem novos provedores que devem ser adicionados nesta refatoração ou nos limitamos aos existentes (Mock, OpenAI, Voyage, Cohere, Vertex AI)?
  **R:** Por agora sem novos provedores de IA, nossa primeira implementação/foco será do VertexAI.

## 10. Lacunas

Nenhuma lacuna pendente.

## 11. Histórico de alterações

| Data | Alteração | Autor |
|------|-----------|-------|
| 2026-06-02 | Versão inicial gerada por `/reversa-requirements` | Reversa |
| 2026-06-02 | Esclarecimento de dúvidas sobre estrutura de módulos e provedores por `/reversa-clarify` | Reversa |
