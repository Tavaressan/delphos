-- Cadastra definição de teste
INSERT INTO workflow_definitions(id, name, description, active_version) 
VALUES ('9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d', 'Workflow de Teste', 'DAG simples RAG + Tool para validação pós-ingestão', 1)
ON CONFLICT (name) DO NOTHING;

-- Cria versão 1 (se a definição foi criada com sucesso)
INSERT INTO workflow_versions(workflow_id, version, created_by) 
SELECT '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d', 1, 'system'
WHERE EXISTS (SELECT 1 FROM workflow_definitions WHERE id = '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d')
ON CONFLICT DO NOTHING;

-- Cria os nós
-- Nó 1 (RAG)
INSERT INTO workflow_nodes(id, workflow_id, version, type, config) 
SELECT '20d6f452-19e4-4d87-bc5e-85f2ea716a4e', '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d', 1, 'RAG', '{"prompt": "Controle de Acesso Legado"}'::jsonb
WHERE EXISTS (SELECT 1 FROM workflow_versions WHERE workflow_id = '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d' AND version = 1)
ON CONFLICT DO NOTHING;

-- Nó 2 (Tool/Ferramenta)
INSERT INTO workflow_nodes(id, workflow_id, version, type, config) 
SELECT 'a3f12461-8bde-4712-9c1a-de71a25c1a01', '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d', 1, 'TOOL', '{"toolName": "calculate_sandbox_quota"}'::jsonb
WHERE EXISTS (SELECT 1 FROM workflow_versions WHERE workflow_id = '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d' AND version = 1)
ON CONFLICT DO NOTHING;

-- Cria a aresta ligando RAG -> TOOL
INSERT INTO workflow_edges(id, workflow_id, version, from_node_id, to_node_id, condition) 
SELECT '88cc7112-aa1b-4171-acde-1fbc812aa201', '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d', 1, '20d6f452-19e4-4d87-bc5e-85f2ea716a4e', 'a3f12461-8bde-4712-9c1a-de71a25c1a01', NULL
WHERE EXISTS (SELECT 1 FROM workflow_nodes WHERE id = '20d6f452-19e4-4d87-bc5e-85f2ea716a4e') 
  AND EXISTS (SELECT 1 FROM workflow_nodes WHERE id = 'a3f12461-8bde-4712-9c1a-de71a25c1a01')
ON CONFLICT DO NOTHING;
