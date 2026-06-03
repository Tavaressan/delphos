-- V2__reversa_target_schema.sql - Migration to Target Multi-Tenant Schema & Agent Auditing

-- 1. Drop legacy single-tenant chats & chat messages
DROP TABLE IF EXISTS chat_messages CASCADE;
DROP TABLE IF EXISTS chats CASCADE;

-- 2. Create target conversations table
CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL,
    title VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_conversations_tenant_user ON conversations (tenant_id, user_id);

-- 3. Create target messages table
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    author_role VARCHAR(50) NOT NULL, -- 'USER', 'ASSISTANT', 'SYSTEM'
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_author_role CHECK (author_role IN ('USER', 'ASSISTANT', 'SYSTEM'))
);
CREATE INDEX idx_messages_conversation ON messages (conversation_id);

-- 4. Add multi-tenancy columns to documents and document_chunks
ALTER TABLE documents ADD COLUMN tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000';
ALTER TABLE document_chunks ADD COLUMN tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000';

-- 5. Create agent executions table for auditing cognitive workflows
CREATE TABLE agent_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

-- 6. Create tool calls table to audit sandboxed tool executions
CREATE TABLE tool_calls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

-- 7. Create retrieval events table for semantical retrieval audits
CREATE TABLE retrieval_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    execution_id UUID NOT NULL REFERENCES agent_executions(id) ON DELETE CASCADE,
    document_id UUID NOT NULL,
    chunk_id UUID NOT NULL,
    similarity_score DOUBLE PRECISION NOT NULL,
    retrieved_content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_retrieval_events_execution ON retrieval_events (execution_id);
