# Legacy Impact: Prompt Injection Protection

> Identificador: `018-prompt-injection-protection`
> Data: 2026-06-25

## 1. Arquivos afetados e severidade

| Arquivo afetado | Componente | Tipo | Severidade | Justificativa |
|-----------------|------------|------|------------|---------------|
| `python-services/crew-worker/src/runtime/crewai_adapter.py` | `crew-worker` | regra-alterada | LOW | Introdução de chamada ao sanitizador/validador de query e encapsulamento em tags XML na task. |
| `python-services/crew-worker/src/runtime/prompt_validator.py` | `crew-worker` | componente-novo | LOW | Helper de validação heurística e sanitização de query em Python. |
| `python-services/crew-worker/tests/test_prompt_validator.py` | `crew-worker` | componente-novo | LOW | Testes unitários para o validador em Python. |
| `rust-services/rag-worker/Cargo.toml` | `rag-worker` | regra-alterada | LOW | Adição da dependência `regex` na compilação do Rust. |
| `rust-services/rag-worker/src/error.rs` | `rag-worker` | regra-alterada | LOW | Adição do tipo de erro `WorkerError::Security` para abortar de forma limpa. |
| `rust-services/rag-worker/src/main.rs` | `rag-worker` | regra-alterada | LOW | Declaração dos novos módulos `security` e `security_tests`. |
| `rust-services/rag-worker/src/security.rs` | `rag-worker` | componente-novo | LOW | Helper de validação regex/heurística, escape de tags XML e limite de caracteres em Rust. |
| `rust-services/rag-worker/src/security_tests.rs` | `rag-worker` | componente-novo | LOW | Testes unitários de validação em Rust. |
| `rust-services/rag-worker/src/rabbitmq.rs` | `rag-worker` | regra-alterada | LOW | Validação da query, escape de XML nos chunks do RAG e encapsulamento em tags XML. |

## 2. Diff conceitual por componente

### Componente `crew-worker`
O prompt do usuário agora passa por uma limpeza Unicode, checagem regex contra padrões conhecidos de jailbreak e escape de XML (substituindo `<` por `&lt;` e `>` por `&gt;`). A tarefa do CrewAI é estruturada usando delimitadores `<user_query>` e `<knowledge_base_chunks>`, explicitando ao modelo que processe o input como dado. Qualquer violação de regras de segurança gera logs no nível WARNING e aborta a execução retornando o evento `AgentExecutionFailed` sem chamar o modelo LLM do Gemini.

### Componente `rag-worker`
A mesma lógica de validação heurística foi construída em Rust. A query do usuário passa por regexes case-insensitive na fila RabbitMQ antes de chamar os embeddings e a API do Gemini. Chunks recuperados da base de dados são escapados para impedir injeções indiretas por documentos maliciosos indexados. O prompt de chat é estruturado usando delimitadores XML. Tentativas de ataque são alertadas com logs nível WARNING e abortam a execução enviando `AgentExecutionFailedEvent`.

## 3. Regras preservadas do modelo de domínio

- **RN-01 (Isolamento Multi-tenant):** A query vetorial continua isolada pelo `tenant_id` e filtra apenas chunks pertencentes ao tenant e/ou globais.
- **Ciclo de vida do Job:** Em caso de erro na execução (inclusive por erro de segurança), a mensagem recebe NACK sem requeue para ir para a DLQ, evitando loops de processamento.

## 4. Regras modificadas do modelo de domínio

- **RN-03 (Construção do prompt de execução):** O prompt passa a isolar estritamente query e contexto dentro de tags XML nas duas pontas (Rust e Python workers).
