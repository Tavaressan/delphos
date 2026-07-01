# Actions: Multi-agent Orchestration — Delegação de tarefas entre agentes

> Identificador: `018-multi-agent-orchestration`
> Data: `2026-06-25`
> Roadmap: `_reversa_forward/018-multi-agent-orchestration/roadmap.md`

## Resumo

| Métrica | Valor |
|---------|-------|
| Total de ações | 12 |
| Paralelizáveis (`[//]`) | 4 |
| Maior cadeia de dependência | 6 (T001 → T005 → T006 → T010 → T011 → T012) |

## Fase 1, Preparação

<!-- Setup, scaffolding, migrações iniciais, configuração de infraestrutura local. -->

| ID | Descrição | Dependências | Paralelismo | Arquivo alvo | Confidência | Status |
|----|-----------|--------------|-------------|--------------|-------------|--------|
| T001 | Declarar as novas filas `agent.retrieval.delegated.jobs` e `agent.retrieval.delegated.events` no RabbitMQ, integrando no setup do pika do `crew-worker`. | - | - | `python-services/crew-worker/src/main.py` | 🟢 | `[X]` |
| T002 | Declarar as filas equivalentes no consumer do `rag-worker` em Rust. | - | `[//]` | `rust-services/rag-worker/src/rabbitmq.rs` | 🟢 | `[X]` |
| T003 | Criar o parser para o `manifest.yaml` no Java Core (`AgentService`) para extrair a lista de ferramentas habilitadas a partir do ZIP. | - | `[//]` | `java-core/src/main/java/com/company/core/application/AgentService.java` | 🟢 | `[X]` |

## Fase 2, Testes

<!-- Testes que precisam existir antes ou logo após o núcleo. Omitir se a equipe não pratica TDD. -->

| ID | Descrição | Dependências | Paralelismo | Arquivo alvo | Confidência | Status |
|----|-----------|--------------|-------------|--------------|-------------|--------|
| T004 | Criar testes unitários para a validação e parsing do `manifest.yaml` no `AgentService`. | T003 | `[//]` | `java-core/src/test/java/com/company/core/application/AgentServiceTest.java` | 🟢 | `[X]` |
| T005 | Criar testes unitários mockados no `crew-worker` para a nova ferramenta CrewAI que faz a chamada de busca via RabbitMQ, cobrindo o timeout de 4s e a retentativa de 3 vezes. | T001 | `[//]` | `python-services/crew-worker/tests/test_delegated_tools.py` | 🟢 | `[X]` |

## Fase 3, Núcleo

<!-- Lógica central da feature. -->

| ID | Descrição | Dependências | Paralelismo | Arquivo alvo | Confidência | Status |
|----|-----------|--------------|-------------|--------------|-------------|--------|
| T006 | Implementar a ferramenta CrewAI `delegated_search_knowledge_base` no `crew-worker` que publica na fila de jobs e aguarda a resposta na fila de eventos (com timeout de 4 segundos e retry com backoff de até 3 tentativas). | T001, T005 | - | `python-services/crew-worker/src/tools/delegated_search_tool.py` | 🟢 | `[X]` |
| T007 | Implementar a lógica de fallback silencioso na ferramenta CrewAI para retornar texto amigável caso a retentativa esgote. | T006 | - | `python-services/crew-worker/src/tools/delegated_search_tool.py` | 🟢 | `[X]` |
| T008 | Implementar o consumer de jobs de delegação no `rag-worker` em Rust, chamando a busca de embeddings e respondendo na fila de eventos. | T002 | - | `rust-services/rag-worker/src/rabbitmq.rs` | 🟢 | `[X]` |

## Fase 4, Integração

<!-- Cola com outras partes do sistema, contratos externos, ganchos. -->

| ID | Descrição | Dependências | Paralelismo | Arquivo alvo | Confidência | Status |
|----|-----------|--------------|-------------|--------------|-------------|--------|
| T009 | Modificar a inicialização do orquestrador no `crew-worker` para ler dinamicamente quais ferramentas habilitar com base nos metadados extraídos do ZIP (repassados pelo Spring Boot no payload da execução). | T006, T007 | - | `python-services/crew-worker/src/runtime/crewai_adapter.py` | 🟢 | `[X]` |
| T010 | Adicionar o `correlation_id` e a contagem de `delegation_depth` na mensagem RabbitMQ para rastreamento fim-a-fim e prevenção de loops infinitos. | T006, T008 | - | `python-services/crew-worker/src/tools/delegated_search_tool.py` | 🟢 | `[X]` |

## Fase 5, Polimento

<!-- Logs, telemetria, mensagens de erro, documentação curta. -->

| ID | Descrição | Dependências | Paralelismo | Arquivo alvo | Confidência | Status |
|----|-----------|--------------|-------------|--------------|-------------|--------|
| T011 | Adicionar logs detalhados (INFO/ERROR) com o `correlation_id` e contagem de tentativas na ferramenta de busca delegada e no receptor de eventos. | T010 | - | `python-services/crew-worker/src/tools/delegated_search_tool.py` | 🟢 | `[X]` |
| T012 | Documentar os pontos de atenção para regressão e de integridade das novas filas no arquivo `regression-watch.md`. | T011 | - | `_reversa_forward/018-multi-agent-orchestration/regression-watch.md` | 🟢 | `[X]` |

## Notas de execução

<!--
Reservado para /reversa-coding registrar avisos ou observações que surgiram durante a execução.
Não use isso para corrigir ações, edits manuais ficam fora desse arquivo, vão direto no código.
-->

## Histórico de alterações

| Data | Alteração | Autor |
|------|-----------|-------|
| 2026-06-25 | Versão inicial gerada por `/reversa-to-do` | reversa |
