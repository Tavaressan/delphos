# Onboarding: Refatoração do Embedding Service

> Identificador: `002-embedding-refactor`
> Data: `2026-06-02`

Este guia orienta o desenvolvedor ou agente a testar a feature de compartimentação do serviço de embeddings pela primeira vez.

## 1. Pré-requisitos

Certifique-se de ter instalado:
- Rust (Cargo & Rustc) versão >= 1.75
- `curl` ou qualquer cliente HTTP para testes manuais.

## 2. Passo a Passo para Compilação e Testes

Acesse o diretório do microsserviço:
```bash
cd rust-services/embedding-service
```

### Passo 2.1: Compilar o Serviço
Execute a compilação do crate em modo debug:
```bash
cargo build
```

### Passo 2.2: Executar Testes Unitários e Integrados
Execute toda a suite de testes migrada (incluindo as validações de Retry, Fallback e payload de erros):
```bash
cargo test
```
*Critério de aceitação:* Todos os testes devem passar sem falhas (`ok`).

## 3. Inicialização e Testes Locais da API

### Passo 3.1: Iniciar o Serviço com o Provedor Mock
```bash
EMBEDDING_PROVIDER=mock cargo run
```
*Saída esperada no console:*
```
Configuring Embedding Service (Primary: mock, Fallback: mock, Max Retries: 3)
Embedding Service listening on 0.0.0.0:8000
```

### Passo 3.2: Validar o Healthcheck
Com o serviço rodando, abra outro terminal e execute:
```bash
curl http://localhost:8000/healthz
```
*Resposta esperada (HTTP 200):*
```
OK
```

### Passo 3.3: Validar a Geração de Embeddings (Mock)
Execute a chamada de embeddings:
```bash
curl -i -X POST -H "Content-Type: application/json" \
  -d '{"input": ["Olá Mundo", "Refatoração Rust"]}' \
  http://localhost:8000/embeddings
```
*Resposta esperada (HTTP 200 OK + payload JSON):*
```json
{
  "object": "list",
  "data": [
    {
      "object": "embedding",
      "index": 0,
      "embedding": [...]
    },
    {
      "object": "embedding",
      "index": 1,
      "embedding": [...]
    }
  ],
  "model": "gemini-2.5-flash",
  "usage": {
    "prompt_tokens": 4,
    "total_tokens": 4
  }
}
```

### Passo 3.4: Validar Validações de Erro
Tente enviar uma lista de inputs vazia:
```bash
curl -i -X POST -H "Content-Type: application/json" \
  -d '{"input": []}' \
  http://localhost:8000/embeddings
```
*Resposta esperada (HTTP 400 Bad Request):*
```json
{
  "error": "A lista de inputs não pode estar vazia."
}
```
