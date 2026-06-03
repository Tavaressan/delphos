# Interface de Contrato: AnythingLLM API

> Identificador: `003-rag-worker-rust`
> Contrato: `anythingllm-api`
> Tipo: HTTP REST API Client

Este documento especifica a interface de comunicação síncrona HTTP REST do cliente `rag-worker` com o servidor AnythingLLM.

## 1. Endpoints Utilizados

*   **URL Base:** `http://anythingllm:3001/api/v1` (Resoluções de DNS internas na rede Docker)
*   **Path:** `/workspace/{slug}/chat`
*   **Método:** `POST`

### 1.1. Mapeamento de Workspace Slug
O `{slug}` na URL será gerado de forma dinâmica a partir do `tenant_id` recebido no RabbitMQ:
`slug = format!("tenant-{}", tenant_id)`

## 2. Estrutura de Payload e Headers

### 2.1. Cabeçalhos HTTP
```http
Authorization: Bearer <ANYTHINGLLM_API_KEY>
Content-Type: application/json
Accept: application/json
```

### 2.2. Payload de Requisição (Request JSON)
```json
{
  "message": "pergunta do usuário",
  "mode": "query"
}
```

### 2.3. Payload de Resposta de Sucesso (Response JSON)
O payload retornado pelo AnythingLLM contém o resultado textual gerado e os trechos de documentos (fontes) associados.

```json
{
  "success": true,
  "error": null,
  "text": "O prazo de validade das chaves de segurança é de 12 meses...",
  "sources": [
    {
      "id": "doc-uuid-or-number",
      "text": "Validade de Chaves: Todas as chaves corporativas e segredos de produção devem ser rotacionados anualmente...",
      "score": 0.942
    }
  ]
}
```

## 3. Tratamento de Erros e Timeouts

- **Timeout do Cliente HTTP:** Configurado rigidamente em 25 segundos para evitar travamento de recursos no loop Tokio.
- **Tratamento de Status HTTP:**
  - `401 Unauthorized`: API Key inválida ou ausente. Abortar e registrar erro crítico.
  - `404 Not Found`: Workspace/Tenant inexistente. Registrar erro, publicar `AgentExecutionFailed` e enviar `NACK` sem reenfileiramento.
  - `5xx Server Error`: Erro no backend do AnythingLLM ou queda de LLM externa. Efetuar retentativa exponencial.
