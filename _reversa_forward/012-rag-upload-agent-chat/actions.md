# Actions: Upload de Documentos para RAG e Chat com Agentes

> Identificador: `012-rag-upload-agent-chat`
> Data: `2026-06-15`
> Roadmap: `_reversa_forward/012-rag-upload-agent-chat/roadmap.md`

## Resumo

| Métrica | Valor |
|---------|-------|
| Total de ações | 15 |
| Paralelizáveis (`[//]`) | 5 |
| Maior cadeia de dependência | 6 |

## Fase 1, Preparação

<!-- Setup, scaffolding, migrações iniciais, configuração de infraestrutura local. -->

| ID | Descrição | Dependências | Paralelismo | Arquivo alvo | Confidência | Status |
|----|-----------|--------------|-------------|--------------|-------------|--------|
| T001 | Criar e executar a migração do Flyway para adicionar a tabela `agents` e colunas `agent_id` em `documents` e `chats` | - | `[//]` | `java-core/src/main/resources/db/migration/V5__add_agents_and_rag_isolation.sql` | 🟢 | `[X]` |
| T002 | Provisionar e configurar o bucket `agents-data` no MinIO na inicialização do backend | T001 | - | `java-core/src/main/java/com/company/core/infrastructure/config/MinioConfig.java` | 🟢 | `[X]` |

## Fase 2, Testes

<!-- Testes que precisam existir antes ou logo após o núcleo. -->

| ID | Descrição | Dependências | Paralelismo | Arquivo alvo | Confidência | Status |
|----|-----------|--------------|-------------|--------------|-------------|--------|
| T003 | Criar esqueleto de testes de integração de API no Spring Boot para validar criação de agentes e RAG | T001 | `[//]` | `java-core/src/test/java/com/company/core/interfaces/rest/AgentControllerIT.java` | 🟡 | `[X]` |
| T004 | Criar esqueleto de testes unitários no frontend Next.js para upload de documentos e seletor de agentes | T001 | `[//]` | `frontend/tests/agent-chat-upload.test.ts` | 🟡 | `[X]` |

## Fase 3, Núcleo

<!-- Lógica central da feature. -->

| ID | Descrição | Dependências | Paralelismo | Arquivo alvo | Confidência | Status |
|----|-----------|--------------|-------------|--------------|-------------|--------|
| T005 | Desenvolver a entidade JPA `Agent` e seus respectivos repositórios na API Central | T001 | - | `java-core/src/main/java/com/company/core/domain/entities/Agent.java` | 🟢 | `[X]` |
| T006 | Desenvolver o controller e serviço de criação de agente (`POST /api/admin/agents`) com validação de ZIP e MinIO upload | T002, T005 | - | `java-core/src/main/java/com/company/core/interfaces/rest/AgentController.java` | 🟢 | `[X]` |
| T007 | Atualizar o controller de upload de documentos para aceitar o parâmetro opcional `agent_id` e persistir na entidade `Document` | T001, T005 | - | `java-core/src/main/java/com/company/core/interfaces/rest/DocumentController.java` | 🟢 | `[X]` |
| T008 | Atualizar a busca semântica RAG (Cosine similarity) para filtrar as pesquisas de chunks por `agent_id` ou `IS NULL` | T001, T005 | - | `rust-services/rag-worker/src/rabbitmq.rs` / `java-core/src/main/java/com/company/core/domain/repositories/DocumentChunkRepository.java` | 🟡 | `[X]` |
| T009 | Alterar o construtor de prompt do chat para obter as `system_instructions` da entidade do agente e aplicar no System Prompt do LLM | T005 | - | `java-core/src/main/java/com/company/core/application/ChatService.java` / `rust-services/rag-worker/src/rabbitmq.rs` | 🟡 | `[X]` |

## Fase 4, Integração

<!-- Cola com outras partes do sistema, contratos externos, ganchos. -->

| ID | Descrição | Dependências | Paralelismo | Arquivo alvo | Confidência | Status |
|----|-----------|--------------|-------------|--------------|-------------|--------|
| T010 | Implementar o endpoint de listagem de agentes (`GET /api/agents`) e vincular o `agent_id` na criação do chat | T005, T006 | - | `java-core/src/main/java/com/company/core/interfaces/rest/ChatController.java` / `java-core/src/main/java/com/company/core/interfaces/rest/ExecutionController.java` / `java-core/src/main/java/com/company/core/infrastructure/external/AgentExecutionEventListener.java` | 🟢 | `[X]` |
| T011 | Desenvolver o painel administrativo de criação de agentes via ZIP no frontend Next.js | T006 | `[//]` | `frontend/src/features/admin/components/AgentUploadManager.tsx` | 🟢 | `[X]` |
| T012 | Atualizar a janela de chat do Next.js com o dropdown de seleção de agentes e injeção do ID no envio de mensagens | T010 | - | `frontend/src/features/chat/ChatCanvas.tsx` | 🟢 | `[X]` |
| T013 | Desenvolver a interface de upload de documentos gerais no Next.js com barra de progresso e polling de status | T007 | `[//]` | `frontend/src/features/documents/components/DocumentUploadList.tsx` | 🟢 | `[X]` |

## Fase 5, Polimento

<!-- Logs, telemetria, mensagens de erro, documentação curta. -->

| ID | Descrição | Dependências | Paralelismo | Arquivo alvo | Confidência | Status |
|----|-----------|--------------|-------------|--------------|-------------|--------|
| T014 | Adicionar logs de auditoria detalhados no Spring Boot para eventos de agentes, uploads e chats isolados | T006, T009, T010 | - | `java-core/src/main/java/com/company/core/application/AuditService.java` / `java-core/src/main/java/com/company/core/application/AgentService.java` / `java-core/src/main/java/com/company/core/interfaces/rest/DocumentController.java` / `java-core/src/main/java/com/company/core/interfaces/rest/ExecutionController.java` | 🟡 | `[X]` |
| T015 | Atualizar a documentação técnica da API com os novos contratos de agente e uploads de documentos | T011, T012, T013 | - | `docs/architecture/api-spec.md` | 🟢 | `[X]` |

## Notas de execução

<!--
Reservado para /reversa-coding registrar avisos ou observações que surgiram durante a execução.
Não use isso para corrigir ações, edits manuais ficam fora desse arquivo, vão direto no código.
-->

## Histórico de alterações

| Data | Alteração | Autor |
|------|-----------|-------|
| 2026-06-15 | Versão inicial gerada por `/reversa-to-do` | reversa |
