# Dicionário de Dados: frontend

## `User`
- **id** (`string`): UUID
- **username** (`string`): Opcional
- **email** (`string`): Obrigatório
- **firstName** (`string`): Opcional
- **lastName** (`string`): Opcional
- **status** (`'ACTIVE' | 'INACTIVE'`): Status do usuário
- **role** (`'ROLE_USER' | 'ROLE_ADMIN'`): Papel do usuário

## `Agent`
- **id** (`string`): Identificador único
- **name** (`string`): Nome do agente
- **version** (`string`): Versão do pacote do agente
- **tag** (`string`): Tag de categorização
- **status** (`AgentStatus`): Status (DRAFT, IN_REVIEW, PUBLISHED, ARCHIVED)
- **description** (`string`): Descrição do agente
- **tenant** (`string`): Identificador do tenant do agente

## `Document`
- **id** (`string`): UUID
- **name** (`string`): Nome do arquivo
- **size** (`string`): Tamanho formatado
- **chunks** (`number`): Quantidade de chunks particionados
- **status** (`DocumentStatus`): Status (UPLOADING, PROCESSING, INDEXED, FAILED)
- **date** (`string`): Data de upload/processamento
- **author** (`string`): Autor

## `Conversation`
- **id** (`string`): UUID
- **title** (`string`): Título automático da conversa
- **userId** (`string`): ID do usuário
- **tenantId** (`string`): ID do tenant
- **createdAt** (`string`): Data de criação

## `Message`
- **id** (`string`): UUID
- **conversationId** (`string`): UUID da conversa pertencente
- **role** (`MessageRole`): Papel de envio (USER, ASSISTANT, SYSTEM)
- **content** (`string`): Conteúdo textual
- **createdAt** (`string`): Data
- **citation** (`string`): Referências
- **sources** (`RetrievalSource[]`): Fontes RAG
- **toolCall** (`ToolCallPayload`): Payload de invocação de ferramentas pelo agente

## `AgentExecution`
- **id** (`string`): UUID
- **conversationId** (`string`): UUID
- **agentId** (`string`): UUID
- **status** (`ExecutionStatus`): REQUESTED, QUEUED, THINKING, TOOL_RUNNING, COMPLETED, FAILED
- **prompt** (`string`): Ação requerida
- **output** (`string | null`): Resposta do agente
- **errorMessage** (`string | null`): Erro, se houver
- **tokensConsumed** (`number | null`): Contagem de tokens

## `Schedule`
- **id** (`string`): UUID
- **agentId** (`string`): UUID
- **agentName** (`string | null`): Nome do agente
- **cronExpression** (`string`): Expressão Cron
- **prompt** (`string`): Prompt para a execução
- **status** (`'ACTIVE' | 'CANCELLED'`): Status da agenda
- **createdAt** (`string`): Data de criação
- **nextRunAt** (`string | null`): Próxima data de execução

## `McpServerConfig`
- **id** (`string`): ID interno
- **name** (`string`): Nome do servidor
- **command** (`string`): Comando ou URL
- **transport** (`'stdio' | 'sse'`): Protocolo de transporte

## `AgentModelConfig` & `AgentKnowledgeBaseConfig`
- **llmModel** (`LlmModel`): Modelos suportados (gemini-1.5-pro, etc)
- **temperature** (`number`): 0.0 a 1.0
- **topP** (`number`): 0.0 a 1.0
- **embeddingModel** (`EmbeddingModel`): text-embedding-004, etc
- **dimension** (`number`): Dimensão do vetor

# Dicionário de Dados: java-core

## `AgentExecution` (Detalhado do backend)
- **id** (`UUID`): Chave primária
- **conversation** (`Conversation`): Relacionamento com conversa
- **agentId** (`UUID`): ID do agente
- **tenantId** (`UUID`): ID do tenant
- **status** (`String`): REQUESTED, QUEUED, STARTED, THINKING, TOOL_RUNNING, RETRIEVAL_RUNNING, COMPLETED, FAILED, CANCELLED, TIMEOUT
- **promptFinal** (`String`): Prompt consolidado
- **outputResult** (`String`): Resultado da execução
- **errorMessage** (`String`): Detalhe do erro unificado
- **tokensConsumed** (`Integer`): Contagem de tokens (padrão 0)
- **startedAt**, **finishedAt**, **createdAt** (`Instant`): Controle de tempo

## `AgentCustomTool`
- **id** (`UUID`): Chave primária
- **agent** (`Agent`): Relacionamento
- **toolName** (`String`): Nome extraído e validado (ex: sum_values)
- **scriptContent** (`String`): Conteúdo do script em Python
- **createdAt** (`Instant`)

## `ToolCall`
- **id** (`UUID`): Chave primária mapeada ao ID do evento payload
- **agentExecution** (`AgentExecution`): Relacionamento
- **toolName** (`String`): Nome da ferramenta acionada
- **inputPayload** (`String`): Payload serializado (JSON)
- **outputResponse** (`String`): Resposta pós execução
- **executionTimeMs** (`Integer`): Tempo gasto em ms
- **status** (`String`): STARTED, COMPLETED, FAILED
- **errorLog** (`String`): Log de erro da ferramenta

## `RetrievalEvent`
- **id** (`UUID`): Chave primária
- **agentExecution** (`AgentExecution`): Relacionamento
- **documentId** (`UUID`): Documento recuperado
- **chunkId** (`UUID`): Chunk exato
- **similarityScore** (`Double`): Pontuação de semelhança do RAG
- **documentName** (`String`): Nome original do documento
- **retrievedContent** (`String`): Conteúdo retornado

## `AuditLog`
- **id** (`UUID`): Chave primária
- **user** (`User`): Usuário responsável
- **tenantId** (`UUID`): Tenant do usuário/ação
- **action** (`String`): Ação realizada (ex: CREATE_AGENT)
- **target** (`String`): Alvo
- **ipAddress**, **userAgent** (`String`): Contexto da request
- **details** (`String`): JSON customizado de detalhes da ação

# Dicionário de Dados: rust-services

## `IngestionJob` (RabbitMQ Payload)
- **document_id** (`UUID`): ID do documento
- **file_path** (`String`): Caminho no MinIO
- **tenant_id** (`UUID`): Tenant do documento
- **file_type** (`String`): Tipo (pdf, docx, txt, md)

## `EmbeddingsRequest` (embedding-service API)
- **input** (`List<String>`): Array de textos (chunks)
- **dimensions** (`Integer`): Opcional. Dimensão desejada para o vetor (default: 768)

## `EmbeddingsResponse` (embedding-service API)
- **object** (`String`): Tipo de objeto ('list')
- **data** (`List<EmbeddingData>`): Array de resultados contendo o index da array original e o vetor
- **model** (`String`): Nome do modelo
- **usage** (`Usage`): Metadados de uso (tokens de prompt e total)

## `document_chunks` (PostgreSQL / Ingestion Worker)
- **document_id** (`UUID`): Relacionamento
- **tenant_id** (`UUID`): Relacionamento / Segregação
- **chunk_index** (`Integer`): Posição sequencial do chunk
- **content** (`String`): Texto legível extraído
- **embedding** (`Vector`): Vetor nativo de pgvector para busca semântica

# Dicionário de Dados: python-services

## `QuotaValue` (Pydantic Model)
- **limit** (`int`): Limite de cota (deve ser maior ou igual a zero).
- **resource** (`str`): Nome do recurso (não pode ser vazio).

## `EventPayload` (Padrão de Eventos RabbitMQ)
- **eventId** (`str`): UUID único do evento
- **eventType** (`str`): `AgentExecutionStarted`, `RetrievalStarted`, `RetrievalCompleted`, `ToolCallStarted`, `ToolCallFinished`, `AgentExecutionFailed`
- **executionId** (`str`): UUID da execução
- **timestamp** (`str`): ISO-8601 (ex: `2026-08-26T10:00:00Z`)
- **payload** (`dict`): Varia conforme o eventType (ex: payload de RAG inclui `searchQuery`, `similarityScore`, `retrievedContent`)
