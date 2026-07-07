-- V17__agent_custom_tools.sql - Suporte a tools Python customizadas via pasta tools/ no ZIP do agente (issue #129)

CREATE TABLE agent_custom_tools (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    tool_name VARCHAR(100) NOT NULL,
    script_content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_agent_custom_tools_agent_tool UNIQUE (agent_id, tool_name)
);

CREATE INDEX idx_agent_custom_tools_agent_id ON agent_custom_tools(agent_id);
