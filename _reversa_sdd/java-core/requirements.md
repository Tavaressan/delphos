# Java Core

> Template do arquivo `requirements.md`. Foca no QUE a unit faz, não no como.

## Visão Geral
O Módulo `java-core` é a API Gateway principal e backend orquestrador construído em Spring Boot. Ele recebe chamadas HTTP, gerencia persistência (PostgreSQL), roteia tarefas para workers políglotas via RabbitMQ e devolve streaming SSE em tempo real para o frontend.

## Responsabilidades
- Expor endpoints CRUD para Agentes e Execuções.
- Manter o estado canônico do sistema (PostgreSQL + Flyway).
- Enviar payload de `AgentExecution` (prompt, agentId, tenant) para filas RabbitMQ.
- Receber callbacks de status via fila e repassar eventos em tempo real via Emitter SSE.

## Regras de Negócio
- [Validação Isolada] Cada query de banco deve restringir o acesso pelo `tenant_id` atrelado ao usuário/requisição. 🟢
- [Chat Genérico] A criação de um `AgentExecution` suporta receber `agentId` null/vazio. Neste caso, não insere um UUID fake. (Ref: ADR-001) 🟢
- [Cadeia de Estados] Execuções só progridem baseadas nos estados definidos (`REQUESTED -> QUEUED -> STARTED -> ...`). 🟢

## Requisitos Funcionais

| ID | Requisito | Prioridade | Critério de Aceite |
|----|-----------|-----------|-------------------|
| RF-01 | Criar Execução | Must | Um POST para `/api/executions` gera ID, seta estado `REQUESTED`, publica MQ e retorna stream HTTP 200. |
| RF-02 | Receber Eventos do Worker | Must | Listener do RabbitMQ atualiza tabela no banco (ex: `COMPLETED`) com base no ID da execução. |
| RF-03 | Listagem de Histórico | Should | Endpoint retorna paginado os AgentExecutions filtrados pelo Tenant (e possivelmente `ConversationId`). |

## Requisitos Não Funcionais

| Tipo | Requisito inferido | Evidência no código | Confiança |
|------|--------------------|---------------------|-----------|
| Concorrência | Assincronicidade do RabbitMQ para não travar threads Spring Web | `ExecutionController.java` | 🟢 |
| Resiliência | Flyway para migrações e Testcontainers para BDD CI | `build.gradle.kts` e commits | 🟢 |

## Critérios de Aceitação

```gherkin
Dado um POST válido para /api/executions
Quando a API processa a requisição
Então ela salva a intenção com status REQUESTED no DB
E publica mensagem na exchange "agent.execution.exchange"
E a resposta não fecha a conexão, mantendo Content-Type: text/event-stream
```

## Prioridade (MoSCoW)
| Requisito | MoSCoW | Justificativa |
|-----------|--------|---------------|
| Endpoints Core e Streaming | Must | Função principal da plataforma. |
| Listener RabbitMQ | Must | Sem ele, sistema fica cego sobre o que ocorreu nos workers. |
| Migrações Flyway | Must | Estruturação de Schema é crítica para a engine RAG. |

## Rastreabilidade de Código

| Arquivo | Função / Classe | Cobertura |
|---------|-----------------|-----------|
| `java-core/src/main/java/.../ExecutionController.java` | Roteamento e SSE | 🟢 |
| `java-core/src/main/resources/db/migration/` | Flyway V13... | 🟢 |
