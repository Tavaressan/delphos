# Onboarding: Testando o Workflow Worker

> Identificador da feature: `004-workflow-worker`
> Data: `2026-06-03`
> Documento principal: `_reversa_forward/004-workflow-worker/roadmap.md`

Este documento apresenta o guia passo a passo para configurar e testar a execução determinística do `workflow-worker` em um ambiente local de desenvolvimento.

---

## 1. Preparação do Banco de Dados PostgreSQL

1. Certifique-se de que o container do banco de dados está rodando:
   ```bash
   docker-compose up -d postgres
   ```
2. Aplique a nova migration de dados executando o Spring Boot para que o Flyway rode e crie as novas tabelas de topologia de DAG (`workflow_definitions`, `workflow_versions`, `workflow_nodes`, `workflow_edges`).
3. Insira uma DAG declarativa de teste no PostgreSQL rodando os comandos SQL abaixo (via DBeaver ou psql):
   ```sql
   -- Cadastra definição de teste
   INSERT INTO workflow_definitions(id, name, description, active_version) 
   VALUES ('9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d', 'Workflow de Teste', 'DAG simples RAG + Tool', 1);

   -- Cria versão 1
   INSERT INTO workflow_versions(workflow_id, version, created_by) 
   VALUES ('9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d', 1, 'admin');

   -- Cria os nós
   -- Nó 1 (RAG)
   INSERT INTO workflow_nodes(id, workflow_id, version, type, config) 
   VALUES ('20d6f452-19e4-4d87-bc5e-85f2ea716a4e', '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d', 1, 'RAG', '{"prompt": "Controle de Acesso Legado"}');

   -- Nó 2 (Tool/Ferramenta)
   INSERT INTO workflow_nodes(id, workflow_id, version, type, config) 
   VALUES ('a3f12461-8bde-4712-9c1a-de71a25c1a01', '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d', 1, 'TOOL', '{"toolName": "calculate_sandbox_quota"}');

   -- Cria a aresta ligando RAG -> TOOL
   INSERT INTO workflow_edges(id, workflow_id, version, from_node_id, to_node_id) 
   VALUES ('88cc7112-aa1b-4171-acde-1fbc812aa201', '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d', 1, '20d6f452-19e4-4d87-bc5e-85f2ea716a4e', 'a3f12461-8bde-4712-9c1a-de71a25c1a01');
   ```

## 2. Inicialização dos Serviços Locals

1. Inicialize a pilha completa do monorepo usando o script utilitário:
   ```bash
   ./scripts/dev.sh
   ```
2. Verifique se o `workflow-worker` está ativo acompanhando os logs:
   ```bash
   docker logs -f workflow_worker
   ```
   Você deverá ver a mensagem inicial nos logs:
   `Workflow Worker starting (DAG Engine)...`

## 3. Disparando um Job de Teste no RabbitMQ

1. Acesse o console administrativo do RabbitMQ em `http://localhost:15672` (Usuário: `guest`, Senha: `guest` por padrão no monorepo).
2. Vá na aba **Exchanges**, clique em `agent.execution.exchange`.
3. Na seção **Publish Message**, preencha:
   * **Routing Key:** `agent.workflow.requested`
   * **Payload (JSON):**
     ```json
     {
       "workflow_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
       "workflow_version": 1,
       "tenant_id": "default-tenant",
       "execution_id": "c3a76ef4-bbcc-467a-bc12-f47285a85fae"
     }
     ```
4. Clique em **Publish Message**.
5. Monitore os logs do `workflow-worker`. Você deverá ver o consumo do job, a carga da DAG do PostgreSQL, a simulação sequencial de execução dos nós RAG e TOOL, e a publicação do evento `agent.workflow.completed`.
