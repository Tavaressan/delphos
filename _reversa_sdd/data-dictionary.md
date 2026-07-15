# Dicionário de Dados Completo

> Gerado automaticamente pelo `reversa-archaeologist`

## Módulo: frontend

As entidades TypeScript abaixo representam os modelos canônicos usados pela UI para exibir informações:

### Entidade: `AgentExecution`
Representa a execução de um workflow ou tarefa por um agente.
* `id` (string, required): UUID da execução
* `conversationId` (string, required): UUID da conversa
* `agentId` (string, required): UUID do agente
* `status` (ExecutionStatus, required): Estado da execução
* `prompt` (string, required): Instrução fornecida ao agente
* `output` (string, optional)
* `errorMessage` (string, optional)

### Entidade: `Schedule`
Agendamentos de tarefas via cron para agentes específicos.
* `id` (string, required): UUID do agendamento
* `agentId` (string, required): UUID do agente alvo
* `cronExpression` (string, required): Expressão cron tradicional
* `prompt` (string, required): Ação a ser executada na data
* `status` (ScheduleStatus, required): 'ACTIVE' ou 'CANCELLED'

### Entidade: `Message`
Representa as interações numa conversa de chat.
* `id` (string, optional)
* `role` (MessageRole, required): Papel do autor (user, system, agent)
* `content` (string, required): Texto da mensagem
* `toolCall` (ToolCallPayload, optional): Invocação de ferramenta caso haja interação.

### Configurações de IA (`AgentModelConfig` e `AgentKnowledgeBaseConfig`)
* `llmModel` (enum): 'gemini-1.5-pro' | 'gemini-1.5-flash' | 'gemini-2.0-flash'
* `embeddingModel` (enum): 'text-embedding-004' | 'text-multilingual-embedding-002'
* `temperature` / `topP` (number): Parâmetros de tuning.
* `dimension` (number): Dimensão do vetor.

## Módulo: java-core

Este módulo possui mapeamento JPA (Hibernate) de alta fidelidade para persistência.

### Entidade JPA: `AgentExecution` (Tabela `agent_executions`)
* `id` (UUID, PK): Auto gerado
* `conversation_id` (UUID, FK): Mapeado ManyToOne para `Conversation`
* `agent_id` (UUID)
* `tenant_id` (UUID, NotNull)
* `status` (String, max 50): 'REQUESTED', 'QUEUED', 'DISPATCHED', 'STARTED', 'THINKING', 'TOOL_RUNNING', 'WAITING_TOOL', 'RETRIEVAL_RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED', 'TIMEOUT'
* `prompt_final` (Text, NotNull): Instrução base processada
* `output_result` (Text): Resultado consolidado da IA
* `error_message` (Text): Logs de erro
* `tokens_consumed` (Integer): Rastreio financeiro/cota
* `started_at` / `finished_at` / `created_at` (Instant): Auditoria de tempos

## Módulo: python-services

Lida fortemente com payloads orientados a eventos via RabbitMQ em vez de tabelas canônicas de banco.

### Modelos de Eventos / Payload
Eventos roteados na key `agent.execution.events`:
* **AgentExecutionStarted** / **AgentExecutionFinished**: Marca início/fim da engine LLM.
* **RetrievalStarted** / **RetrievalCompleted**: Notifica chunks recuperados (`documentId`, `chunkId`, `similarityScore`).
* **ToolCallStarted** / **ToolCallFinished**: Detalha invocações autônomas do modelo a funções como `calculate_floor_specs`, contendo latência (`executionTimeMs`).

### Pydantic Models
* **`QuotaValue`**: Valida a cota em processamento. Propriedades: `limit` (int, >0) e `resource` (str, not empty).
