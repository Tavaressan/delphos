# Legacy Impact: Multi-agent Orchestration — Delegação de tarefas entre agentes

> Identificador: `018-multi-agent-orchestration`
> Data: `2026-06-25`

Este documento apresenta o mapeamento de impactos conceituais e físicos sobre o legado da plataforma **Alfabra Vector** causados pela evolução desta feature.

## 1. Mapeamento de Arquivos e Componentes Afetados

| Arquivo afetado | Componente | Tipo | Severidade | Justificativa |
|-----------------|------------|------|------------|---------------|
| `python-services/crew-worker/src/main.py` | `crew-worker` (`_reversa_sdd/architecture.md#1`) | regra-alterada | MEDIUM | Declaração e associação das novas filas dedicadas de delegação no RabbitMQ. |
| `rust-services/rag-worker/src/rabbitmq.rs` | `rag-worker` (`_reversa_sdd/architecture.md#1`) | regra-alterada | MEDIUM | Declaração das filas no Rust e spawn de tasks Tokio paralelas para consumo concorrente. |
| `java-core/src/main/java/com/company/core/domain/entities/Agent.java` | `java-core` (`_reversa_sdd/architecture.md#1`) | delta-de-dados | LOW | Adição do campo `manifest_config` para persistência das ferramentas do agente. |
| `java-core/src/main/resources/db/migration/V9__add_agent_manifest_config.sql` | `java-core` (`_reversa_sdd/architecture.md#1`) | delta-de-dados | LOW | Migração Flyway para persistência da coluna `manifest_config`. |
| `java-core/src/main/java/com/company/core/application/AgentService.java` | `java-core` (`_reversa_sdd/architecture.md#1`) | regra-alterada | MEDIUM | Extração e salvamento do `manifest.yaml` de dentro do ZIP de cadastro do agente. |
| `java-core/src/main/java/com/company/core/interfaces/rest/ExecutionController.java` | `java-core` (`_reversa_sdd/architecture.md#1`) | delta-de-contrato-externo | MEDIUM | Propagação do `manifest_config` no payload de publicação do RabbitMQ. |
| `python-services/crew-worker/src/tools/delegated_search_tool.py` | `crew-worker` (`_reversa_sdd/architecture.md#1`) | componente-novo | HIGH | Implementação da ferramenta de busca distribuída RAG com timeout, retry e fallback. |
| `python-services/crew-worker/src/runtime/crewai_adapter.py` | `crew-worker` (`_reversa_sdd/architecture.md#1`) | regra-alterada | MEDIUM | Inicialização dinâmica da ferramenta de busca baseada na configuração de manifesto. |

## 2. Diff Conceitual por Componente

### `crew-worker` (Python)
- **Antes:** O worker instanciava o agente do CrewAI com a ferramenta local de busca síncrona `search_knowledge_base`, que acessava diretamente o Postgres local via psycopg2.
- **Depois:** O worker lê o `manifest_config` e, caso a delegação esteja habilitada, ativa a ferramenta `DelegatedSearchTool`, que envia a busca assincronamente via RabbitMQ ao especialista `rag-worker`.

### `rag-worker` (Rust)
- **Antes:** O worker apenas consumia jobs da fila `agent.retrieval.queue` e processava a busca de forma linear.
- **Depois:** O worker roda duas streams assíncronas do Tokio em paralelo, permitindo escutar jobs dedicados de delegação e devolver respostas com similaridade de cosseno na fila de eventos.

### `java-core` (Spring Boot)
- **Antes:** O cadastro de agentes apenas validava o tamanho do ZIP e o arquivo `.md` de diretrizes comportamentais.
- **Depois:** O cadastro analisa opcionalmente a presença de `manifest.yaml`, extrai e armazena suas configurações para enviá-las junto ao payload de execução no RabbitMQ.

## 3. Preservadas

As seguintes regras 🟢 do `_reversa_sdd/domain.md` continuam intactas:
- **Regra ZIP de Cadastro:** A obrigatoriedade de haver pelo menos um arquivo `.md` na raiz e o limite de tamanho descompactado de 20MB.
- **Regra de Isolamento de Tenant:** Toda busca vetorial continua sendo isolada pelo campo `tenant_id` tanto no `rag-worker` quanto no `crew-worker`.
- **Regra de Mensagens da Execução:** A persistência da mensagem do usuário e da resposta final do assistente no banco de dados relational Java.

## 4. Modificadas

As seguintes regras 🟢 do `_reversa_sdd/domain.md` foram alteradas ou estendidas:
- **Cadastro do Agente (ZIP):** Além de extrair system instructions de `.md`, o sistema agora descobre a lista de ferramentas autorizadas lendo o `manifest.yaml` na raiz do ZIP.
- **Execução do Chat (CrewAI RAG):** O worker CrewAI passa a possuir capacidade de acionar RAG de forma distribuída (RPC via RabbitMQ com timeout de 4 segundos e 3 tentativas de retry) em vez de consultar diretamente o PostgreSQL local de forma monolítica.
