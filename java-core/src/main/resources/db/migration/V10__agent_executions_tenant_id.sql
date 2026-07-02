-- Issue #83: agent_executions não tinha tenant_id, forçando JOIN com agents
-- para filtrar por tenant. Adiciona a coluna e faz backfill a partir de
-- agents.tenant_id via agent_id.

ALTER TABLE agent_executions ADD COLUMN tenant_id UUID;

UPDATE agent_executions ae
SET tenant_id = a.tenant_id
FROM agents a
WHERE ae.agent_id = a.id;

-- Execuções cujo agent_id não corresponde a nenhum agent conhecido (dado legado
-- ou agent removido) ficam com tenant_id NULL; assumimos zero-UUID para manter
-- a coluna NOT NULL e sinalizar explicitamente que o tenant é desconhecido.
UPDATE agent_executions
SET tenant_id = '00000000-0000-0000-0000-000000000000'
WHERE tenant_id IS NULL;

ALTER TABLE agent_executions ALTER COLUMN tenant_id SET NOT NULL;

CREATE INDEX idx_agent_executions_tenant_id ON agent_executions (tenant_id);
