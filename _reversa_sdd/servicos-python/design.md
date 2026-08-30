# Serviços Python (CrewAI Worker), Design Técnico

## Interface

### Comunicação com Filas RabbitMQ
| Fila (Inbound) | Entrada Esperada | Ação / Retorno (Outbound) |
|--------|---------|---------|
| `agent.execution.jobs` | JSON `execution_id, agent_id, prompt` | Processa e publica `EventPayload` UUID-tagged em `agent.execution.events` (Started, ToolCall, etc). |

### Componentes / Funções Chave
| Símbolo | Assinatura / Interface | Retorno | Observação |
|---------|-----------|---------|------------|
| `FallbackLLM.invoke` | `(messages, config)` | `LLMResult` | Alterna entre AI Studio e Vertex via Exceptions. |
| `sandboxed_script_tool._validate_script` | `(code_string)` | `bool` | Levanta SyntaxError ou SecurityError caso pegue nodes proibidos no AST. |
| `executor_core.run` | `(script_path, payload)`| `stdout_str` | Roda sub-processo limpo usando IPC stdout/stderr JSON. |

## Fluxo Principal (Execução de Job IA)
1. **Consumo:** `main.py` acorda com nova mensagem no `agent.execution.jobs`.
2. **Setup:** Cria `contextvars.Context()` e injeta o `execution_id` localmente.
3. **Crew Init:** O `crewai_adapter.py` formata as custom tools e inicializa os Agentes/Tasks configurados do CrewAI. A thread emite `AgentExecutionStarted`.
4. **Tool Loop (Pensamento/Ação):**
   - O LLM analisa o prompt.
   - Pede pra executar uma ferramenta.
   - Emite evento `ToolCallStarted`.
   - Python checa o cache AST da ferramenta; se for Custom Python Tool, roda no subprocesso `executor_core`. Se for base RAG, lança mensagem pra fila `agent.retrieval.queue`.
   - Espera o retorno, devolve o output pro LLM (`ToolCallFinished`).
5. **Conclusão:** LLM converge para uma resposta final. Envia evento `AgentExecutionCompleted` com o output final.

## Fluxos Alternativos
- **Loop Infinito de Reflexão LLM (StackDepthExceededError):** A IA entra em surto lógico de ferramentas e gera recursão. O `crewai_adapter` tem catch disso e avisa um watcher estático. Ao bater N vezes, chama `os._exit(1)`.
- **Falha de Compilação do Sandbox:** Script Python do usuário possui import não permitido (ex. `import subprocess`). A tool é ignorada, o LLM recebe erro _"Forbidden import"_, ensinando o próprio modelo de que a ferramenta falhou por motivos de segurança, forçando o LLM a criar um plano B.

## Dependências
- **CrewAI / Langchain:** Motores base de orquestração de Agente e LLM wrapping.
- **Pika:** Cliente RabbitMQ para Python.
- **Pydantic:** Tipagem forte para `QuotaValue` e `EventPayload` serializables.
- **AST Native:** Validador local sem dependência de lib de terceiros.

## Decisões de Design Identificadas

| Decisão | Evidência no código | Confiança |
|---------|---------------------|-----------|
| Sub-processos ao invés de DinD (Docker-in-Docker) | `executor_core.py` e `subprocess.Popen` | 🟢 |
| Variáveis de Contexto (ContextVars) p/ RabbitMQ | `main.py` e `contextvars` lib | 🟢 |
| Graceful Failure em Subprocess Timeout | Lógica de `SIGKILL` após timeout no executor | 🟢 |

## Estado Interno
- **Cache de AST:** Validadores retêm em memória os pacotes AST de ferramentas atrelados ao `agent_id` para evitar re-parse a cada tool call repetitiva.
- **Contador Poison Pill:** Variável global atômica na memória do Worker apontando a quantidade de falhas graves (`StackDepthExceededError`).

## Observabilidade
- Em substituição ao `print()`, usa módulo `logging` estruturado (JSON ou Key-Value) para unificar no CloudWatch/Datadog e facilitar agregação (Issue #254).

## Riscos e Lacunas
- 🟢 Para evitar descarte acidental de jobs concorrentes em caso de falha (`os._exit(1)`), o RabbitMQ deve ser configurado mandatoriamente com `prefetch=1` e Dead Letter Queues (DLQs) ativas.
