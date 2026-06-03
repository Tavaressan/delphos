-- 1. Tabela de Definições de Workflow
CREATE TABLE workflow_definitions (
    id UUID PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    active_version INT NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabela de Versões de Workflow
CREATE TABLE workflow_versions (
    workflow_id UUID REFERENCES workflow_definitions(id) ON DELETE CASCADE,
    version INT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100) NOT NULL,
    PRIMARY KEY (workflow_id, version)
);

-- 3. Tabela de Nós da DAG
CREATE TABLE workflow_nodes (
    id UUID PRIMARY KEY,
    workflow_id UUID NOT NULL,
    version INT NOT NULL,
    type VARCHAR(50) NOT NULL, -- Ex: 'RAG', 'TOOL', 'CONDITION'
    config JSONB,             -- Parametrizações do nó
    FOREIGN KEY (workflow_id, version) REFERENCES workflow_versions(workflow_id, version) ON DELETE CASCADE
);

-- 4. Tabela de Arestas/Conexões da DAG
CREATE TABLE workflow_edges (
    id UUID PRIMARY KEY,
    workflow_id UUID NOT NULL,
    version INT NOT NULL,
    from_node_id UUID REFERENCES workflow_nodes(id) ON DELETE CASCADE,
    to_node_id UUID REFERENCES workflow_nodes(id) ON DELETE CASCADE,
    condition TEXT,           -- Expressão condicional para ramificação
    FOREIGN KEY (workflow_id, version) REFERENCES workflow_versions(workflow_id, version) ON DELETE CASCADE
);

-- 5. Índices de Performance para Carga Rápida pelo workflow-worker
CREATE INDEX idx_workflow_nodes_lookup ON workflow_nodes(workflow_id, version);
CREATE INDEX idx_workflow_edges_lookup ON workflow_edges(workflow_id, version);
