# Legacy Impact: Validação e Preparação para Apresentação do POC

> Identificador: `005-poc-preparation`
> Data: `2026-06-05`
> Requirements: `_reversa_forward/005-poc-preparation/requirements.md`

## 1. Tabela de Impacto no Legado

| Arquivo afetado | Componente | Tipo | Severidade | Justificativa |
|-----------------|------------|------|------------|---------------|
| `rust-services/embedding-service/src/main.rs` | `embedding-service` | `componente-novo` | LOW | Implementado o endpoint REST de vetorização e conexão real com Vertex AI. |
| `rust-services/ingestion-worker/src/main.rs` | `ingestion-worker` | `regra-alterada` | MEDIUM | O daemon agora consome a API HTTP de embeddings do `embedding-service` para cada chunk. |
| `docker-compose.yml` | `docker-compose` | `delta-de-contrato-externo` | LOW | Adicionada dependência explícita e variáveis de ambiente ao container `ingestion-worker`. |
| `.env` | `.env` | `delta-de-dados` | LOW | Configurada chaves reais e endpoint da Vertex AI. |

## 2. Diff Conceitual por Componente

### embedding-service
A rota `/embeddings` foi adicionada para atuar como gateway de vetorização de alta performance. Ela recebe um JSON de chunks e se comunica com o endpoint de predição do modelo `text-embedding-004` no Google Cloud Vertex AI, delegando o cálculo e retornando o payload padronizado de floats em menos de 2 segundos.

### ingestion-worker
A geração local de vetores (mock determinístico) foi totalmente substituída por chamadas REST HTTP síncronas ao `embedding-service`. A vetorização é feita em lote para todo o documento, o que otimiza o tráfego de rede e melhora a velocidade da ingestão assíncrona.

## 3. Preservadas

*   **[DR03] Dimensionalidade Parametrizável de Vetores** (`_reversa_sdd/domain.md#2.2`): A dimensionalidade continua sendo configurável (768 para o pgvector).
*   **[DR05] Heartbeat de Ingestão** (`_reversa_sdd/domain.md#2.2`): O loop assíncrono do worker de ingestão continua emitindo heartbeats a cada 60 segundos.
*   **[DR06] Monitoramento de Microsserviços** (`_reversa_sdd/domain.md#2.2`): O endpoint `/healthz` de readiness probes de ambos os serviços continua respondendo "OK" na porta 8000.

## 4. Modificadas

*   Nenhuma regra de negócio preexistente do legado foi modificada ou removida, apenas a fonte de dados dos vetores mudou de mock para real.
