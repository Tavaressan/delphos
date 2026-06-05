# Onboarding: Validação e Preparação para Apresentação do POC

> Identificador: `005-poc-preparation`
> Data: `2026-06-05`
> Documento principal: `_reversa_forward/005-poc-preparation/roadmap.md`

Este documento apresenta o guia executável passo-a-passo para inicialização, validação e execução dos testes no monorepo para a demonstração do POC hoje.

## 1. Configuração do Ambiente (.env)

Certifique-se de que o arquivo `.env` na raiz do projeto possui a chave de acesso do Vertex AI e o domínio do Caddy configurados:

```bash
# PostgreSQL
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=rag_db

# Vertex AI API Keys
VERTEX_AI_PROJECT_ID=<VERTEX_AI_PROJECT_ID>
VERTEX_AI_REGION=<VERTEX_AI_REGION>
VERTEX_AI_API_KEY=<VERTEX_AI_API_KEY>

# Configurações de Embedding
EMBEDDING_PROVIDER=real
EMBEDDING_MODEL=text-embedding-004
EMBEDDING_DIMENSIONS=1536
EMBEDDING_SERVICE_URL=http://embedding-service:8000/embeddings

# Caddy Domain name
DOMAIN_NAME=<DOMAIN_NAME>
DUCKDNS_TOKEN=<DUCKDNS_TOKEN>
```

## 2. Compilação e Inicialização Local

Suba os contêineres Docker afetados no monorepo para compilar o novo código Rust:

```bash
# Recompilar e subir os serviços afetados
docker compose up --build -d embedding-service ingestion-worker
```

Você também pode recompilar todo o monorepo usando o script utilitário de desenvolvimento:

```bash
./scripts/dev.sh
```

## 3. Testes Unitários e de Integração

### 3.1. Teste do Endpoint de Embeddings (Axum)
Envie um request direto para a API do `embedding-service` local para validar se a comunicação com o Vertex AI está ativa e retornando o array de 1536 floats:

```bash
curl -X POST http://localhost:8000/embeddings \
  -H "Content-Type: application/json" \
  -d '{
    "input": ["Olá Alfabra Vector"],
    "dimensions": 1536
  }'
```

*Saída esperada:*
Um JSON listando o vetor numérico com 1536 dimensões computado pelo Vertex AI.

### 3.2. Teste do Fluxo de Mensageria E2E (Fumaça)
Envie um job de execução fictício diretamente na API do `java-core` (Spring Boot) na porta 8080 para testar o enfileiramento no RabbitMQ e processamento assíncrono:

```bash
curl -X POST http://localhost:8080/api/executions \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Qual a periodicidade de manutenção dos cabos?",
    "tenantId": "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12"
  }'
```

*Saída esperada:*
```json
{
  "executionId": "...",
  "conversationId": "...",
  "status": "QUEUED",
  "prompt": "Qual a periodicidade de manutenção dos cabos?",
  "tenantId": "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12"
}
```

Verifique nos logs do container se o loop processou com sucesso o job e persistiu no banco:

```bash
docker compose logs -f ingestion-worker
```
