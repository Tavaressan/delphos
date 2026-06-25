CREATE TABLE IF NOT EXISTS agent_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES conversations(id),
    agent_id UUID NOT NULL,
    status VARCHAR(50) NOT NULL,
    prompt_final TEXT NOT NULL,
    output_result TEXT,
    error_message TEXT,
    tokens_consumed INTEGER DEFAULT 0,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    finished_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tool_calls (
    id UUID PRIMARY KEY,
    execution_id UUID NOT NULL REFERENCES agent_executions(id),
    tool_name VARCHAR(255) NOT NULL,
    input_payload JSONB NOT NULL,
    output_response TEXT,
    execution_time_ms INTEGER,
    status VARCHAR(50) NOT NULL,
    error_log TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS retrieval_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    execution_id UUID NOT NULL REFERENCES agent_executions(id),
    document_id UUID NOT NULL,
    chunk_id UUID NOT NULL,
    similarity_score DOUBLE PRECISION NOT NULL,
    retrieved_content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
