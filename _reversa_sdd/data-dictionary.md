# Dicionário de Dados - alfabra_vector

Este documento descreve todas as entidades e tabelas relacionais do sistema **alfabra_vector**, extraídas e confirmadas a partir do script de migração Flyway `V1__init_schema.sql` no módulo `java-core`.

---

## 🗄️ Resumo do Banco de Dados
* **SGBD:** PostgreSQL (com extensão `vector` e `uuid-ossp`)
* **Extensões Requeridas:**
  * `vector` (pgvector): Habilita o tipo `vector` para busca semântica em alta performance.
  * `uuid-ossp`: Provê geradores de identificadores únicos UUID.

---

## 👥 1. Tabela: `users` 🟢 **CONFIRMADO**
Armazena as credenciais e informações cadastrais dos usuários do sistema.

| Campo | Tipo | Nulidade | Restrições / Valor Padrão | Descrição |
|---|---|---|---|---|
| `id` | `UUID` | NOT NULL | `PRIMARY KEY`, `DEFAULT gen_random_uuid()` | Identificador único do usuário. |
| `username` | `VARCHAR(50)` | NOT NULL | `UNIQUE` | Nome de usuário único para login. |
| `email` | `VARCHAR(255)` | NOT NULL | `UNIQUE` | Endereço de e-mail único. |
| `password_hash` | `VARCHAR(255)` | NOT NULL | - | Hash da senha (criptografado). |
| `first_name` | `VARCHAR(100)` | NULL | - | Primeiro nome do usuário. |
| `last_name` | `VARCHAR(100)` | NULL | - | Sobrenome do usuário. |
| `status` | `VARCHAR(20)` | NOT NULL | `DEFAULT 'ACTIVE'` | Estado da conta (ex: ACTIVE, INACTIVE). |
| `created_at` | `TIMESTAMP` | NULL | `DEFAULT CURRENT_TIMESTAMP` | Data e hora de criação do registro. |
| `updated_at` | `TIMESTAMP` | NULL | `DEFAULT CURRENT_TIMESTAMP` | Data e hora da última atualização. |

---

## 🔐 2. Tabela: `roles` 🟢 **CONFIRMADO**
Define os papéis e permissões de acesso do Controle de Acesso Baseado em Regras (RBAC).

| Campo | Tipo | Nulidade | Restrições / Valor Padrão | Descrição |
|---|---|---|---|---|
| `id` | `UUID` | NOT NULL | `PRIMARY KEY`, `DEFAULT gen_random_uuid()` | Identificador único do papel. |
| `name` | `VARCHAR(50)` | NOT NULL | `UNIQUE` | Nome do papel (ex: ROLE_ADMIN, ROLE_USER). |
| `description` | `VARCHAR(255)` | NULL | - | Descrição curta do papel. |
| `created_at` | `TIMESTAMP` | NULL | `DEFAULT CURRENT_TIMESTAMP` | Data de criação do papel. |

---

## 🔑 3. Tabela: `permissions` 🟢 **CONFIRMADO**
Define ações granulares que podem ser concedidas dentro da aplicação.

| Campo | Tipo | Nulidade | Restrições / Valor Padrão | Descrição |
|---|---|---|---|---|
| `id` | `UUID` | NOT NULL | `PRIMARY KEY`, `DEFAULT gen_random_uuid()` | Identificador único da permissão. |
| `name` | `VARCHAR(100)` | NOT NULL | `UNIQUE` | Nome da permissão (ex: READ_DOCUMENTS). |
| `description` | `VARCHAR(255)` | NULL | - | Descrição do que a permissão libera. |
| `created_at` | `TIMESTAMP` | NULL | `DEFAULT CURRENT_TIMESTAMP` | Data de criação do registro. |

---

## 🔗 4. Tabela Relacional: `user_roles` 🟢 **CONFIRMADO**
Associação muitos-para-muitos entre usuários e seus respectivos papéis.

| Campo | Tipo | Nulidade | Restrições / Valor Padrão | Descrição |
|---|---|---|---|---|
| `user_id` | `UUID` | NOT NULL | `FOREIGN KEY REFERENCES users(id) ON DELETE CASCADE` | ID do usuário. |
| `role_id` | `UUID` | NOT NULL | `FOREIGN KEY REFERENCES roles(id) ON DELETE CASCADE` | ID do papel. |

* **Chave Primária Composta:** `(user_id, role_id)`

---

## 🔗 5. Tabela Relacional: `role_permissions` 🟢 **CONFIRMADO**
Associação muitos-para-muitos entre papéis e suas respectivas permissões de segurança.

| Campo | Tipo | Nulidade | Restrições / Valor Padrão | Descrição |
|---|---|---|---|---|
| `role_id` | `UUID` | NOT NULL | `FOREIGN KEY REFERENCES roles(id) ON DELETE CASCADE` | ID do papel. |
| `permission_id` | `UUID` | NOT NULL | `FOREIGN KEY REFERENCES permissions(id) ON DELETE CASCADE` | ID da permissão. |

* **Chave Primária Composta:** `(role_id, permission_id)`

---

## 📄 6. Tabela: `documents` 🟢 **CONFIRMADO**
Metadados dos documentos importados para a base de conhecimento do RAG.

| Campo | Tipo | Nulidade | Restrições / Valor Padrão | Descrição |
|---|---|---|---|---|
| `id` | `UUID` | NOT NULL | `PRIMARY KEY`, `DEFAULT gen_random_uuid()` | Identificador único do documento. |
| `name` | `VARCHAR(255)` | NOT NULL | - | Nome original do arquivo. |
| `file_path` | `VARCHAR(512)` | NOT NULL | - | Caminho físico ou URL do arquivo (MinIO/S3). |
| `file_size` | `BIGINT` | NOT NULL | - | Tamanho do arquivo em bytes. |
| `file_type` | `VARCHAR(100)` | NOT NULL | - | Tipo MIME do arquivo (ex: application/pdf). |
| `status` | `VARCHAR(30)` | NOT NULL | `DEFAULT 'UPLOADING'` | Status da indexação (UPLOADING, PROCESSING, INDEXED, FAILED). |
| `processing_error` | `TEXT` | NULL | - | Detalhes do erro em caso de falha de processamento. |
| `created_by` | `UUID` | NULL | `FOREIGN KEY REFERENCES users(id) ON DELETE SET NULL` | ID do usuário que enviou o documento. |
| `created_at` | `TIMESTAMP` | NULL | `DEFAULT CURRENT_TIMESTAMP` | Data de criação do documento. |
| `updated_at` | `TIMESTAMP` | NULL | `DEFAULT CURRENT_TIMESTAMP` | Data da última atualização. |

---

## 🧬 7. Tabela: `document_chunks` 🟢 **CONFIRMADO**
Persistência dos fragmentos de texto (chunks) e seus respectivos vetores gerados pelo modelo de inteligência artificial.

| Campo | Tipo | Nulidade | Restrições / Valor Padrão | Descrição |
|---|---|---|---|---|
| `id` | `UUID` | NOT NULL | `PRIMARY KEY`, `DEFAULT gen_random_uuid()` | Identificador único do chunk. |
| `document_id` | `UUID` | NOT NULL | `FOREIGN KEY REFERENCES documents(id) ON DELETE CASCADE` | ID do documento pai. |
| `chunk_index` | `INT` | NOT NULL | - | Índice sequencial do fragmento no documento. |
| `content` | `TEXT` | NOT NULL | - | Conteúdo em texto puro do fragmento. |
| `embedding` | `vector` | NULL | - | Vetor numérico correspondente (com dimensionalidade parametrizável). |
| `page_number` | `INT` | NULL | - | Número da página física do arquivo original. |
| `created_at` | `TIMESTAMP` | NULL | `DEFAULT CURRENT_TIMESTAMP` | Data de criação do chunk. |

---

## 💬 8. Tabela: `chats` 🟢 **CONFIRMADO**
Cabeçalhos das sessões de conversação iniciadas por usuários.

| Campo | Tipo | Nulidade | Restrições / Valor Padrão | Descrição |
|---|---|---|---|---|
| `id` | `UUID` | NOT NULL | `PRIMARY KEY`, `DEFAULT gen_random_uuid()` | Identificador único do chat. |
| `user_id` | `UUID` | NOT NULL | `FOREIGN KEY REFERENCES users(id) ON DELETE CASCADE` | ID do usuário proprietário do chat. |
| `title` | `VARCHAR(255)` | NOT NULL | `DEFAULT 'Nova Conversa'` | Título amigável da sessão de chat. |
| `created_at` | `TIMESTAMP` | NULL | `DEFAULT CURRENT_TIMESTAMP` | Data de criação do chat. |
| `updated_at` | `TIMESTAMP` | NULL | `DEFAULT CURRENT_TIMESTAMP` | Data da última interação. |

---

## ✉️ 9. Tabela: `chat_messages` 🟢 **CONFIRMADO**
Armazena a conversa completa linha a linha de cada sessão de chat.

| Campo | Tipo | Nulidade | Restrições / Valor Padrão | Descrição |
|---|---|---|---|---|
| `id` | `UUID` | NOT NULL | `PRIMARY KEY`, `DEFAULT gen_random_uuid()` | Identificador único da mensagem. |
| `chat_id` | `UUID` | NOT NULL | `FOREIGN KEY REFERENCES chats(id) ON DELETE CASCADE` | ID do chat pai. |
| `role` | `VARCHAR(20)` | NOT NULL | - | Papel do emissor (USER, ASSISTANT, SYSTEM). |
| `content` | `TEXT` | NOT NULL | - | Conteúdo da mensagem enviada ou recebida. |
| `created_at` | `TIMESTAMP` | NULL | `DEFAULT CURRENT_TIMESTAMP` | Data e hora de envio da mensagem. |

---

## 📝 10. Tabela: `audit_logs` 🟢 **CONFIRMADO**
Trilha de auditoria das ações críticas tomadas dentro do ecossistema RAG.

| Campo | Tipo | Nulidade | Restrições / Valor Padrão | Descrição |
|---|---|---|---|---|
| `id` | `UUID` | NOT NULL | `PRIMARY KEY`, `DEFAULT gen_random_uuid()` | Identificador único do log de auditoria. |
| `user_id` | `UUID` | NULL | `FOREIGN KEY REFERENCES users(id) ON DELETE SET NULL` | ID do usuário responsável pela ação. |
| `action` | `VARCHAR(100)` | NOT NULL | - | Nome do evento auditado (ex: LOGIN, QUERY_RAG). |
| `target` | `VARCHAR(255)` | NULL | - | Entidade ou recurso afetado (ex: ID do documento). |
| `ip_address` | `VARCHAR(45)` | NOT NULL | - | Endereço IP do originador da chamada. |
| `user_agent` | `VARCHAR(512)` | NULL | - | Informações do navegador/cliente HTTP. |
| `details` | `JSONB` | NULL | - | Metadados dinâmicos sobre o evento em formato JSON. |
| `created_at` | `TIMESTAMP` | NULL | `DEFAULT CURRENT_TIMESTAMP` | Data e hora do acontecimento. |

---

## ⚡ Índices de Performance Otimizados

Para garantir a escalabilidade e o desempenho das consultas críticas de pesquisa, o esquema define os seguintes índices:

1. **Pesquisa Semântica (Vetorial):**
   * `idx_chunks_embedding` na coluna `embedding` da tabela `document_chunks` usando **HNSW** (`vector_cosine_ops`). Essencial para buscas por similaridade de cosseno em tempo real.
2. **Índices de Relacionamento e Unicidade B-Tree:**
   * `idx_users_username` e `idx_users_email` para logins e validações rápidas.
   * `idx_documents_status` para listar documentos em processamento ou com falhas.
   * `idx_document_chunks_doc_id` para montagem e recuperação dos chunks de um documento específico.
   * `idx_chats_user_id` para carregar o histórico de conversas do usuário logado.
   * `idx_chat_messages_chat_id` para carregar o fluxo histórico de uma conversa.
   * `idx_audit_logs_user_id` e `idx_audit_logs_action` para consultas rápidas nos painéis de auditoria administrativa.
