# Requirements: Execução Determinística e Sandboxing de Workflows (Workflow Worker)

> Identificador: `004-workflow-worker`
> Data: `2026-06-03`
> Pasta da extração reversa: `_reversa_sdd/`
> Confidência: 🟢 CONFIRMADO, 🟡 INFERIDO, 🔴 LACUNA / DÚVIDA

## 1. Resumo executivo

O `workflow-worker` atuará como um worker assíncrono em Rust projetado para consumir e executar fluxos de trabalho (DAGs) estruturados e determinísticos, com base em regras de negócio rígidas. Ele resolve a necessidade de processar com total previsibilidade regras de conformidade corporativa e governança (como a checagem pós-RAG) sem os riscos de loops e indeterminações de runtimes cognitivos, sem uso de scripting dinâmico na fase atual e prevendo suporte a sandbox seguro em WASM no futuro para extensibilidade.

## 2. Contexto a partir do legado

A especificação está ancorada nos seguintes artefatos de engenharia reversa do sistema legado:

| Fonte | Trecho relevante | Confidência |
|-------|------------------|-------------|
| `_reversa_sdd/migration/target_architecture.md#2.2` | Define o papel do `workflow-worker` em Rust como executor de rotinas e DAGs determinísticas e lineares baseadas em regras de negócio rígidas (não cognitivas). | 🟢 |
| `_reversa_sdd/migration/execution_lifecycle.md#2` | Mapeia a participação do `workflow-worker` consumindo mensagens no estado `DISPATCHED` e as transições no RabbitMQ. | 🟢 |
| `_reversa_sdd/migration/tool_execution_contract.md#1` | Detalha as exigências críticas de sandboxing (bloqueio de reflexão, compilação AST rígida, limite de vCPU e memória) para segurança em execuções de scripts personalizados. | 🟢 |
| `_reversa_sdd/migration/runtime_capabilities_matrix.md#Tabela-de-Comparacao-de-Capacidades` | Classifica o `workflow-worker` como runtime determinístico com suporte nativo a reexecução (Replay), cancelamento e Human-in-the-loop (pausa). | 🟢 |

## 3. Personas e cenários de uso

| Persona | Objetivo | Cenário-chave |
|---------|----------|---------------|
| **Colaborador Corporativo (User)** | Obter respostas de assistentes cognitivos auditadas e em total conformidade. | O colaborador envia uma pergunta; após a geração da resposta pelo assistente, o `java-core` enfileira o job na fila do `workflow-worker`, que roda as DAGs de verificação de segurança, validação de cota e conformidade carregadas do banco de dados. |
| **Administrador do Sistema (Admin)** | Definir e rodar fluxos de conformidade com DAGs declarativas sem comprometer a estabilidade do host/monorepo. | O administrador define topologias de DAG no banco de dados para validação de cotas/tokens e o `workflow-worker` as executa de forma determinística e sob limites estritos de segurança e recursos. |

## 4. Regras de negócio novas ou alteradas

1. **RN-01 (Lógica de Execução Determinística):** O `workflow-worker` deve executar exclusivamente caminhos estruturados linearmente ou em DAGs lineares, sem indeterminação ou chamadas de reasoning autônomo de LLMs. 🟢
   - Origem no legado: `_reversa_sdd/migration/target_architecture.md#2.2`
   - Tipo: nova 🟢
2. **RN-02 (DAG Declarativa Segura e Sem Scripting Dinâmico):** A Workflow Engine executa nós definidos na estrutura de banco de dados (como RAG e chamadas de ferramentas). Não haverá scripting dinâmico (Groovy, Rhai, etc.) executado nesta versão. Toda lógica de fluxo deve ser expressa na topologia da DAG declarativa (nós e arestas). 🟢
   - Origem no legado: `_reversa_sdd/migration/target_architecture.md#2.2` e decisão de arquitetura.
   - Tipo: nova 🟢
3. **RN-03 (Limites de Recursos de Execução da DAG):** O processamento de um job pelo `workflow-worker` terá timeout de 15 segundos (máximo de 45s) e limites rígidos de concorrência. Quando a capacidade de extensibilidade por WASM for ativada no futuro, as extensões rodarão em um WASM Sandbox isolado sob limite máximo de 128MB RAM e 0.5 vCPU por execução. 🟢
   - Origem no legado: `_reversa_sdd/migration/tool_execution_contract.md#1` e `_reversa_sdd/migration/tool_execution_contract.md#52`
   - Tipo: nova 🟢
4. **RN-04 (Ciclo de Vida Orientado a Eventos):** O worker deve consumir mensagens da fila de jobs de workflow e publicar eventos de ciclo de vida correspondentes como `AgentExecutionStarted` e `AgentExecutionFinished` ou `AgentExecutionFailed` com o `correlation_id` / `traceparent` unificado. 🟢
   - Origem no legado: `_reversa_sdd/migration/execution_lifecycle.md#3`
   - Tipo: nova 🟢

## 5. Requisitos Funcionais

| ID | Requisito | Prioridade | Critério de aceite | Confidência |
|----|-----------|------------|--------------------|-------------|
| RF-01 | **Consumo de Jobs do RabbitMQ:** Conectar-se ao RabbitMQ e consumir mensagens JSON da fila `agent.workflow.queue` (routing key `agent.workflow.requested`). | Must | Extrair `workflow_id`, `workflow_version`, `tenant_id` e `execution_id` com sucesso. | 🟢 |
| RF-02 | **Motor de Execução de DAGs Declarativas:** Executar de forma determinística os nós da DAG (ex: RAG, chamada de ferramentas) carregados do PostgreSQL. | Must | O worker deve recuperar e interpretar a definição de nós/arestas no banco e rodar a sequência declarada. | 🟢 |
| RF-03 | **Implementação do Heartbeat e Healthz:** Expor o endpoint `/healthz` GET na porta 8000 e emitir heartbeat nos logs a cada 60 segundos. | Must | O container responde com 200 OK no healthcheck e printa logs de heartbeat periodicamente. | 🟢 |
| RF-04 | **Tratamento de Timeouts e Cancelamentos:** Monitorar a execução do job da DAG e aplicar abortamento atômico se o timeout de 15 segundos for atingido. | Must | A execução do workflow é abortada atomicamente (utilizando Tokio cancel) sem vazamento de recursos. | 🟢 |
| RF-05 | **Publicação de Auditoria de Eventos:** Publicar eventos de início (`agent.workflow.started`), sucesso (`agent.workflow.completed`) ou falha (`agent.workflow.failed`) no barramento RabbitMQ. | Should | Eventos com `execution_id` correto gravados na exchange `agent.execution.exchange`. | 🟢 |

## 6. Requisitos Não Funcionais

| Tipo | Requisito | Evidência ou justificativa | Confidência |
|------|-----------|----------------------------|-------------|
| Segurança | Ocultação total de chaves e dados sensíveis nas saídas de logs. | Prevenir vazamento de variáveis ambientais do cluster em logs centralizados. | 🟢 |
| Concorrência | Utilizar o runtime assíncrono Tokio para processar múltiplos jobs concorrentemente. | Evitar que a execução de um script pesado cause lentidão ou bloqueio a outras requisições. | 🟢 |
| Observabilidade | Suportar a leitura do Trace ID/cabeçalhos OpenTelemetry (`traceparent`) das mensagens. | Garantir a unificação de traces de ponta a ponta na plataforma. | 🟡 |

## 7. Critérios de Aceitação

```gherkin
Cenário: Execução com sucesso de regras determinísticas de conformidade
  Dado que o RabbitMQ está ativo e a fila agent.workflow.queue configurada
  Quando um job de execução de workflow é publicado contendo um workflow_id e tenant_id válidos
  Então o workflow-worker deve consumir a mensagem
  E deve buscar a definição da DAG correspondente no PostgreSQL
  E deve executar os nós declarativos (como RAG e chamadas de ferramentas) com sucesso
  E ao terminar com sucesso, deve publicar o evento agent.workflow.completed e enviar o ACK da mensagem original.

Cenário: Tentativa de execução de DAG com estrutura inválida ou nó inexistente
  Dado que a Workflow Engine está ativa
  Quando um job com uma definição de DAG malformada ou nó desconhecido é processado
  Então o workflow-worker deve rejeitar a execução
  E deve publicar o evento agent.workflow.failed detalhando a falha de validação da DAG
  E deve enviar um NACK sem reenfileiramento.

Cenário: Excesso de tempo de execução do workflow (Timeout)
  Dado que o timeout padrão de 15 segundos está configurado
  Quando a execução da DAG excede 15 segundos
  Então o worker Rust deve interromper a execução usando tokio::select!
  E deve registrar a falha de timeout em log estruturado
  E deve publicar o evento agent.workflow.failed com o status TIMEOUT.
```

## 8. Prioridade MoSCoW

| Item | MoSCoW | Justificativa |
|------|--------|---------------|
| RF-01 (Consumo do RabbitMQ) | Must | Essencial para comunicação orientada a eventos assíncrona. |
| RF-02 (Motor de DAGs Declarativas) | Must | Core do worker determinístico encarregado de rodar as etapas estruturadas de auditoria. |
| RF-03 (Heartbeat e Healthz) | Must | Exigência da arquitetura de saúde e resiliência de containers da infraestrutura. |
| RF-04 (Timeout/Cancelamento) | Must | Previne exaustão de threads e recursos do cluster em loops infinitos. |
| RF-05 (Publicação de Eventos) | Should | Necessário para feedback do ciclo de vida em tempo real na interface web. |
| RNF de Segurança | Should | Alinhado com as políticas de conformidade e auditoria de vazamento de segredos. |

## 9. Esclarecimentos

### Sessão 2026-06-03

- **Q:** Qual é a fila e a routing key específicas do RabbitMQ para jobs de workflow a serem consumidos pelo `workflow-worker`?
- **R:** Exchange: `agent.execution.exchange` (tipo `topic`), Fila: `agent.workflow.queue` e Routing Key: `agent.workflow.requested`. Eventos futuros mapeados: `agent.workflow.started`, `agent.workflow.completed`, `agent.workflow.failed`, `agent.workflow.cancelled`.
- **Q:** Qual linguagem ou motor de script dinâmico secundário será executado dentro do `workflow-worker` Rust?
- **R:** Sem scripting dinâmico na fase atual. O worker será uma engine declarativa executando nós de DAG. Para extensibilidade futura, será adotado WASM (WebAssembly), evitando Groovy e Rhai.
- **Q:** Onde a lógica das DAGs determinísticas está declarada?
- **R:** A definição das DAGs será persistida centralmente no PostgreSQL (tabelas `workflow_definition`, `workflow_version`, `workflow_node`, `workflow_edge`). O payload do Job no RabbitMQ conterá apenas referências básicas de identificação: `{ "workflow_id": "...", "workflow_version": "...", "tenant_id": "...", "execution_id": "..." }`.

## 10. Lacunas

- Nenhuma lacuna de conhecimento pendente nesta feature.

## 11. Histórico de alterações

| Data | Alteração | Autor |
|------|-----------|-------|
| 2026-06-03 | Versão inicial gerada por `/reversa-requirements` | Reversa |
