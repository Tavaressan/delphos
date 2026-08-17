-- Issue #266: Adiciona tenant_id a workflow_definitions
ALTER TABLE workflow_definitions ADD COLUMN tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000';
CREATE INDEX idx_workflow_definitions_tenant_id ON workflow_definitions (tenant_id);
