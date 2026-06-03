# Serviços Rust, Contratos HTTP Internos

Este documento detalha os contratos e especificações das chamadas de rede que ocorrem na rede interna Docker entre o Ingestion Worker e as APIs locais Rust.

---

## 1. Document Processing API (`document-processing` na porta 8000)

### `GET /healthz`
Informa a saúde básica do serviço de extração de texto.

* **Saída (Corpo da Resposta - HTTP 200 - Text):**
```text
OK
```

### `POST /process`
*(Inferred contract)*
Recebe o arquivo físico bruto e retorna a lista de trechos de texto extraídos e divididos (chunks) prontos para vetorização.

* **Headers:** `Content-Type: multipart/form-data`
* **Input (Form-Data):**
  * `file`: Arquivo em formato binário (PDF, TXT, etc.).
* **Saída (HTTP 200 - JSON):**
```json
{
  "document_id": "e89ab157-94fa-4271-b63c-b2b2da7ef169",
  "chunks": [
    {
      "chunk_index": 0,
      "content": "Este é o conteúdo do primeiro parágrafo extraído do documento corporativo.",
      "page_number": 1
    },
    {
      "chunk_index": 1,
      "content": "Este é o conteúdo do segundo parágrafo correspondente à seção de reembolsos.",
      "page_number": 2
    }
  ]
}
```

---

## 2. Embedding Service API (`embedding-service` na porta 8000)

### `GET /healthz`
Informa a saúde básica do serviço gerador de vetores.

* **Saída (Corpo da Resposta - HTTP 200 - Text):**
```text
OK
```

### `POST /embeddings`
*(Inferred contract)*
Aceita strings e retorna os vetores numéricos gerados com a dimensionalidade correspondente ao modelo de embeddings configurado.

* **Headers:** `Content-Type: application/json`
* **Input (JSON):**
```json
{
  "texts": [
    "Este é o conteúdo do primeiro parágrafo extraído do documento corporativo.",
    "Este é o conteúdo do segundo parágrafo correspondente à seção de reembolsos."
  ]
}
```
* **Saída (HTTP 200 - JSON):**
```json
{
  "embeddings": [
    {
      "chunk_index": 0,
      "embedding": [0.0023, -0.0142, 0.3452, "... N dimensões ..."]
    },
    {
      "chunk_index": 1,
      "embedding": [-0.0125, 0.0891, 0.1223, "... N dimensões ..."]
    }
  ]
}
```
* **Códigos de Resposta:**
  * `200 OK`: Geração realizada com sucesso.
  * `502 Bad Gateway`: Erro ao contatar a API externa de LLM (OpenAI/Gemini).
