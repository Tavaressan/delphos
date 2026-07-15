# Análise Técnica do Código (Code Analysis)

> Gerado automaticamente pelo `reversa-archaeologist`

## Módulo: frontend

O `frontend` é uma aplicação React em Next.js implementada com um padrão limpo (Clean Architecture) que divide responsabilidades entre `domain`, `infrastructure` e `app` (UI/Rotas).

### Fluxo de Controle Principal
* As rotas (`app/`) instanciam componentes visuais que não contêm regras de negócio complexas.
* A lógica flui dos hooks/UI para instâncias de `UseCases` (ex: `SubmitExecutionUseCase`, `CreateScheduleUseCase`).
* Os `UseCases` simplesmente orquestram as chamadas, delegando a persistência e a lógica de comunicação para instâncias de repositórios (ex: `executionRepository`, `scheduleRepository`) que implementam interfaces do domínio.

### Algoritmos e Lógica
* A validação de payloads e estruturação visual ocorre na camada de UI e Adapters.
* Os Use Cases agem como pass-through limpos que retornam promessas tipadas (ex: `Promise<AgentExecution>`). O sistema enfatiza fortemente a tipagem.

### Metadados e Configurações
* O frontend gerencia parâmetros configuráveis como:
  * Modelos de LLM (`gemini-1.5-pro`, `gemini-1.5-flash`, `gemini-2.0-flash`)
  * Embeddings (`text-embedding-004`)
  * Configurações de servidores MCP (stdio vs sse) e skills dos agentes.

## Módulo: java-core

O `java-core` é um backend Spring Boot robusto que utiliza JPA/Hibernate, Spring Security e AMQP (RabbitMQ).

### Fluxo de Controle Principal
* **Controllers (`ExecutionController`)**: Recebem as intenções da interface de usuário, executam validações de tenant e persistência, e disparam eventos assíncronos.
* **Comunicação Assíncrona**: O método `submitExecution` ilustra o core do sistema. Em vez de bloquear para aguardar a IA, ele:
  1. Cria as entidades rastreáveis (`Conversation`, `AgentExecution`).
  2. Publica no RabbitMQ (`agent.execution.exchange`).
  3. Responde o `executionId` imediatamente para a interface assíncrona.

### Algoritmos e Lógica
* **Fail-safes de Broker**: Se a publicação AMQP lança exceção (ex: RabbitMQ indisponível), o sistema aborta o pipeline para aquele job, atualiza a execução para `FAILED` e responde 500 sem comprometer a thread.
* **Fallbacks Cognitivos**: O campo `agentId` é opcional, permitindo chat livre ou com agente específico.

### Metadados e Configurações
* O Flyway (via `spring-boot-starter-flyway`) gerencia o schema do PostgreSQL.
* Utiliza extensamente o Testcontainers para os testes BDD com Cucumber (provando alta resiliência).

## Módulo: rust-services

O ecossistema `rust-services` opera como um `Cargo workspace` contendo múltiplos serviços de background (`ingestion-worker`, `rag-worker`, etc.), conectados via RabbitMQ e altamente paralelos graças ao `tokio`.

### Fluxo de Controle Principal
* **Worker Loop**: Inicia se conectando ao PostgreSQL (`sqlx::postgres::PgPool`) e ao RabbitMQ. Processa as mensagens de forma assíncrona recebendo requisições que caem no `rag-worker`.
* Os workers não rodam requisições HTTP REST normais, mas abrem porta `8000` via `axum` apenas para Liveness/Readiness probes (`/healthz`).

### Algoritmos e Lógica
* **Semântica SQL / Busca Vetorial**: O `retrieval.rs` constrói queries raw para o `pgvector`, utilizando busca aproximada de vizinhos (K-NN) com distância de cosseno: `1 - (dc.embedding <=> $1::vector) as similarity`.
* Segurança forte contra injeção de prompt (`escape_chunk_content` no Rust limpa os chunks que saem do DB antes de passarem pro LLM).

### Metadados e Configurações
* O módulo `gcp-auth` autêntica os workers rust invisivelmente no Vertex AI.
* Lê credenciais e strings de banco através do `config::Config::from_env()`.

## Módulo: python-services

Este módulo contém o `crew-worker`, um worker Python especializado que atua como orquestrador cognitivo acionando o framework CrewAI para interagir com a Vertex AI.

### Fluxo de Controle Principal
* **Ciclo de Consumo RabbitMQ**: Recebe as execuções da fila `agent.execution.jobs` via `pika` (RabbitMQ). Se falhar durante o processamento, envia NACK. Em sucesso, ACK.
* **Ciclo Cognitivo (`CrewAiRuntimeAdapter`)**:
  1. Proteção: Inicia higienizando o prompt para prevenir Prompt Injection.
  2. RAG Primário: Busca o embedding no `embedding-service` e em seguida executa uma busca K-NN no banco PostgreSQL (`pgvector`), trazendo contexto relevante.
  3. Contexto de Ferramentas: Dependendo do "Tag" do agente no banco (ex: "piso", "orquestrador"), anexa funções nativas de `tool_calls` como `calculate_floor_specs` ou roteadores de delegação (`route_to_agent`).
  4. Execução LLM: Prepara um prompt encapsulando XML (`<knowledge_base_chunks>`) e aciona o CrewAI kickoff, resultando num processamento iterativo autônomo.

### Algoritmos e Lógica
* **Tool Routing e Delegation**: Permite delegar perguntas difíceis para sub-agentes no próprio ciclo.
* Emissão de Eventos MQ para rastreabilidade UI (`ToolCallStarted`, `RetrievalCompleted`).

## Módulo: infrastructure

O módulo reúne a topologia e scripts de provisionamento.

### Metadados e Configurações
* **Proxy**: Migrou-se para Caddy (pastas físicas refletem `caddy/`, embora a doc cite nginx antigo), providenciando terminação TLS automática.
* **Containers**: Orquestrado em ambiente de dev por Docker Compose (raiz) e preparado para `kubernetes/` em produção.
* **Banco**: Possui scripts em `postgres/` para habilitar a extensão `pgvector` na inicialização do container de DB vazio.
* **Segurança**: Existe um script `setup_firewall.sh` voltado à proteção de portas expostas (como a 5672 do RabbitMQ) a nível de host.
