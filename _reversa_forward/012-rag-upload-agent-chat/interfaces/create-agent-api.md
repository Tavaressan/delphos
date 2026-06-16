# Contrato de API: Criação de Agente via ZIP

Este documento descreve o endpoint HTTP para criação e provisionamento de agentes personalizados a partir de um arquivo compactado ZIP.

---

## 1. Definição do Endpoint

*   **Método:** `POST`
*   **Rota:** `/api/admin/agents`
*   **Content-Type:** `multipart/form-data`
*   **Autenticação:** Requer cabeçalho `Authorization: Bearer <JWT>`
*   **Permissões Necessárias:** `MANAGE_USERS` / `ROLE_ADMIN` (Apenas administradores)

---

## 2. Parâmetros de Requisição

A requisição é enviada como `multipart/form-data`:

| Nome do Campo | Tipo | Obrigatório | Descrição |
|---------------|------|-------------|-----------|
| `name` | String | Sim | Nome único do agente (ex: compliance). |
| `description` | String | Não | Descrição curta do papel do agente. |
| `file` | Binário (File) | Sim | Arquivo compactado ZIP contendo arquivos markdown (`.md`) de instruções e demais arquivos de conhecimento. |

---

## 3. Respostas de Sucesso

### `201 Created`
Indica que o agente foi provisionado, suas instruções markdown foram salvas no PostgreSQL e os arquivos de conhecimento foram enfileirados para ingestão.

*   **Headers:** `Content-Type: application/json`
*   **Body:**
    ```json
    {
      "id": "a1f0a0d9-15d0-4bf2-9bfb-9d41d99908ff",
      "name": "compliance",
      "description": "Agente focado em segurança e conformidade de TI.",
      "system_instructions": "Você é o Agente de Compliance da empresa. Sua principal diretriz...",
      "status": "ACTIVE",
      "created_at": "2026-06-15T17:25:00Z"
    }
    ```

---

## 4. Respostas de Erro

### `400 Bad Request`
Se o arquivo ZIP estiver corrompido, não contiver um arquivo de instruções markdown (`.md`) na raiz, ou se o nome do agente já existir.

*   **Body (Exemplo: Falha de instruções):**
    ```json
    {
      "type": "https://api.alfabra.vector/errors/bad-request",
      "title": "Arquivo ZIP Inválido",
      "status": 400,
      "detail": "O arquivo ZIP deve conter pelo menos um arquivo markdown (.md) na raiz com as instruções de prompt do agente.",
      "instance": "/api/admin/agents"
    }
    ```

### `413 Payload Too Large`
Se o arquivo ZIP exceder o limite de 20MB.

*   **Body:**
    ```json
    {
      "type": "https://api.alfabra.vector/errors/payload-too-large",
      "title": "Arquivo ZIP Muito Grande",
      "status": 413,
      "detail": "O tamanho máximo do ZIP descompactado é de 20MB.",
      "instance": "/api/admin/agents"
    }
    ```

### `403 Forbidden`
Se a chamada for efetuada por um usuário sem papel `ROLE_ADMIN`.

*   **Body:**
    ```json
    {
      "type": "https://api.alfabra.vector/errors/forbidden",
      "title": "Acesso Negado",
      "status": 403,
      "detail": "Apenas administradores podem criar ou atualizar agentes.",
      "instance": "/api/admin/agents"
    }
    ```

---

## 5. Propriedades Técnicas

*   **Timeout:** 45 segundos (tempo limite para descompactação, extração, persistência relacional do agente e dos arquivos vinculados).
*   **Idempotência:** Apenas um agente com o mesmo `name` pode existir. Tentativas subsequentes devem falhar com erro de chave duplicada ou serem tratadas via atualização (PUT) em rota de alteração dedicada.
