# Contrato de API: Listagem de Agentes

Este documento descreve o endpoint HTTP para listar os agentes disponíveis na plataforma para seleção no console de chat.

---

## 1. Definição do Endpoint

*   **Método:** `GET`
*   **Rota:** `/api/agents`
*   **Autenticação:** Requer cabeçalho `Authorization: Bearer <JWT>`
*   **Permissões Necessárias:** `READ_DOCUMENTS` (ROLE_USER, ROLE_ADMIN)

---

## 2. Parâmetros de Requisição

Nenhum parâmetro de Query String é obrigatório. Suporta parâmetros opcionais de paginação:

| Nome do Campo | Tipo | Obrigatório | Padrão | Descrição |
|---------------|------|-------------|--------|-----------|
| `page` | Integer | Não | 0 | Índice da página. |
| `size` | Integer | Não | 20 | Tamanho da página. |

---

## 3. Respostas de Sucesso

### `200 OK`
Retorna uma lista paginada com os agentes ativos e suas descrições.

*   **Headers:** `Content-Type: application/json`
*   **Body:**
    ```json
    {
      "content": [
        {
          "id": "a1f0a0d9-15d0-4bf2-9bfb-9d41d99908ff",
          "name": "compliance",
          "description": "Agente focado em segurança e conformidade de TI.",
          "status": "ACTIVE",
          "created_at": "2026-06-15T17:25:00Z"
        },
        {
          "id": "b2f0a0e9-25f0-4cf2-8bfb-9d41d9990900",
          "name": "suporte-rh",
          "description": "Agente focado em dúvidas de políticas de RH e benefícios.",
          "status": "ACTIVE",
          "created_at": "2026-06-15T18:00:00Z"
        }
      ],
      "pageable": {
        "pageNumber": 0,
        "pageSize": 20
      },
      "totalElements": 2,
      "totalPages": 1,
      "last": true
    }
    ```

---

## 4. Propriedades Técnicas

*   **Timeout:** 10 segundos.
*   **Cache:** Pode ser cacheado em Redis sob a chave `agents::list` com TTL de 5 minutos, sendo invalidado quando um novo agente for criado ou desativado.
