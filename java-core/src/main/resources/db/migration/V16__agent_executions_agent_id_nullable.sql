-- Issue #124: chat sem agentId não deve mais gerar UUID aleatório.
-- agent_id passa a ser opcional, representando execuções sem agente específico selecionado.
ALTER TABLE agent_executions ALTER COLUMN agent_id DROP NOT NULL;
