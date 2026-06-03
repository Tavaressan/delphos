# Data Delta: Persistência de Workflows no PostgreSQL

> Identificador da feature: `004-workflow-worker`
> Data: `2026-06-03`
> Documento principal: `_reversa_forward/004-workflow-worker/roadmap.md`

Este documento detalha as mudanças conceituais e físicas sugeridas sobre o modelo de dados legado em `_reversa_sdd/data-dictionary.md`.

---

## 1. Schema das Novas Tabelas (Flyway Migration SQL)

Para suportar o cadastro, versionamento e execução determinística de DAGs declarativas persistidas centralmente, as seguintes tabelas serão criadas via migration `V3__workflow_schema.sql` no Spring Boot:

```sql
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
```

## 2. Relacionamento com as Tabelas de Auditoria de Execução

As execuções disparadas no `workflow-worker` são referenciadas na tabela corporativa de auditoria criada na migração `V2__reversa_target_schema.sql`:

* **`agent_executions`:** A tabela central guarda o status das execuções (`execution_id`). Cada job consome essa referência para vincular a execução da DAG ao seu respectivo ciclo de vida (`DISPATCHED` -> `agent.workflow.started` -> `agent.workflow.completed`).
* **Multi-Tenancy:** Toda consulta feita pelo `workflow-worker` para carregar a DAG deve incluir o filtro por `tenant_id` corporativo, garantindo o isolamento lógico das definições de workflow entre diferentes inquilinos organizacionais.
