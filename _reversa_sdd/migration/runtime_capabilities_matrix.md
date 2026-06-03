# Matriz de Capacidades de Runtime (Runtime Capabilities Matrix)

Este documento estabelece as capacidades, limitações e suporte a recursos nos diferentes runtimes cognitivos e procedurais da **Enterprise Agent Operating Platform**, fornecendo suporte para evolução estratégica e governança.

---

## Tabela de Comparação de Capacidades

| Capacidade Técnica | `CrewAI` (Python - Inicial) | `LangGraph` (Python - Futuro) | `RustRuntime` (Rust - Futuro) | `workflow-worker` (Rust - Atual) |
|---|:---:|:---:|:---:|:---:|
| **Delegation (Delegação Dinâmica)** | ✅ Nativo | 🟡 Requer Código | ❌ Não Suportado | ❌ Não Suportado |
| **Replay (Reexecução Determinística)** | ❌ Limitado | ✅ Excelente | ✅ Excelente | ✅ Excelente |
| **Human-in-the-Loop (Pausa Humana)** | 🟡 Parcial | ✅ Nativo | 🟡 Requer Código | ✅ Nativo |
| **Deterministic Execution (Previsibilidade)** | ❌ Baixa (LLM-driven) | 🟡 Média (State-driven) | ✅ Alta | ✅ Total (DAG-driven) |
| **Memory Isolation (Segregação de Memória)** | 🟡 Acoplado ao Agente | ✅ Isolamento de Grafo | ✅ Isolamento Físico | ✅ Isolamento SQL |
| **Streaming (Saída Parcial)** | ✅ Suporta (Tokens) | ✅ Suporta (Nodes/Tokens) | ✅ Nativo (Tokens) | ✅ Nativo (Eventos) |
| **Cancellation (Abortamento Atômico)** | 🟡 Via Thread Kill | ✅ Via Graph Interruption | ✅ Nativo (Tokio Cancel) | ✅ Nativo (Tokio Cancel) |

---

## Diretrizes para Seleção de Runtime

1. **Quando utilizar o `CrewAI`:** Para tarefas cognitivas complexas de reasoning, onde múltiplos agentes especializados colaboram de forma autônoma para resolver problemas ambíguos.
2. **Quando utilizar o `LangGraph`:** Para orquestrações complexas orientadas a estados e grafos cíclicos de decisão, onde a previsibilidade dos nós e caminhos de transição é crítica.
3. **Quando utilizar o `RustRuntime` (nativos em Rust):** Para tarefas baseadas em agentes leves com alta concorrência e tempos de resposta na escala de milissegundos.
4. **Quando utilizar o `workflow-worker` (Rust):** Para fluxos de trabalho e processos estritamente determinísticos, lineares e baseados em regras de negócio rígidas (DAGs físicas).
