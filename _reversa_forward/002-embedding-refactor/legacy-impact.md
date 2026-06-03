# Legacy Impact: Compartimentação e Organização do Embedding Service

> Identificador: `002-embedding-refactor`
> Data: `2026-06-02`

## 1. Arquivos Afetados e Impacto no Legado

| Arquivo afetado | Componente | Tipo | Severidade | Justificativa |
|-----------------|------------|------|------------|---------------|
| `rust-services/embedding-service/src/main.rs` | `embedding-service` | regra-alterada | LOW | Reestruturação interna do entrypoint para uso de submódulos. |
| `rust-services/embedding-service/src/config.rs` | `embedding-service` | regra-nova | LOW | Novo módulo para parsing e gestão de variáveis de ambiente. |
| `rust-services/embedding-service/src/error.rs` | `embedding-service` | regra-nova | LOW | Novo módulo centralizado de tipagem e respostas de erro REST. |
| `rust-services/embedding-service/src/providers/` | `embedding-service` | regra-nova | LOW | Nova pasta contendo a trait do provedor e implementações separadas. |
| `rust-services/embedding-service/src/api/` | `embedding-service` | regra-nova | LOW | Nova pasta para isolar contratos JSON e handlers Axum. |
| `rust-services/embedding-service/src/tests.rs` | `embedding-service` | regra-nova | LOW | Novo arquivo para testes integrados e unitários do microsserviço. |

## 2. Diff Conceitual por Componente

### `embedding-service`
A lógica monolítica contida em `main.rs` foi segmentada em submódulos Rust idiomáticos. A comunicação HTTP REST (Axum) e o processamento de embeddings permanecem inalterados de forma a manter compatibilidade retroativa total com o `ingestion-worker`. Essa organização serve como padrão a ser replicado para os outros workers do projeto.

## 3. Preservadas

As seguintes regras do `_reversa_sdd/domain.md` permanecem ativas e intactas após esta modificação:
- **[DR03] Dimensionalidade Parametrizável de Vetores:** Mantém compatibilidade com dimensões e modelos parametrizados via variáveis de ambiente.
- **[DR06] Monitoramento de Microsserviços:** O endpoint `/healthz` responde adequadamente na porta 8000 com "OK".

## 4. Modificadas

Nenhuma regra de negócio ou técnica confirmada do legado foi alterada ou removida.
