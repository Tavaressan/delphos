# Contrato de API: Chat com Agente

Este documento descreve o endpoint HTTP modificado para envio de mensagens em conversas vinculadas a um agente personalizado, ativando as regras do System Prompt e RAG isolado.

---

## 1. Definição do Endpoint

*   **Método:** `POST`
*   **Rota:** `/api/chats` (para criar nova conversa) ou `/api/chats/{chatId}/messages` (para enviar mensagem)
*   **Autenticação:** Requer cabeçalho `Authorization: Bearer <JWT>`
*   **Permissões Necessárias:** `READ_DOCUMENTS` (ROLE_USER, ROLE_ADMIN)

---

## 2. Parâmetros de Requisição

### 2.1. Criar Nova Conversa (`POST /api/chats`)

*   **Content-Type:** `application/json`
*   **Body:**
    ```json
    {
      "title": "Discussão de Regras de Senha",
      "agent_id": "a1f0a0d9-15d0-4bf2-9bfb-9d41d99908ff"
    }
    ```
    *Se `agent_id` for omitido ou nulo, cria uma conversa RAG geral.*

### 2.2. Enviar Mensagem (`POST /api/chats/{chatId}/messages`)

*   **Content-Type:** `application/json`
*   **Body:**
    ```json
    {
      "content": "Como devo compartilhar minha senha com o time?"
    }
    ```
    *A chamada recupera implicitamente o `agent_id` associado ao `chatId` no banco de dados para aplicar a filtragem RAG e injeção do System Prompt correspondente.*

---

## 3. Respostas de Sucesso

### `200 OK` (ou streaming com `text/event-stream`)
Retorna a resposta do LLM respeitando as diretrizes do agente Compliance.

*   **Headers:** `Content-Type: application/json`
*   **Body:**
    ```json
    {
      "id": "c3f0a0f9-35f0-4df2-8bfb-9d41d9990911",
      "chat_id": "d4f0a109-45f0-4ef2-9bfb-9d41d9990922",
      "role": "ASSISTANT",
      "content": "De acordo com a Regra de Segurança 101, o compartilhamento de senhas via chat ou e-mail é estritamente proibido. As credenciais são individuais e intrasferíveis.",
      "created_at": "2026-06-15T17:30:00Z"
    }
    ```

---

## 4. Respostas de Erro

### `404 Not Found`
Se o `agent_id` fornecido na criação do chat não existir no sistema.

*   **Body:**
    ```json
    {
      "type": "https://api.alfabra.vector/errors/not-found",
      "title": "Agente Não Encontrado",
      "status": 404,
      "detail": "O identificador do agente informado não existe no sistema.",
      "instance": "/api/chats"
    }
    ```

---

## 5. Propriedades Técnicas

*   **Timeout:** 60 segundos (permite latência de geração do LLM e busca vetorial combinadas).
*   **Isolamento RAG:** A API do chat fará a busca vetorial no pgvector filtrando apenas por chunks vinculados a documentos com o `agent_id` correspondente. Se o chat for geral (sem agente), filtrará apenas por `agent_id IS NULL`.
