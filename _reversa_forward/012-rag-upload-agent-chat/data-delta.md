# Delta de Dados: Ingestão de Documentos para RAG e Chat com Agentes

Este documento detalha o delta no modelo de dados físico e relacional em relação ao dicionário de dados legado extraído em `_reversa_sdd/data-dictionary.md`.

---

## 1. Novas Entidades e Tabelas

### 1.1. Tabela: `agents`
Armazena a definição dos agentes criados na plataforma pelo administrador via envio de pacote ZIP.

| Campo | Tipo | Nulidade | Restrições / Valor Padrão | Descrição |
|---|---|---|---|---|
| `id` | `UUID` | NOT NULL | `PRIMARY KEY`, `DEFAULT gen_random_uuid()` | Identificador único do agente. |
| `name` | `VARCHAR(100)` | NOT NULL | `UNIQUE` | Nome exclusivo do agente (ex: compliance). |
| `description` | `VARCHAR(255)` | NULL | - | Descrição amigável do papel do agente. |
| `system_instructions` | `TEXT` | NOT NULL | - | Regras e instruções fundamentais lidas dos markdowns do ZIP. |
| `status` | `VARCHAR(30)` | NOT NULL | `DEFAULT 'ACTIVE'` | Status operacional do agente (`ACTIVE`, `INACTIVE`, `FAILED`). |
| `created_by` | `UUID` | NULL | `FOREIGN KEY REFERENCES users(id) ON DELETE SET NULL` | ID do administrador que criou o agente. |
| `created_at` | `TIMESTAMP` | NULL | `DEFAULT CURRENT_TIMESTAMP` | Data e hora de criação do registro. |
| `updated_at` | `TIMESTAMP` | NULL | `DEFAULT CURRENT_TIMESTAMP` | Data e hora da última atualização. |

---

## 2. Modificações em Tabelas Existentes

### 2.1. Tabela: `documents`
Adição de vínculo do documento a um agente específico (quando o documento for carregado via ZIP do agente para sua base de conhecimento restrita).

*   **Novo Campo:**
    *   `agent_id` | `UUID` | NULL | `FOREIGN KEY REFERENCES agents(id) ON DELETE CASCADE` | ID do agente ao qual este documento pertence. Se nulo, o documento é de RAG geral.
*   **Novo Índice:**
    *   `idx_documents_agent_id` na coluna `agent_id` (B-Tree).

### 2.2. Tabela: `chats`
Vínculo da sessão de conversação a um agente específico (para aplicar suas instruções e o isolamento de base de conhecimento RAG correspondente).

*   **Novo Campo:**
    *   `agent_id` | `UUID` | NULL | `FOREIGN KEY REFERENCES agents(id) ON DELETE SET NULL` | ID do agente ativo nesta conversa. Se nulo, representa um chat genérico/geral.
*   **Novo Índice:**
    *   `idx_chats_agent_id` na coluna `agent_id` (B-Tree).

---

## 3. Migrações Necessárias (Flyway SQL)

Script de migração SQL incremental (`V2__add_agents_and_rag_isolation.sql`):

```sql
-- Criar a tabela de agentes
CREATE TABLE agents (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description VARCHAR(255),
    system_instructions TEXT NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    created_by UUID,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_agents PRIMARY KEY (id),
    CONSTRAINT uq_agents_name UNIQUE (name),
    CONSTRAINT fk_agents_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Adicionar coluna de agent_id em documents
ALTER TABLE documents ADD COLUMN agent_id UUID NULL;
ALTER TABLE documents ADD CONSTRAINT fk_documents_agent_id FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE;
CREATE INDEX idx_documents_agent_id ON documents(agent_id);

-- Adicionar coluna de agent_id em chats
ALTER TABLE chats ADD COLUMN agent_id UUID NULL;
ALTER TABLE chats ADD CONSTRAINT fk_chats_agent_id FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE SET NULL;
CREATE INDEX idx_chats_agent_id ON chats(agent_id);
```
