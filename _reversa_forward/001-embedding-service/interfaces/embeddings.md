# Interface: POST /embeddings

> Identificador: `001-embedding-service`
> Data: `2026-06-02`
> Protocolo: HTTP/1.1 REST JSON

Esta especificação define o contrato de API público fornecido pelo `embedding-service` para a geração de vetores.

## 1. Endpoint

```text
POST /embeddings
```

## 2. Cabeçalhos HTTP (Headers)

| Header | Valor | Obrigatório | Descrição |
|--------|-------|-------------|-----------|
| `Content-Type` | `application/json` | Sim | Tipo de conteúdo do payload |

## 3. Corpo da Requisição (Request Payload)

O corpo deve ser enviado no formato JSON contendo os seguintes campos:

```json
{
  "input": [
    "Trecho do documento a ser vetorizado",
    "Segundo trecho de texto no mesmo lote"
  ],
  "model": "gemini-2.5-flash",
  "dimensions": 1536
}
```

### Detalhamento dos Campos
* **`input`** (`array` de `string`): Lista de um ou mais blocos textuais a serem transformados em embeddings. Não pode estar vazio.
* **`model`** (`string`, *opcional*): Identificador do modelo de embedding a ser utilizado. Se omitido, usará o configurado em `EMBEDDING_MODEL`.
* **`dimensions`** (`integer`, *opcional*): Dimensionalidade final do vetor (ex: 1536). Se omitido, usará o valor padrão 1536.

## 4. Corpo da Resposta de Sucesso (Response - 200 OK)

A resposta retorna a lista de embeddings na mesma ordem informada no input da requisição.

```json
{
  "object": "list",
  "data": [
    {
      "object": "embedding",
      "index": 0,
      "embedding": [
        0.00230648,
        -0.0210084,
        0.0891456
      ]
    },
    {
      "object": "embedding",
      "index": 1,
      "embedding": [
        -0.0156821,
        0.0430121,
        -0.009214
      ]
    }
  ],
  "model": "gemini-2.5-flash",
  "usage": {
    "prompt_tokens": 14,
    "total_tokens": 14
  }
}
```

### Detalhamento dos Campos
* **`object`** (`string`): Sempre `"list"`.
* **`data`** (`array` de objetos):
  * **`object`** (`string`): Sempre `"embedding"`.
  * **`index`** (`integer`): Índice zero-indexado correspondente à posição do texto no array `input` enviado.
  * **`embedding`** (`array` de `float`): O vetor numérico normalizado de tamanho igual ao campo `dimensions`.
* **`model`** (`string`): Nome do modelo de embeddings utilizado na geração.
* **`usage`** (`object`): Dados de uso de tokenização da chamada.

## 5. Respostas de Erro

### 5.1. 400 Bad Request
Retornado quando a requisição possui campos inválidos ou a lista de input está vazia.

```json
{
  "error": "A lista de inputs não pode estar vazia."
}
```

### 5.2. 429 Too Many Requests
Retornado quando as cotas e limites da API externa do Vertex AI (ou provedor de fallback) foram atingidos e todas as tentativas internas de retentativa falharam.

```json
{
  "error": "Limite de requisições excedido no provedor de embeddings."
}
```

### 5.3. 503 Service Unavailable
Retornado quando o provedor principal e o provedor de fallback estão ambos indisponíveis.

```json
{
  "error": "Serviço de embeddings temporariamente indisponível. Falha na comunicação com os provedores."
}
```
