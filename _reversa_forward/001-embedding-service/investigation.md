# Investigation: Embedding Service

> Identificador: `001-embedding-service`
> Data: `2026-06-02`

Este documento apresenta a análise de soluções técnicas para integração de múltiplos provedores de embeddings sob uma abstração genérica em Rust, tratamento de resiliência e suporte a mock.

## 1. Abstração `EmbeddingProvider` em Rust

Conforme definido na ADR de Estratégia de Embeddings, o serviço deve depender apenas de uma abstração de provedores. No Rust, utilizaremos uma trait assíncrona. Como o compilador Rust do Cargo Workspace suporta async fn em traits nativamente (Rust 1.75+), podemos declarar a interface diretamente:

```rust
pub trait EmbeddingProvider: Send + Sync {
    async fn embed(&self, texts: Vec<String>, dimensions: Option<usize>) -> Result<Vec<Vec<f32>>, anyhow::Error>;
}
```

Caso queiramos compatibilidade total ou suporte a Boxing dinâmico, podemos utilizar a macro `#[axum::async_trait]` (re-exportada do crate `async-trait`).

## 2. Provedores Externos via API (Reqwest)

Cada provedor concreto implementará a trait `EmbeddingProvider` e efetuará requisições HTTP via `reqwest` utilizando as API Keys configuradas nas variáveis de ambiente.

### 2.1. Google Vertex AI (Gemini 2.5 Flash)
- **Endpoint:** `https://{region}-aiplatform.googleapis.com/v1/projects/{project}/locations/{region}/publishers/google/models/{model}:predict`
- **Autenticação:** Header `Authorization: Bearer <GCP_TOKEN>` ou API Key placeholder.
- **Dimensões padrão:** 1536 (parametrizável).

### 2.2. OpenAI (`OpenAIEmbeddingProvider`)
- **Endpoint:** `https://api.openai.com/v1/embeddings`
- **Autenticação:** Header `Authorization: Bearer <OPENAI_API_KEY>`
- **Modelos:** `text-embedding-3-small` (padrão, 1536 dimensões) ou `text-embedding-3-large`.

### 2.3. Voyage AI (`VoyageEmbeddingProvider`)
- **Endpoint:** `https://api.voyageai.com/v1/embeddings`
- **Autenticação:** Header `Authorization: Bearer <VOYAGE_API_KEY>`
- **Modelos:** `voyage-3`.

### 2.4. Cohere (`CohereEmbeddingProvider`)
- **Endpoint:** `https://api.cohere.com/v1/embed`
- **Autenticação:** Header `Authorization: Bearer <COHERE_API_KEY>`
- **Modelos:** `embed-multilingual-v3.0` (1024 dimensões).

## 3. Resiliência e Tráfego com Backoff Exponencial

Para implementar a regra **RN-01 (Retry Exponencial)**, usaremos o middleware `tower-http` ou uma lógica interna com `tokio-retry` aplicada sobre a execução de `embed` de cada provedor API. 

## 4. Evolução Futura (FastEmbed)

O suporte on-premise offline utilizará a biblioteca `fastembed` para Rust (inferência local de modelos ONNX no CPU/GPU do host VM).
A trait `EmbeddingProvider` permitirá acoplar o `FastEmbedProvider` como uma implementação plugável sem alterar os handlers Axum.

```rust
pub struct FastEmbedProvider {
    model: fastembed::TextEmbedding,
}

impl EmbeddingProvider for FastEmbedProvider {
    async fn embed(&self, texts: Vec<String>, dimensions: Option<usize>) -> Result<Vec<Vec<f32>>, anyhow::Error> {
        // Realiza inferência local usando ONNX Runtime
        let embeddings = self.model.embed(texts, None)?;
        Ok(embeddings)
    }
}
```
