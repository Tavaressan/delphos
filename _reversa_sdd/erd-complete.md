# Modelo Entidade-Relacionamento Completo (ERD)

Este documento apresenta o modelo lógico do banco de dados relacional e vetorial PostgreSQL, mapeado a partir dos scripts de migração do Flyway (`V1__init_schema.sql`).

```mermaid
erDiagram
    users {
        uuid id PK "gen_random_uuid()"
        varchar username UK "Not Null (50)"
        varchar email UK "Not Null (255)"
        varchar password_hash "Not Null (255)"
        varchar first_name "Null (100)"
        varchar last_name "Null (100)"
        varchar status "Not Null DEFAULT 'ACTIVE' (20)"
        timestamp created_at "DEFAULT CURRENT_TIMESTAMP"
        timestamp updated_at "DEFAULT CURRENT_TIMESTAMP"
    }

    roles {
        uuid id PK "gen_random_uuid()"
        varchar name UK "Not Null (50)"
        varchar description "Null (255)"
        timestamp created_at "DEFAULT CURRENT_TIMESTAMP"
    }

    permissions {
        uuid id PK "gen_random_uuid()"
        varchar name UK "Not Null (100)"
        varchar description "Null (255)"
        timestamp created_at "DEFAULT CURRENT_TIMESTAMP"
    }

    user_roles {
        uuid user_id PK, FK "References users(id)"
        uuid role_id PK, FK "References roles(id)"
    }

    role_permissions {
        uuid role_id PK, FK "References roles(id)"
        uuid permission_id PK, FK "References permissions(id)"
    }

    documents {
        uuid id PK "gen_random_uuid()"
        varchar name "Not Null (255)"
        varchar file_path "Not Null (512)"
        bigint file_size "Not Null"
        varchar file_type "Not Null (100)"
        varchar status "Not Null DEFAULT 'UPLOADING' (30)"
        text processing_error "Null"
        uuid created_by FK "References users(id)"
        timestamp created_at "DEFAULT CURRENT_TIMESTAMP"
        timestamp updated_at "DEFAULT CURRENT_TIMESTAMP"
    }

    document_chunks {
        uuid id PK "gen_random_uuid()"
        uuid document_id FK "References documents(id)"
        int chunk_index "Not Null"
        text content "Not Null"
        vector embedding "vector Null (dimensão parametrizável)"
        int page_number "Null"
        timestamp created_at "DEFAULT CURRENT_TIMESTAMP"
    }

    chats {
        uuid id PK "gen_random_uuid()"
        uuid user_id FK "References users(id)"
        varchar title "Not Null DEFAULT 'Nova Conversa' (255)"
        timestamp created_at "DEFAULT CURRENT_TIMESTAMP"
        timestamp updated_at "DEFAULT CURRENT_TIMESTAMP"
    }

    chat_messages {
        uuid id PK "gen_random_uuid()"
        uuid chat_id FK "References chats(id)"
        varchar role "Not Null (20) (USER, ASSISTANT, SYSTEM)"
        text content "Not Null"
        timestamp created_at "DEFAULT CURRENT_TIMESTAMP"
    }

    audit_logs {
        uuid id PK "gen_random_uuid()"
        uuid user_id FK "References users(id)"
        varchar action "Not Null (100)"
        varchar target "Null (255)"
        varchar ip_address "Not Null (45)"
        varchar user_agent "Null (512)"
        jsonb details "Null"
        timestamp created_at "DEFAULT CURRENT_TIMESTAMP"
    }

    users ||--o{ user_roles : "possui"
    roles ||--o{ user_roles : "contem"
    roles ||--o{ role_permissions : "possui"
    permissions ||--o{ role_permissions : "contem"
    users ||--o{ documents : "cria/envia"
    documents ||--o{ document_chunks : "contem_chunks"
    users ||--o{ chats : "inicia"
    chats ||--|{ chat_messages : "contem_mensagens"
    users ||--o{ audit_logs : "gera"
```

---

## 1. Descrição Detalhada das Entidades

1. **`users` (Usuários):** Mapeia os usuários que acessam o sistema. A coluna `status` permite bloquear usuários (inativos/banidos).
2. **`roles` e `permissions` (Segurança RBAC):** Implementam a estrutura padrão de RBAC. A tabela associativa `role_permissions` une os papéis às permissões granulares, e `user_roles` une os usuários aos seus papéis correspondentes.
3. **`documents` (Metadados de Arquivos):** Mantém a referência do arquivo original (no MinIO/S3), informações de auditoria de upload (`created_by`), status atual do processamento vetorial (`status`) e logs de erro se aplicável.
4. **`document_chunks` (Repositório Vetorial):** A entidade central da busca semântica. O campo `embedding` é um tipo especial `vector` (com largura dimensional parametrizável de acordo com o modelo configurado) com índice HNSW para buscas de cosseno eficientes. Possui chave estrangeira para o documento pai.
5. **`chats` e `chat_messages` (Conversação):** Mantêm o histórico persistido das conversas. `chat_messages` armazena a conversa sequencial com as tags `role` (`USER` para o usuário, `ASSISTANT` para a resposta gerada por RAG, e `SYSTEM` para instruções/prompts base).
6. **`audit_logs` (Logs de Auditoria):** Registra eventos de segurança sensíveis. O campo `details` é um JSONB dinâmico que permite estender metadados das ações realizadas.
