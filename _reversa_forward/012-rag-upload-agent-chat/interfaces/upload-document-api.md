# Contrato de API: Upload de Documentos para RAG

Este documento descreve o endpoint HTTP para upload de documentos individuais pela interface web para processamento semântico (RAG).

---

## 1. Definição do Endpoint

*   **Método:** `POST`
*   **Rota:** `/api/documents/upload`
*   **Content-Type:** `multipart/form-data`
*   **Autenticação:** Requer cabeçalho `Authorization: Bearer <JWT>`
*   **Permissões Necessárias:** `WRITE_DOCUMENTS` (ROLE_USER, ROLE_ADMIN)

---

## 2. Parâmetros de Requisição

A requisição é enviada como `multipart/form-data`:

| Nome do Campo | Tipo | Obrigatório | Descrição |
|---------------|------|-------------|-----------|
| `file` | Binário (File) | Sim | Arquivo a ser indexado (PDF, DOCX, TXT, MD) até o limite de 10MB. |

---

## 3. Respostas de Sucesso

### `202 Accepted`
Indica que o upload foi bem-sucedido, os metadados foram registrados e o arquivo foi enviado para a fila de processamento assíncrono.

*   **Headers:** `Content-Type: application/json`
*   **Body:**
    ```json
    {
      "id": "e6a0c0a9-25f0-4df2-8bfb-9d41d99908ee",
      "name": "relatorio_trimestral.pdf",
      "file_size": 2548900,
      "file_type": "application/pdf",
      "status": "PROCESSING",
      "created_at": "2026-06-15T17:20:00Z"
    }
    ```

---

## 4. Respostas de Erro

### `400 Bad Request`
Se o arquivo estiver ausente ou o formato de arquivo não for suportado pela plataforma.

*   **Body:**
    ```json
    {
      "type": "https://api.alfabra.vector/errors/bad-request",
      "title": "Formato de Arquivo Inválido",
      "status": 400,
      "detail": "Apenas arquivos PDF, DOCX, TXT e MD são suportados para processamento.",
      "instance": "/api/documents/upload"
    }
    ```

### `413 Payload Too Large`
Se o tamanho do arquivo exceder o limite de 10MB.

*   **Body:**
    ```json
    {
      "type": "https://api.alfabra.vector/errors/payload-too-large",
      "title": "Arquivo Muito Grande",
      "status": 413,
      "detail": "O tamanho máximo do arquivo de upload é de 10MB.",
      "instance": "/api/documents/upload"
    }
    ```

---

## 5. Propriedades Técnicas

*   **Timeout:** 30 segundos (tempo limite para persistência inicial no MinIO e inserção na tabela `documents`).
*   **Idempotência:** Não aplicável (envios repetidos do mesmo arquivo geram novos IDs de documentos e novas vetorizações).
