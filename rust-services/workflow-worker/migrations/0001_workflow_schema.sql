-- Schema mínimo consumido pelo workflow-worker, aplicado pelo #[sqlx::test] no banco
-- efêmero de cada teste. A fonte da verdade em produção continua sendo o Flyway do
-- java-core (V3__workflow_schema.sql + V19__workflow_definitions_tenant_id.sql); este
-- arquivo replica apenas o recorte que os testes deste crate consultam.

CREATE TABLE workflow_definitions (
    id UUID PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    active_version INT NOT NULL DEFAULT 1,
    tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE workflow_versions (
    workflow_id UUID REFERENCES workflow_definitions(id) ON DELETE CASCADE,
    version INT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100) NOT NULL,
    PRIMARY KEY (workflow_id, version)
);

CREATE TABLE workflow_nodes (
    id UUID PRIMARY KEY,
    workflow_id UUID NOT NULL,
    version INT NOT NULL,
    type VARCHAR(50) NOT NULL,
    config JSONB,
    FOREIGN KEY (workflow_id, version) REFERENCES workflow_versions(workflow_id, version) ON DELETE CASCADE
);

CREATE TABLE workflow_edges (
    id UUID PRIMARY KEY,
    workflow_id UUID NOT NULL,
    version INT NOT NULL,
    from_node_id UUID REFERENCES workflow_nodes(id) ON DELETE CASCADE,
    to_node_id UUID REFERENCES workflow_nodes(id) ON DELETE CASCADE,
    condition TEXT,
    FOREIGN KEY (workflow_id, version) REFERENCES workflow_versions(workflow_id, version) ON DELETE CASCADE
);

CREATE INDEX idx_workflow_nodes_lookup ON workflow_nodes(workflow_id, version);
CREATE INDEX idx_workflow_edges_lookup ON workflow_edges(workflow_id, version);
CREATE INDEX idx_workflow_definitions_tenant_id ON workflow_definitions (tenant_id);
