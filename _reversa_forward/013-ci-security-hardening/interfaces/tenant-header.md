# HTTP Interface Contract: X-Tenant-ID Header

Este documento especifica o contrato do cabeçalho customizado HTTP `X-Tenant-ID` utilizado no isolamento multi-tenant da plataforma durante a fase de desenvolvimento.

---

## 1. Definição do Cabeçalho

*   **Nome do Header:** `X-Tenant-ID`
*   **Formato de Valor:** String UUID v4 válida (36 caracteres, hexadecimal separado por hífens, ex: `a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01`).
*   **Obrigatoriedade:** Obrigatório em todas as requisições direcionadas para endpoints sob `/api/**` da API Central (`java-core`) e dos microsserviços do RAG Pipeline.

---

## 2. Comportamentos de Erro

### 2.1. Ausência de Cabeçalho
Quando uma chamada à API sob `/api/**` for realizada sem o cabeçalho `X-Tenant-ID`.

*   **Status HTTP:** `400 Bad Request`
*   **Corpo da Resposta (JSON):**
```json
{
  "timestamp": "2026-06-16T13:51:00Z",
  "status": 400,
  "error": "Bad Request",
  "message": "Header X-Tenant-ID is required for development multi-tenancy testing",
  "path": "/api/documents"
}
```

### 2.2. Valor Malformatado
Quando o cabeçalho for enviado, mas não corresponder a um UUID estruturado.

*   **Status HTTP:** `400 Bad Request`
*   **Corpo da Resposta (JSON):**
```json
{
  "timestamp": "2026-06-16T13:51:00Z",
  "status": 400,
  "error": "Bad Request",
  "message": "Invalid X-Tenant-ID UUID format",
  "path": "/api/documents"
}
```

### 2.3. Divergência de Escopo (Acesso Cruzado)
Quando o `tenant_id` for fornecido no header, mas a query tentar ler dados ou IDs pertencentes a outro Tenant que já foram indexados.

*   **Status HTTP:** `403 Forbidden`
*   **Corpo da Resposta (JSON):**
```json
{
  "timestamp": "2026-06-16T13:51:00Z",
  "status": 403,
  "error": "Forbidden",
  "message": "Access Denied: Resource belongs to another tenant scope",
  "path": "/api/documents/a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a99"
}
```

---

## 3. Idempotência e Timeouts
- **Idempotência:** A presença do cabeçalho `X-Tenant-ID` não afeta as garantias originais de idempotência das rotas REST (GET/PUT/DELETE continuam idempotentes, POST não idempotente).
- **Timeouts:** O processamento do interceptador de tenant é instantâneo (sub-milissegundo), não gerando impactos no tempo limite das transações HTTP.
