-- V5__add_agents_and_rag_isolation.sql - Add agents table and agent_id columns for RAG isolation

CREATE TABLE agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    system_instructions TEXT,
    zip_path VARCHAR(512),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE documents ADD COLUMN agent_id UUID REFERENCES agents(id) ON DELETE SET NULL;
ALTER TABLE conversations ADD COLUMN agent_id UUID REFERENCES agents(id) ON DELETE SET NULL;

CREATE INDEX idx_agents_tenant ON agents(tenant_id);
CREATE INDEX idx_documents_agent ON documents(agent_id);
CREATE INDEX idx_conversations_agent ON conversations(agent_id);
