# Investigation: Vertex AI Integration for Embeddings

> Identificador: `005-poc-preparation`
> Data: `2026-06-05`
> Documento principal: `_reversa_forward/005-poc-preparation/roadmap.md`

Este documento detalha o estudo técnico da API da Vertex AI para cálculo de embeddings vetoriais com o modelo `text-embedding-004` e sua integração com o ecossistema local do monorepo.

## 1. Chamadas REST da Vertex AI

Para obter vetores com o modelo `text-embedding-004` no Google Cloud Vertex AI, é necessário efetuar um request POST para o seguinte endpoint:

```
POST https://{region}-aiplatform.googleapis.com/v1/projects/{project}/locations/{region}/publishers/google/models/text-embedding-004:predict
```

### 1.1. Estrutura do Request Body (JSON)

O payload aceito exige um array de `instances` contendo o conteúdo de texto, e um objeto `parameters` opcional onde definimos a dimensionalidade de saída:

```json
{
  "instances": [
    {
      "content": "Texto para obter o vetor de representação semântica."
    }
  ],
  "parameters": {
    "outputDimensionality": 1536
  }
}
```

### 1.2. Estrutura do Response Body (JSON)

O retorno da predição traz a chave `predictions`, contendo os vetores numéricos de floats dentro do campo `values` de cada embedding:

```json
{
  "predictions": [
    {
      "embeddings": {
        "values": [
          0.002431,
          -0.015234,
          0.084321
        ]
      }
    }
  ]
}
```

## 2. Autenticação via API Key no Vertex AI Developer API

Geralmente, o Vertex AI no Google Cloud exige tokens OAuth 2.0 (Bearer) obtidos via Service Account. Porém, a Google Cloud Developer API de IA permite o uso de chaves de API restritas (`x-goog-api-key`) para fins de exploração rápida e POCs.
Para garantir o máximo de robustez na requisição em Rust, o `embedding-service` envia o token de autenticação em dois locais:
1. No header `x-goog-api-key`
2. No header `Authorization: Bearer <API_KEY>`

Isso garante que o roteamento de rede aceite a chave independentemente da variação de cabeçalhos do Gateway configurado na GCP.

## 3. Alternativas avaliadas e descartadas

- **Chamada ao Google AI Studio (generativelanguage.googleapis.com)**: Descartada, pois o usuário explicitou o uso do ecossistema Vertex AI com o modelo `text-embedding-004` no endpoint `:predict`.
- **Inferência Local com FastEmbed / ONNX**: Descartado para priorizar a demonstração dos provedores de IA integrados à plataforma real no POC hoje.
