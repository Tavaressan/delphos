# Especificação da API REST - Alfabra Vector

Este documento descreve os novos contratos de API adicionados para suporte a múltiplos agentes isolados por RAG, uploads de ZIP de administração e upload de documentos gerais.

---

## 1. Agentes (Administração e Consulta)

### 1.1 Criar Agente (Admin)
Cadastra um novo agente cognitivo enviando suas diretrizes principais em formato markdown compactadas em um arquivo ZIP. O ZIP pode conter PDFs, TXTs ou DOCXs com conhecimento adicional que será automaticamente descompactado, salvo no MinIO e enfileirado para indexação RAG.

* **URL:** `/api/admin/agents`
* **Método:** `POST`
* **Content-Type:** `multipart/form-data`
* **Parâmetros de Formulário (Form Data):**
  * `name` (String, Obrigatório): Nome amigável do agente (ex: "Agente de Vendas").
  * `file` (MultipartFile/File, Obrigatório): Arquivo ZIP com pelo menos um arquivo `.md` na raiz contendo diretrizes do sistema.
  * `tenantId` (UUID, Opcional): ID do tenant para isolamento multi-tenant (padrão: `00000000-0000-0000-0000-000000000000`).

* **Resposta de Sucesso (200 OK):**
  ```json
  {
    "id": "e44d59f7-640a-42c2-8408-9cb55877c8e2",
    "name": "Agente de Compliance",
    "systemInstructions": "# Diretrizes de Compliance\nVocê é...",
    "zipPath": "agents-data/agent-e44d59f7-640a-42c2-8408-9cb55877c8e2/agent.zip",
    "tenantId": "00000000-0000-0000-0000-000000000000"
  }
  ```

* **Respostas de Erro:**
  * **400 Bad Request:** Se o ZIP for inválido, ultrapassar 20MB de tamanho total descompactado, ou se não possuir nenhum arquivo `.md` na raiz.
    ```json
    {
      "error": "O arquivo ZIP deve conter pelo menos um arquivo '.md' na raiz com as diretrizes de comportamento."
    }
    ```

---

### 1.2 Listar Agentes
Retorna todos os agentes cadastrados para um determinado tenant.

* **URL:** `/api/agents`
* **Método:** `GET`
* **Query Params:**
  * `tenantId` (UUID, Opcional): ID do tenant (padrão: `00000000-0000-0000-0000-000000000000`).

* **Resposta de Sucesso (200 OK):**
  ```json
  [
    {
      "id": "e44d59f7-640a-42c2-8408-9cb55877c8e2",
      "tenantId": "00000000-0000-0000-0000-000000000000",
      "name": "Agente de Compliance",
      "systemInstructions": "# Diretrizes de Compliance...",
      "zipPath": "agents-data/agent-e44d59f7-640a-42c2-8408-9cb55877c8e2/agent.zip",
      "createdAt": "2026-06-16T12:55:00Z",
      "updatedAt": "2026-06-16T12:55:00Z"
    }
  ]
  ```

---

## 2. Ingestão de Documentos (RAG)

### 2.1 Upload de Documento Individual
Permite aos usuários fazer upload de arquivos gerais de conhecimento (PDF, DOCX, TXT, MD) para o banco vetorial, com vinculação opcional a um agente específico.

* **URL:** `/api/documents/upload`
* **Método:** `POST`
* **Content-Type:** `multipart/form-data`
* **Parâmetros de Formulário (Form Data):**
  * `file` (MultipartFile/File, Obrigatório): Arquivo contendo o documento.
  * `agentId` (UUID, Opcional): ID do agente associado ao documento para isolamento de RAG.
  * `tenantId` (UUID, Opcional): ID do tenant para isolamento multi-tenant (padrão: `00000000-0000-0000-0000-000000000000`).

* **Resposta de Sucesso (200 OK):**
  ```json
  {
    "id": "c1f7b889-cb87-4328-971a-2895dbef92a8",
    "name": "relatorio_compliance_2026.pdf",
    "status": "PROCESSING",
    "agentId": "e44d59f7-640a-42c2-8408-9cb55877c8e2",
    "tenantId": "00000000-0000-0000-0000-000000000000"
  }
  ```

---

### 2.2 Listar Documentos
Lista todos os documentos salvos e o status de processamento da ingestão RAG.

* **URL:** `/api/documents`
* **Método:** `GET`
* **Query Params:**
  * `tenantId` (UUID, Opcional): ID do tenant.

* **Resposta de Sucesso (200 OK):**
  ```json
  [
    {
      "id": "c1f7b889-cb87-4328-971a-2895dbef92a8",
      "name": "relatorio_compliance_2026.pdf",
      "filePath": "documents/c1f7b889-cb87-4328-971a-2895dbef92a8/relatorio_compliance_2026.pdf",
      "fileSize": 154238,
      "fileType": "pdf",
      "status": "INDEXED",
      "processingError": null,
      "tenantId": "00000000-0000-0000-0000-000000000000",
      "createdAt": "2026-06-16T12:56:00Z",
      "updatedAt": "2026-06-16T12:56:30Z"
    }
  ]
  ```

---

## 3. Conversas e Histórico (Chats)

### 3.1 Criar Conversa (Chat)
Inicia uma nova conversa na plataforma vinculada de forma exclusiva a um agente e tenant.

* **URL:** `/api/chats`
* **Método:** `POST`
* **Content-Type:** `application/json`
* **Body (JSON):**
  ```json
  {
    "title": "Minha Consulta de Compliance",
    "agentId": "e44d59f7-640a-42c2-8408-9cb55877c8e2",
    "tenantId": "00000000-0000-0000-0000-000000000000"
  }
  ```

* **Resposta de Sucesso (200 OK):**
  ```json
  {
    "id": "d1e2b5c4-b5a6-7988-9766-554433221100",
    "title": "Minha Consulta de Compliance",
    "tenantId": "00000000-0000-0000-0000-000000000000",
    "createdAt": "2026-06-16T12:58:00Z",
    "updatedAt": "2026-06-16T12:58:00Z"
  }
  ```

---

### 3.2 Listar Mensagens da Conversa
Busca o histórico completo de mensagens de uma conversa.

* **URL:** `/api/chats/{id}/messages`
* **Método:** `GET`

* **Resposta de Sucesso (200 OK):**
  ```json
  [
    {
      "id": "e1f2a3b4-c5d6-7a8b-9c0d-1e2f3a4b5c6d",
      "authorRole": "USER",
      "content": "Qual a periodicidade de manutenção dos cabos?",
      "createdAt": "2026-06-16T12:58:10Z"
    },
    {
      "id": "f1f2a3b4-c5d6-7a8b-9c0d-1e2f3a4b5c6d",
      "authorRole": "ASSISTANT",
      "content": "Manutenções devem ocorrer mensalmente (a cada 30 dias)...",
      "createdAt": "2026-06-16T12:58:20Z"
    }
  ]
  ```
