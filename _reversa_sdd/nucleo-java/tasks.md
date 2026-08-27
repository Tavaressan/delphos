# Núcleo Java, Tarefas de Implementação

## Pré-requisitos
- [ ] Banco de Dados PostgreSQL provisionado (com migrações Flyway/Liquibase rodadas).
- [ ] RabbitMQ acessível com Exchange e Filas DLQ criadas.
- [ ] MinIO local (ou mock) acessível e com bucket padrão `agents-data` criado.

## Tarefas

- [ ] T-01, Implementar Entidades e Repositórios JPA.
  - Origem no legado: Repositórios padrão Spring Data JPA e mapeamentos ERD.
  - Critério de pronto: Banco relacional armazena `Tenant`, `Agent`, `AgentCustomTool`, `AgentExecution`, `ToolCall` e `Document`.
  - Confiança: 🟢

- [ ] T-02, Endpoint e lógica de Validação de ZIP de Agente (`AgentService`).
  - Origem no legado: `AgentService.parseZip`
  - Critério de pronto: Limita upload a 20MB. Falha caso arquivo raiz `.md` não exista. Rejeita paths `../`.
  - Confiança: 🟢

- [ ] T-03, Enfileiramento Sincronizado por Transação (TransactionSynchronizationManager).
  - Origem no legado: `AgentService.createAgent` e `DocumentUpload`
  - Critério de pronto: Mensagens para `document.ingestion.jobs` e `agent.execution.jobs` só aparecem na fila após commit bancário finalizado. Se falhar, fila fica vazia.
  - Confiança: 🟢

- [ ] T-04, Listener assíncrono de Eventos de IA (`AgentExecutionEventListener`).
  - Origem no legado: Filas do RabbitMQ AMQP.
  - Critério de pronto: Eventos do tipo `RetrievalStarted`, `ToolCallFinished` etc. alteram corretamente o banco (`status=RETRIEVAL_RUNNING`) ou salvam a resposta num novo registro `ToolCall`.
  - Confiança: 🟢

- [ ] T-05, Error Handler Resiliente no Listener (`REQUIRES_NEW`).
  - Origem no legado: `AgentExecutionEventListener`
  - Critério de pronto: Ao capturar um exception grave no parser JSON da fila, abre transação paralela, salva falha crítica no `AgentExecution`, rejeita AMQP pra DLQ sem criar loop infinito.
  - Confiança: 🟢

## Tarefas de Teste

- [ ] TT-01, Teste unitário de Parse de ZIPs forjando vulnerabilidade de Path Traversal (`../file`). Esperado erro de validação.
- [ ] TT-02, Integração Testcontainers para validar o ciclo Transacional do PostgreSQL emitindo evento real no RabbitMQ containerizado.
- [ ] TT-03, (BDD) - Feature 01-agent-execution-audit testando o `AuditLog` por IP ao ser invocado endpoints REST `DELETE /api/knowledge`.

## Tarefas de Migração de Dados (se aplicável)
- *Nenhuma, as migrações já são mantidas estruturalmente.*

## Ordem Sugerida
1. T-01 (Persistência Core)
2. T-04 e T-05 (RabbitMQ Engine - crucial para o ecossistema RAG/Python funcionar desatrelado)
3. T-02 e T-03 (Serviços e APIs de Usuário)

## Lacunas Pendentes (🔴)
- Avaliar se a paginação imposta (em APIs get list) tem limites hardcoded que poderiam vazar memória caso passem tamanho exagerado pela URL, caso o Spring não limite o `Pageable` global.
