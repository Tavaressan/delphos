# Legacy Impact: Embedding Service

> Identificador: `001-embedding-service`
> Data: `2026-06-02`

Este relatório descreve o impacto das alterações da feature sobre os artefatos legados mapeados na extração reversa.

## 1. Arquivos Afetados e Impacto

| Arquivo afetado | Componente | Tipo | Severidade | Justificativa |
|-----------------|------------|------|------------|---------------|
| `rust-services/embedding-service/Cargo.toml` | `embedding-service` | regra-nova | LOW | Adição de dependências (`reqwest`, `tokio-retry`, `async-trait`) para suportar a arquitetura genérica de provedores. |
| `.env` | `embedding-service` | regra-nova | LOW | Inclusão de chaves de API e strings de configuração do Vertex AI, OpenAI, Voyage e Cohere. |
| `docker-compose.yml` | `embedding-service` | regra-nova | LOW | Registro e configuração do container `embedding-service` no ambiente de orquestração local. |
| `rust-services/embedding-service/src/main.rs` | `embedding-service` | regra-nova, delta-de-contrato-externo | LOW | Substituição do esqueleto funcional por implementação real baseada em trait `EmbeddingProvider`, retry, fallback e endpoint POST `/embeddings`. |

## 2. Diff Conceitual por Componente

### `embedding-service`
- **Antes:** Esqueleto funcional em Rust/Axum contendo apenas rota de saúde `/healthz`.
- **Depois:** Microsserviço de vetorização completo com arquitetura desacoplada baseada em abstrações (`EmbeddingProvider` trait). Suporta dinamicamente provedores de API externos (Vertex AI, OpenAI, Voyage AI, Cohere) e Mock local, além de oferecer tolerância a falhas via retry exponencial com jitter e fallback automático.

## 3. Preservadas

As seguintes regras 🟢 extraídas de `_reversa_sdd/domain.md` foram totalmente preservadas no código:

* **[DR03] Dimensionalidade Parametrizável de Vetores:** Mantido o suporte a dimensões configuráveis dinamicamente via parâmetro HTTP ou configuração global.
* **[DR06] Monitoramento de Microsserviços:** O endpoint `GET /healthz` na porta 8000 continua retornando `"OK"` com status 200.

## 4. Modificadas

Nenhuma regra 🟢 de `_reversa_sdd/domain.md` foi modificada ou removida por esta feature (impacto nulo/conservativo sobre o legado existente).
