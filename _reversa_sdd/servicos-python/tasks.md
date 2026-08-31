# Serviços Python, Tarefas de Implementação

## Pré-requisitos
- [ ] RabbitMQ acessível e configurado.
- [ ] Chave da Google AI Studio / Vertex configurada na Env.
- [ ] Python 3.11+ instalado no Docker, para o recurso avançado de `contextvars` comportar-se adequadamente em multithread Pika.

## Tarefas

- [ ] T-01, Estruturar Consumer AMQP Isolado (`main.py`).
  - Origem no legado: Configuração de `pika` básica e loop event-driven.
  - Critério de pronto: Instancia jobs via `contextvars.Context` ao receber um delivery do AMQP.
  - Confiança: 🟢

- [ ] T-02, Implementar Custom Fallback LLM.
  - Origem no legado: `crewai_adapter.py` / `FallbackLLM`
  - Critério de pronto: Se Google AI Studio falhar, capturar Exceção e usar a Vertex na mesma chamada, sem falhar a _Task_ do Agente.
  - Confiança: 🟢

- [ ] T-03, AST Validator & Subprocess Executor (O Sandbox).
  - Origem no legado: `sandboxed_script_tool.py` e `executor_core.py`
  - Critério de pronto: Varre strings de python do usuário atrás de imports `os`, `sys`, etc; Instancia `python3 -I` com tempo limite restrito e devolve stdout ao CrewAI.
  - Confiança: 🟢

- [ ] T-04, Integrou Adaptador do CrewAI ao Sistema de Eventos (`crewai_adapter.py`).
  - Origem no legado: Dispatchers dentro das _Callbacks_ nativas do LangChain/CrewAI.
  - Critério de pronto: Eventos formatados `AgentExecutionStarted`, `RetrievalStarted`, etc disparam corretamente para `agent.execution.events`.
  - Confiança: 🟢

- [ ] T-05, Implementar Mitigação Poison Pill (Restart automático).
  - Origem no legado: Correções das PRs #389 / #392 / #391.
  - Critério de pronto: Se ocorrer o `StackDepthExceededError` (CrewAI deep recursion), escalar erro no contador; ao bater `POISON_THRESHOLD`, derrubar o Worker.
  - Confiança: 🟢

## Tarefas de Teste

- [ ] TT-01, Submeter um script python via Test Case que possua código `__import__("os").system("echo ha")` e validar se a árvore AST intercepta o *dunder method*.
- [ ] TT-02, Criar script válido porém malicioso que contenha um loop infinito `while True: pass` e certificar-se que o Subprocess cai via timeout `SIGKILL` sem travar o Agente.
- [ ] TT-03, Usar chave da API Google quebrada e garantir que a Request seja roteada limpa pra Vertex via classe `FallbackLLM`.

## Ordem Sugerida
1. T-03 (Sandbox) -> Isolado do CrewAI, puramente sistêmico, o mais difícil de garantir segurança plena.
2. T-02 (Fallback) -> Base do LLM.
3. T-04 (CrewAI Adapter) -> União do LLM com o Sandbox.
4. T-01 e T-05 (Workers e Resiliência) -> Pontas da fila AMQP.

## Lacunas Pendentes (🔴)
- Avaliar reescrita de query opt-in (`_rewrite_query`). Precisa de benchmarks para ver se realmente impacta favoravelmente na assertividade do RAG contra o custo/latência que ela insere.
