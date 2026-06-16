# Onboarding: Embedding Service

> Identificador: `001-embedding-service`
> Data: `2026-06-02`

Este documento descreve os passos práticos para compilar, executar e testar o `embedding-service` em ambiente de desenvolvimento local.

## 1. Variáveis de Ambiente Necessárias

Crie ou atualize o arquivo `.env` na raiz da pasta `Alfabra-Vector` com as seguintes variáveis de configuração:

```bash
# Provedor ativo de embeddings: real | mock
EMBEDDING_PROVIDER=mock

# Configuração do provedor Vertex AI (quando PROVIDER=real)
GCP_PROJECT_ID=my-gcp-project
GCP_LOCATION=us-central1
VERTEX_AI_API_KEY=my-secret-key-placeholder

# Configurações do Modelo e Dimensão
EMBEDDING_MODEL=gemini-2.5-flash
EMBEDDING_DIMENSIONS=768

# Configurações de Fallback e Resiliência
EMBEDDING_FALLBACK_PROVIDER=mock
EMBEDDING_MAX_RETRIES=3
```

## 2. Executando o Serviço Localmente (Rust)

Você pode compilar e executar o microsserviço diretamente via Cargo:

```bash
# Navegue até a pasta do serviço
cd rust-services/embedding-service

# Execute o servidor de desenvolvimento
cargo run
```

O serviço iniciará na porta `8000` (`http://localhost:8000`).

## 3. Testando via Terminal (Curl)

### 3.1. Testar Verificação de Saúde
```bash
curl http://localhost:8000/healthz
```
*Saída esperada:*
```text
OK
```

### 3.2. Testar Geração de Embeddings
Envie uma requisição de vetorização de exemplo:

```bash
curl -X POST http://localhost:8000/embeddings \
  -H "Content-Type: application/json" \
  -d '{
    "input": ["Olá Mundo"],
    "dimensions": 768
  }'
```

*Saída esperada (com o mock ativado):*
```json
{
  "object": "list",
  "data": [
    {
      "object": "embedding",
      "index": 0,
      "embedding": [0.01254, -0.04112, ..., 0.0874]
    }
  ],
  "model": "gemini-2.5-flash",
  "usage": {
    "prompt_tokens": 2,
    "total_tokens": 2
  }
}
```

### 3.3. Testar Requisição com Erro (Validação de input vazio)
```bash
curl -i -X POST http://localhost:8000/embeddings \
  -H "Content-Type: application/json" \
  -d '{
    "input": [],
    "dimensions": 768
  }'
```

*Saída esperada:*
```text
HTTP/1.1 400 Bad Request
...
"A lista de inputs não pode estar vazia."
```
