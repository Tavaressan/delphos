# Interface: embeddings (API REST)

> Identificador: `005-poc-preparation`
> Documento principal: `_reversa_forward/005-poc-preparation/roadmap.md`

Este documento descreve o contrato REST HTTP exposto pelo `embedding-service` na porta 8000 para vetorização de textos.

## 1. Definição do Endpoint

- **Método:** `POST`
- **Caminho:** `/embeddings`
- **Content-Type:** `application/json`
- **Aceita:** `application/json`

## 2. Request Payload (JSON)

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `input` | Array de Strings | Sim | Textos (chunks ou sentenças) a serem vetorizados. Não pode ser um array vazio. |
| `dimensions` | Inteiro | Não | Dimensionalidade desejada para a saída (default: `768`). |

### Exemplo de Request:
```json
{
  "input": ["Exemplo de texto para RAG"],
  "dimensions": 768
}
```

## 3. Response Payload (JSON)

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `object` | String | Tipo de retorno (sempre `"list"`). |
| `data` | Array | Lista contendo os objetos de embeddings individuais. |
| `data[].object` | String | Tipo de objeto individual (sempre `"embedding"`). |
| `data[].index` | Inteiro | Índice correspondente ao input de entrada (0-indexed). |
| `data[].embedding` | Array de Floats | Vetor numérico correspondente ao texto de entrada. |
| `model` | String | Modelo utilizado (e.g. `"text-embedding-004"`). |
| `usage` | Objeto | Estatísticas de tokens consumidos no request. |

### Exemplo de Response (200 OK):
```json
{
  "object": "list",
  "data": [
    {
      "object": "embedding",
      "index": 0,
      "embedding": [0.01254, -0.04112, 0.0874]
    }
  ],
  "model": "text-embedding-004",
  "usage": {
    "prompt_tokens": 6,
    "total_tokens": 6
  }
}
```

## 4. Tratamento de Erros e Códigos HTTP

- **400 Bad Request**: Retornado caso a lista `input` esteja vazia.
  - *Response:* `"A lista de inputs não pode estar vazia."`
- **500 Internal Server Error**: Retornado em caso de falhas de conexão ou autenticação de rede com a API da Vertex AI.
  - *Response:* `{"error": "Failed to send request to Vertex AI: ..."}`

## 5. Timeouts e Idempotência

- **Timeout:** 25 segundos para chamadas HTTP internas e externas.
- **Idempotência:** A chamada é estritamente idempotente e segura (operações de leitura sem efeitos colaterais no estado do sistema).
