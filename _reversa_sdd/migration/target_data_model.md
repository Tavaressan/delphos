# Modelo de Dados: Tabelas de Auditoria e pgvector

Este documento apresenta a especificação técnica das tabelas do banco de dados relacional e vetorial **PostgreSQL** para a **Enterprise Agent Operating Platform**, detalhando os campos obrigatórios para fins de auditoria, concorrência e buscas vetoriais.

---

## 1. Extensões Obrigatórias no Banco de Dados
Para habilitar suporte a buscas por similaridade semântica de alta dimensão e controle distribuído, o banco deve ativar:
```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;
```

---

## 2. Estrutura de Tabelas Relacionais (Auditoria e Controle)

### 2.1. Tabela: `conversations`
Armazena as sessões de conversas iniciadas por usuários.
```sql
CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    tenant_id UUID NOT NULL,
    title VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_conversations_tenant_user ON conversations (tenant_id, user_id);
```

### 2.2. Tabela: `messages`
Armazena o histórico das mensagens trocadas nos chats.
```sql
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    author_role VARCHAR(50) NOT NULL, -- 'USER', 'ASSISTANT', 'SYSTEM'
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_author_role CHECK (author_role IN ('USER', 'ASSISTANT', 'SYSTEM'))
);
CREATE INDEX idx_messages_conversation ON messages (conversation_id);
```

### 2.3. Tabela: `agent_executions`
Grava o histórico de depuração e execução de jobs cognitivos enviados aos workers.
```sql
CREATE TABLE agent_executions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
    agent_id UUID NOT NULL,
    status VARCHAR(50) NOT NULL, -- 'REQUESTED', 'QUEUED', 'DISPATCHED', 'STARTED', 'THINKING', 'TOOL_RUNNING', 'WAITING_TOOL', 'RETRIEVAL_RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED', 'TIMEOUT'
    prompt_final TEXT NOT NULL,
    output_result TEXT,
    error_message TEXT,
    tokens_consumed INT DEFAULT 0,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    finished_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_agent_executions_status ON agent_executions (status);
```

### 2.4. Tabela: `tool_calls`
Audita detalhadamente a execução de ferramentas dinâmicas disparadas pelos agentes cognitivos.
```sql
CREATE TABLE tool_calls (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    execution_id UUID NOT NULL REFERENCES agent_executions(id) ON DELETE CASCADE,
    tool_name VARCHAR(255) NOT NULL,
    input_payload JSONB NOT NULL,
    output_response TEXT,
    execution_time_ms INT,
    status VARCHAR(50) NOT NULL, -- 'STARTED', 'COMPLETED', 'FAILED'
    error_log TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_tool_calls_execution ON tool_calls (execution_id);
```

### 2.5. Tabela: `retrieval_events`
Audita eventos de recuperação de trechos de documentos (RAG) utilizados no contexto dos agentes.
```sql
CREATE TABLE retrieval_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    execution_id UUID NOT NULL REFERENCES agent_executions(id) ON DELETE CASCADE,
    document_id UUID NOT NULL,
    chunk_id UUID NOT NULL,
    similarity_score DOUBLE PRECISION NOT NULL,
    retrieved_content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_retrieval_events_execution ON retrieval_events (execution_id);
```

---

## 3. Estrutura Vetorial (pgvector e HNSW)

### 3.1. Tabela: `document_chunks`
Armazena a fragmentação semântica dos documentos e a representação vetorial compatível com o modelo ativo.
```sql
CREATE TABLE document_chunks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL,
    tenant_id UUID NOT NULL,
    chunk_index INT NOT NULL,
    content TEXT NOT NULL,
    embedding vector(DIMENSION) NOT NULL, -- Nota: A dimensionalidade (DIMENSION) é parametrizável e compatível com o modelo de embeddings configurado para a coleção (evitando acoplamento).
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### 3.2. Índice HNSW para Similaridade de Cosseno
Para acelerar a recuperação de trechos relevantes reduzindo a latência da busca, aplica-se o índice HNSW sobre o campo `embedding`:
```sql
CREATE INDEX idx_chunks_embedding 
ON document_chunks 
USING hnsw (embedding vector_cosine_ops);
```
**Nota de Desempenho:** A busca híbrida executada na camada Postgres executará filtros relacionais baseados em `tenant_id` e `document_id` de forma prioritária ou composta sobre o índice de embeddings. A largura dimensional do tipo `vector` deve ser redefinida de acordo com a configuração de embedding ativa para cada coleção/modelo (ex: 1536 para OpenAI/Gemini, 768 para BGE/E5, etc.), garantindo flexibilidade e evitando acoplamento a provedores ou modelos específicos.
