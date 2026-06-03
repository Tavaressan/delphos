# Núcleo Java, Contratos de API REST

Documento de referência descrevendo os contratos HTTP providos pela API Central Spring Boot.

---

## 1. Endpoints de Autenticação

### `POST /api/auth/login`
Autentica o usuário e retorna o token JWT.

* **Headers:** `Content-Type: application/json`
* **Corpo da Requisição (Input):**
```json
{
  "username": "usuario1",
  "password": "senha_plana_do_usuario"
}
```
* **Corpo da Resposta (Sucesso - HTTP 200):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "type": "Bearer",
  "expires_in": 86400
}
```
* **Códigos de Resposta:**
  * `200 OK`: Autenticado com sucesso.
  * `401 Unauthorized`: Credenciais incorretas.

---

## 2. Endpoints de Documentos

### `POST /api/documents/upload`
Permite enviar um novo arquivo para processamento e indexação. Exige permissão `WRITE_DOCUMENTS`.

* **Headers:** `Authorization: Bearer <token>`, `Content-Type: multipart/form-data`
* **Corpo da Requisição (Multipart):**
  * `file`: Arquivo físico (PDF, TXT, DOCX)
* **Corpo da Resposta (Sucesso - HTTP 201):**
```json
{
  "id": "e89ab157-94fa-4271-b63c-b2b2da7ef169",
  "name": "manual_empresa.pdf",
  "file_type": "application/pdf",
  "file_size": 2048576,
  "status": "UPLOADING",
  "created_at": "2026-05-25T12:00:00Z"
}
```
* **Códigos de Resposta:**
  * `211 Created`: Registro de upload iniciado no storage e banco.
  * `403 Forbidden`: Usuário sem a permissão `WRITE_DOCUMENTS`.

### `DELETE /api/documents/{id}`
Remove um documento e seus chunks vetoriais. Exige permissão `DELETE_DOCUMENTS` (ROLE_ADMIN).

* **Headers:** `Authorization: Bearer <token>`
* **Parâmetros de Rota:** `id: UUID`
* **Códigos de Resposta:**
  * `204 No Content`: Documento removido do storage e tabelas com sucesso.
  * `403 Forbidden`: Usuário sem a permissão `DELETE_DOCUMENTS`.
  * `404 Not Found`: Documento não encontrado.

---

## 3. Endpoints de Chat

### `POST /api/chats`
Inicia uma nova sessão de conversação. Exige autenticação básica.

* **Headers:** `Authorization: Bearer <token>`, `Content-Type: application/json`
* **Corpo da Requisição:**
```json
{
  "title": "Perguntas sobre Férias"
}
```
* **Corpo da Resposta (HTTP 201):**
```json
{
  "id": "c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a99",
  "title": "Perguntas sobre Férias",
  "created_at": "2026-05-25T12:05:00Z"
}
```

### `POST /api/chats/{id}/messages`
Envia uma pergunta do usuário no chat e aciona o pipeline de recuperação RAG para gerar a resposta.

* **Headers:** `Authorization: Bearer <token>`, `Content-Type: application/json`
* **Corpo da Requisição:**
```json
{
  "content": "Qual é a política de reembolso para viagens corporativas?"
}
```
* **Corpo da Resposta (HTTP 200):**
```json
{
  "id": "d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a98",
  "role": "ASSISTANT",
  "content": "Conforme a política de viagens, o reembolso de despesas corporativas...",
  "created_at": "2026-05-25T12:05:30Z"
}
```

---

## 4. Endpoints de Logs de Auditoria

### `GET /api/audit-logs`
Lista os logs de auditoria do sistema para análise de conformidade. Exige permissão `VIEW_AUDIT_LOGS` (ROLE_ADMIN).

* **Headers:** `Authorization: Bearer <token>`
* **Corpo da Resposta (HTTP 200):**
```json
[
  {
    "id": "90eebc99-9c0b-4ef8-bb6d-6bb9bd380a55",
    "user_id": "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
    "action": "UPLOAD_DOCUMENT",
    "target": "manual_empresa.pdf",
    "ip_address": "192.168.100.15",
    "user_agent": "Mozilla/5.0 ...",
    "details": {
      "file_size": 2048576,
      "bucket": "documents"
    },
    "created_at": "2026-05-25T12:00:00Z"
  }
]
```
