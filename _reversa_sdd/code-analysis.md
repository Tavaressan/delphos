# Análise Técnica Consolidada (Code Analysis) — Alfabra-Vector

Este documento fornece a especificação técnica dos componentes, fluxos de controle e dicionário de dados do sistema legado **Alfabra-Vector**, extraídos sob a diretriz de nível **Essencial**.

---

## 1. Visão Geral da Arquitetura

O **Alfabra-Vector** é uma plataforma corporativa de Inteligência Artificial e Retrieval-Augmented Generation (RAG) voltada para o domínio de transportes verticais (elevadores e escadas rolantes). O sistema é estruturado como um monorepo composto por:

- **Frontend (`frontend/`)**: Interface do usuário construída com Next.js (React) e TypeScript.
- **Java Core (`java-core/`)**: Backend de orquestração e API Rest estruturado em Spring Boot 3.2.5.
- **Rust Services (`rust-services/`)**: Workers de alto desempenho para ingestão de dados, busca vetorial e controle de fluxos (DAG).
- **Python Services (`python-services/`)**: Workers baseados em CrewAI para orquestração de múltiplos agentes de IA.
- **Infrastructure (`infrastructure/`)**: Gateway Caddy para proxy reverso e script de firewall UFW.

### Desenho do Fluxo Operacional (REST a Workers)

```
[Frontend (useExecution)] 
       │ 
       ▼ (HTTP POST /api/executions)
[Java Core (ExecutionController)]
       │
       ├─► (Salva Conversation/Message/AgentExecution no Postgres)
       ▼ (Publica em RabbitMQ: agent.execution.jobs)
[Python/Rust Workers] ◄───► [embedding-service (Rust)] ◄───► [PostgreSQL (pgvector)]
       │
       ▼ (Publica eventos em RabbitMQ: agent.execution.events)
[Java Core (AgentExecutionEventListener)] 
       │
       ▼ (Atualiza tabela no Postgres)
[Frontend Polling (2s)] ◄─── (HTTP GET /api/executions/{id})
```

---

## 2. Análise por Módulo e Fluxos de Controle

### 2.1. Módulo: Frontend

- **Finalidade**: Interface gráfica para envio de prompts, criação de agentes, upload de conhecimento e monitoramento de execuções.
- **Fluxo de Controle - Submissão e Polling (Texto)**:
  1. O usuário submete um prompt através do componente `ChatCanvas`.
  2. O hook [useExecution.ts](file:///Users/vitortavares/Desktop/Alfabra-Vector/frontend/src/hooks/useExecution.ts) intercepta e inicia o estado `REQUESTED`.
  3. Envia uma requisição HTTP POST para `/api/executions`.
  4. Ao obter resposta do backend com o `executionId`, altera a timeline para o estado `QUEUED`.
  5. Inicia um polling periódico via `setInterval` a cada 2 segundos.
  6. A cada tick do polling, chama a API HTTP GET `/api/executions/{id}`.
  7. A timeline transiciona de acordo com o status recebido: `QUEUED` ➔ `THINKING` ➔ `TOOL_RUNNING` ➔ `COMPLETED` / `FAILED`.
  8. **Tratamento de Exceções**: Se o tempo total exceder 2 minutos (60 tentativas), interrompe o polling, define o erro como Timeout e transiciona a execução para `FAILED` localmente.

---

### 2.2. Módulo: Java Core

- **Finalidade**: API Gateway principal do sistema, manipulação de persistência (JPA) e orquestração de eventos de arquivos de conhecimento.
- **Fluxo de Controle - Cadastro de Agentes ([AgentService.java](file:///Users/vitortavares/Desktop/Alfabra-Vector/java-core/src/main/java/com/company/core/application/AgentService.java))**:
  1. Recebe um arquivo ZIP contendo os dados do agente.
  2. **Validação**: Verifica se o ZIP está vazio ou se o tamanho total descompactado excede o limite de **20MB** (lança `IllegalArgumentException`).
  3. **Validação**: Varre o ZIP e exige a existência de pelo menos um arquivo `.md` na raiz. O conteúdo do primeiro `.md` encontrado é extraído e definido na propriedade `systemInstructions` do agente.
  4. Persiste o `Agent` no banco PostgreSQL com o status inicial.
  5. Envia o arquivo ZIP original para o bucket MinIO em `agents-data/agent-<id>/agent.zip`.
  6. Varre novamente o ZIP, extrai individualmente os arquivos de conhecimento com extensões `.pdf`, `.docx`, `.txt`, `.md`, enviando-os ao MinIO.
  7. Para cada arquivo de conhecimento aceito, cria um registro `Document` com status `PROCESSING` e publica um job de ingestão no RabbitMQ na exchange `agent.execution.exchange` (routing key: `document.ingestion.jobs`).

- **Fluxo de Controle - Roteamento de Eventos ([AgentExecutionEventListener.java](file:///Users/vitortavares/Desktop/Alfabra-Vector/java-core/src/main/java/com/company/core/infrastructure/external/AgentExecutionEventListener.java))**:
  1. Escuta eventos publicados no RabbitMQ na fila `agent.execution.events`.
  2. Parseia o payload da mensagem JSON para identificar `eventType` e `executionId`.
  3. Atualiza o status correspondente de `AgentExecution` no banco:
     - `AgentExecutionStarted` ➔ Status `STARTED`.
     - `RetrievalStarted` ➔ Status `RETRIEVAL_RUNNING`.
     - `RetrievalCompleted` ➔ Status `THINKING` (e cria um registro de similaridade em `RetrievalEvent`).
     - `ToolCallStarted` ➔ Status `TOOL_RUNNING` (e insere em `ToolCall`).
     - `ToolCallFinished` ➔ Status `THINKING` (e atualiza o registro do `ToolCall`).
     - `AgentExecutionFinished` ➔ Status `COMPLETED` (salva o output final e insere a resposta do assistente no histórico do chat `Message`).
     - `AgentExecutionFailed` ➔ Status `FAILED` (grava o log de erro `errorMessage`).

---

### 2.3. Módulo: Rust Services

- **Finalidade**: Consumo assíncrono de tarefas pesadas de ingestão, busca vetorial e processamento de prompts via RAG.
- **Fluxo de Controle - Execução de RAG ([rabbitmq.rs](file:///Users/vitortavares/Desktop/Alfabra-Vector/rust-services/rag-worker/src/rabbitmq.rs))**:
  1. O worker `rag-worker` consome tarefas na fila RabbitMQ `agent.retrieval.queue`.
  2. Publica o evento `RetrievalStarted` na fila de logs/events.
  3. Dispara uma requisição HTTP POST para o `embedding-service` para converter a query de busca em um vetor de 768 dimensões.
  4. Realiza uma busca vetorial no PostgreSQL por similaridade de cosseno usando o operador `<=>` do pgvector (limitado aos top 5 chunks). A busca filtra pelo `tenant_id` e isola os documentos associados ao `agent_id` correspondente.
  5. Recupera as diretrizes operacionais do agente na tabela `agents` (se ausente, usa o prompt padrão Alfabra).
  6. Monta o contexto final concatenando os 5 chunks com scores de similaridade e formata o payload para o Gemini.
  7. Gera o token OAuth usando a biblioteca local `shared::gcp::GcpAuthenticator` e dispara a chamada para a API oficial do Vertex AI Gemini (`generateContent`).
  8. Publica a resposta obtida em `RetrievalCompleted` com o texto final e detalhes de chunks de origem.
  9. **Tratamento de Exceções**: Se qualquer chamada de rede falhar, publica o evento `AgentExecutionFailed`.

---

### 2.4. Módulo: Python Services

- **Finalidade**: Orquestrar pipelines cognitivos mais complexos utilizando agentes inteligentes.
- **Fluxo de Controle - Execução via CrewAI ([crewai_adapter.py](file:///Users/vitortavares/Desktop/Alfabra-Vector/python-services/crew-worker/src/runtime/crewai_adapter.py))**:
  1. Consome mensagens na fila `agent.execution.jobs`.
  2. Publica `AgentExecutionStarted` e executa um fluxo de busca inicial na base vetorial (RAG) direto via psycopg2.
  3. Instancia ferramentas locais (`@tool`):
     - `calculate_sandbox_quota`: Calcula o total de tokens do sandbox usados por um tenant. Publica eventos de início e fim da ferramenta no RabbitMQ.
     - `search_knowledge_base`: Expõe a busca vetorial por similaridade diretamente à LLM para buscas sob demanda.
  4. Define o agente do CrewAI `Elevator Specialist` com goal e backstory técnicos focados em transporte vertical da Alfabra.
  5. Cria uma `Task` com o prompt do usuário injetando as ferramentas e o contexto inicial.
  6. Executa a orquestração do CrewAI sequencialmente via `kickoff()` e publica a resposta gerada com status `AgentExecutionFinished`.

---

### 2.5. Módulo: Infrastructure

- **Finalidade**: Roteamento unificado externo e segurança local de portas na máquina host.
- **Fluxo de Controle - Roteamento Caddy e Firewall**:
  1. O Caddy Server escuta nas portas HTTP `80` e HTTPS `443` utilizando DuckDNS.
  2. Requisições que começam com `/api/*` ou `/actuator/*` são encaminhadas diretamente para o Spring Boot backend na porta `core:8080`.
  3. Todas as demais requisições (rotas estáticas e dinâmicas da Web UI) são encaminhadas ao Next.js frontend na porta `frontend:3000`.
  4. O script [setup_firewall.sh](file:///Users/vitortavares/Desktop/Alfabra-Vector/infrastructure/setup_firewall.sh) bloqueia acessos externos diretos para as portas do Postgres (pgvector), Redis, MinIO e RabbitMQ, permitindo apenas tráfego interno no Docker. SSH é restrito a `INFRA_IP_RANGE` e Web às subredes da empresa `CORP_WHITELIST_RANGE`.

---

## 3. Dicionário de Dados Resumido

Abaixo estão as tabelas consolidadas representando os modelos e entidades extraídos diretamente do código-fonte do monorepo.

### 3.1. Entidade: User
*Mapeada em:* [entities/index.ts](file:///Users/vitortavares/Desktop/Alfabra-Vector/frontend/src/domain/entities/index.ts) / [User.java](file:///Users/vitortavares/Desktop/Alfabra-Vector/java-core/src/main/java/com/company/core/domain/entities/User.java)

| Campo | Tipo | Obrigatório | Descrição | Confiança |
|-------|------|-------------|-----------|-----------|
| `id` | UUID / String | Sim | Identificador único do usuário. | 🟢 CONFIRMADO |
| `username` | String | Sim | Nome de login único. | 🟢 CONFIRMADO |
| `email` | String | Sim | Email do usuário. | 🟢 CONFIRMADO |
| `firstName` | String | Não | Primeiro nome. | 🟢 CONFIRMADO |
| `lastName` | String | Não | Sobrenome. | 🟢 CONFIRMADO |
| `status` | String | Sim | Estado do registro ('ACTIVE', 'INACTIVE'). | 🟢 CONFIRMADO |

---

### 3.2. Entidade: Agent
*Mapeada em:* [entities/index.ts](file:///Users/vitortavares/Desktop/Alfabra-Vector/frontend/src/domain/entities/index.ts) / [Agent.java](file:///Users/vitortavares/Desktop/Alfabra-Vector/java-core/src/main/java/com/company/core/domain/entities/Agent.java)

| Campo | Tipo | Obrigatório | Descrição | Confiança |
|-------|------|-------------|-----------|-----------|
| `id` | UUID / String | Sim | Identificador único do agente. | 🟢 CONFIRMADO |
| `name` | String | Sim | Nome descritivo do agente. | 🟢 CONFIRMADO |
| `systemInstructions` | String | Não | Instruções comportamentais extraídas do ZIP. | 🟢 CONFIRMADO |
| `zipPath` | String | Não | Caminho do arquivo zip original no MinIO. | 🟢 CONFIRMADO |
| `tenantId` | UUID / String | Sim | Identificador do tenant de isolamento. | 🟢 CONFIRMADO |

---

### 3.3. Entidade: Document
*Mapeada em:* [entities/index.ts](file:///Users/vitortavares/Desktop/Alfabra-Vector/frontend/src/domain/entities/index.ts) / [Document.java](file:///Users/vitortavares/Desktop/Alfabra-Vector/java-core/src/main/java/com/company/core/domain/entities/Document.java)

| Campo | Tipo | Obrigatório | Descrição | Confiança |
|-------|------|-------------|-----------|-----------|
| `id` | UUID / String | Sim | Identificador do documento de conhecimento. | 🟢 CONFIRMADO |
| `name` | String | Sim | Nome do arquivo original. | 🟢 CONFIRMADO |
| `filePath` | String | Sim | Caminho físico no MinIO. | 🟢 CONFIRMADO |
| `fileSize` | Long / String | Sim | Tamanho do arquivo. | 🟢 CONFIRMADO |
| `fileType` | String | Sim | Extensão do arquivo (pdf, docx, txt, md). | 🟢 CONFIRMADO |
| `status` | String | Sim | Estado da ingestão ('UPLOADING', 'PROCESSING', 'INDEXED', 'FAILED'). | 🟢 CONFIRMADO |
| `tenantId` | UUID / String | Sim | Identificador do tenant. | 🟢 CONFIRMADO |

---

### 3.4. Entidade: AgentExecution
*Mapeada em:* [entities/index.ts](file:///Users/vitortavares/Desktop/Alfabra-Vector/frontend/src/domain/entities/index.ts) / [AgentExecution.java](file:///Users/vitortavares/Desktop/Alfabra-Vector/java-core/src/main/java/com/company/core/domain/entities/AgentExecution.java)

| Campo | Tipo | Obrigatório | Descrição | Confiança |
|-------|------|-------------|-----------|-----------|
| `id` | UUID / String | Sim | Identificador único da tarefa de execução. | 🟢 CONFIRMADO |
| `conversationId` | UUID / String | Sim | ID do chat de origem. | 🟢 CONFIRMADO |
| `agentId` | UUID / String | Sim | ID do agente executor. | 🟢 CONFIRMADO |
| `status` | String | Sim | Estado da execução ('REQUESTED', 'QUEUED', 'STARTED', 'RETRIEVAL_RUNNING', 'TOOL_RUNNING', 'THINKING', 'COMPLETED', 'FAILED'). | 🟢 CONFIRMADO |
| `promptFinal` | String | Sim | Prompt original formatado enviado pelo usuário. | 🟢 CONFIRMADO |
| `outputResult` | String | Não | Resposta consolidada gerada pela LLM. | 🟢 CONFIRMADO |
| `errorMessage` | String | Não | Detalhes do erro em caso de falha. | 🟢 CONFIRMADO |
| `tokensConsumed` | Integer | Não | Contagem de tokens consumidos no processamento. | 🟢 CONFIRMADO |
| `startedAt` | Instant / String | Sim | Timestamp de início do request. | 🟢 CONFIRMADO |
| `finishedAt` | Instant / String | Não | Timestamp de conclusão do processamento. | 🟢 CONFIRMADO |

---

### 3.5. Entidade: Message
*Mapeada em:* [entities/index.ts](file:///Users/vitortavares/Desktop/Alfabra-Vector/frontend/src/domain/entities/index.ts) / [Message.java](file:///Users/vitortavares/Desktop/Alfabra-Vector/java-core/src/main/java/com/company/core/domain/entities/Message.java)

| Campo | Tipo | Obrigatório | Descrição | Confiança |
|-------|------|-------------|-----------|-----------|
| `id` | UUID / String | Sim | Identificador único da mensagem no histórico. | 🟢 CONFIRMADO |
| `conversationId` | UUID / String | Sim | Relacionamento com o chat. | 🟢 CONFIRMADO |
| `authorRole` | String | Sim | Papel do emissor ('USER', 'ASSISTANT', 'SYSTEM'). | 🟢 CONFIRMADO |
| `content` | String | Sim | Texto da mensagem. | 🟢 CONFIRMADO |
| `createdAt` | Instant / String | Sim | Data de envio da mensagem. | 🟢 CONFIRMADO |
| `citation` | String | Não | Referência aos chunks ou documentos citados. | 🟡 INFERIDO |
