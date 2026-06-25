# Requirements: Multi-agent Orchestration — Delegação de tarefas entre agentes

> Identificador: `018-multi-agent-orchestration`
> Data: `2026-06-25`
> Pasta da extração reversa: `_reversa_sdd/`
> Confidência: 🟢 CONFIRMADO, 🟡 INFERIDO, 🔴 LACUNA / DÚVIDA

## 1. Resumo executivo

Esta funcionalidade entrega a capacidade para o agente orquestrador (executado no `crew-worker` em Python/CrewAI) de decompor solicitações complexas e delegar subtarefas dinamicamente a agentes especialistas (como busca semântica no `rag-worker` em Rust e execução de fluxos estruturados no `workflow-worker` em Rust) via RabbitMQ (comunicação assíncrona baseada em filas dedicadas), consolidando os resultados parciais antes de retornar a resposta final ao usuário. Isso resolve a limitação atual onde a execução de RAG e a execução de CrewAI ocorrem de forma isolada, permitindo o atendimento de consultas de negócios complexas.

## 2. Contexto a partir do legado

A especificação de requisitos apoia-se na separação de microsserviços de alto desempenho em Rust e do worker Python para CrewAI detectada na análise arquitetural, assim como nas definições de isolamento por Tenant e no histórico de Execuções.

| Fonte | Trecho relevante | Confidência |
|-------|------------------|-------------|
| `_reversa_sdd/architecture.md#1. Visão Geral do Sistema` | Estrutura baseada em orquestrador em Java (`java-core`) e pipeline de microsserviços (`rust-services` e `python-services`). | 🟢 |
| `_reversa_sdd/domain.md#1. Linguagem Ubíqua (Ubiquitous Language)` | Conceituação de Agente, Execução, RAG, Workflow e Tenant. | 🟢 |
| `_reversa_sdd/domain.md#3. Bounded Contexts` | Delimitação dos Bounded Contexts de Conversação RAG (`rag-worker`), Conversação CrewAI (`crew-worker`) e Orquestração de Workflows (`workflow-worker`). | 🟢 |

## 3. Personas e cenários de uso

| Persona | Objetivo | Cenário-chave |
|---------|----------|---------------|
| Analista de Negócios (Tenant) | Obter respostas complexas que requerem leitura de múltiplos documentos e processamento estruturado. | O usuário faz uma pergunta ampla que exige que o Orquestrador delegue a pesquisa semântica no `rag-worker` e depois execute um fluxo de validação no `workflow-worker` antes de responder. |

## 4. Regras de negócio novas ou alteradas

1. **RN-01: Delegação Dinâmica de Subtarefas** 🟢
   - Origem no legado: `_reversa_sdd/domain.md#4. Regras de Negócio por Entidade`
   - Tipo: nova
   - A associação de quais ferramentas especialistas estão disponíveis para cada agente orquestrador é configurada dinamicamente através do arquivo de manifesto incluído no ZIP de cadastro do agente.
2. **RN-02: Propagação de Isolamento de Tenant** 🟢
   - Origem no legado: `_reversa_sdd/domain.md#1. Linguagem Ubíqua (Ubiquitous Language) (Termo: Tenant)`
   - Tipo: nova
   - Toda delegação enviada a um microsserviço especialista deve herdar e validar o `tenant_id` da chamada original, proibindo o acesso a bases de conhecimento de outros inquilinos.
3. **RN-03: Auditoria da Cadeia de Execução** 🟢
   - Origem no legado: `_reversa_sdd/domain.md#4. Regras de Negócio por Entidade (AgentExecution)`
   - Tipo: nova
   - Cada subtarefa delegada deve ser registrada na tabela `tool_calls` referenciando o ID de execução principal para total rastreabilidade.
4. **RN-04: Resiliência e Fallback na Delegação** 🟢
   - Origem no legado: `_reversa_sdd/architecture.md#4. Dívidas Técnicas Identificadas`
   - Tipo: nova
   - Em caso de falha ou timeout de uma subtarefa delegada, o orquestrador deve aplicar retentativa automática com backoff exponencial (até 3 tentativas). Caso as retentativas falhem, o sistema deve executar um fallback silencioso, inserindo uma mensagem de erro suave/padrão e continuando a execução do fluxo principal.

## 5. Requisitos Funcionais

| ID | Requisito | Prioridade | Critério de aceite | Confidência |
|----|-----------|------------|--------------------|-------------|
| RF-01 | Registro de Ferramentas de Delegação | Must | O worker do CrewAI (`crew-worker`) deve expor ferramentas para acionar o `rag-worker` e o `workflow-worker` via novas filas RabbitMQ dedicadas. | 🟢 |
| RF-02 | Consolidação de Respostas Multi-agente | Must | O orquestrador no `crew-worker` deve sintetizar o retorno de todas as tarefas delegadas em uma resposta coerente e única para o usuário. | 🟢 |
| RF-03 | Rastreamento de Subtarefas | Should | Cada delegação bem-sucedida ou falha deve persistir seu log de execução vinculado à tabela de auditoria correspondente. | 🟢 |

## 6. Requisitos Não Funcionais

| Tipo | Requisito | Evidência ou justificativa | Confidência |
|------|-----------|----------------------------|-------------|
| Desempenho | O overhead de latência introduzido pela delegação e comunicação assíncrona via RabbitMQ não deve exceder 5 segundos adicionais à execução padrão do LLM. | Garantia de fluidez de conversação para o usuário. | 🟡 |
| Segurança | O `tenant_id` e tokens de autenticação devem ser transmitidos e validados de maneira segura em todas as delegações internas por meio de payloads de mensageria autenticados. | Mitigação de vulnerabilidade de IDOR (Insecure Direct Object Reference). | 🟢 |
| Observabilidade | Cada transação distribuída deve portar um `correlation_id` único gerado no `java-core` e propagado em todas as delegações do RabbitMQ. | Facilidade de depuração de chamadas distribuídas no backend. | 🟢 |

## 7. Critérios de Aceitação

```gherkin
Cenário: Delegação bem-sucedida de busca vetorial
  Dado que um Agente Orquestrador recebe uma pergunta que requer dados da Base de Conhecimento
  Quando o Orquestrador identifica a necessidade de busca vetorial
  Então ele delega a busca para o rag-worker com o tenant_id e o termo de pesquisa via RabbitMQ
  E consolida a resposta recuperada no prompt para o LLM responder ao usuário

Cenário: Falha na delegação por violação de isolamento de Tenant
  Dado que o Orquestrador tenta delegar uma tarefa sem passar o tenant_id correto ou correspondente
  Quando o microsserviço especialista recebe a requisição de delegação
  Então a delegação é rejeitada com erro 403 e a execução registra uma falha de segurança
```

## 8. Prioridade MoSCoW

| Item | MoSCoW | Justificativa |
|------|--------|---------------|
| RF-01 | Must | Essencial para permitir a execução da delegação pelo orquestrador. |
| RF-02 | Must | Necessário para compor a resposta final ao usuário. |
| RF-03 | Should | Rastreabilidade e logs detalhados, mas não interrompem o fluxo funcional primário. |
| RNF de segurança | Must | O isolamento de Tenants é um requisito de segurança crítico do projeto legado. |

## 9. Esclarecimentos

### Sessão 2026-06-25

- **Q:** Qual protocolo de comunicação (RabbitMQ ou HTTP REST direto) deve ser adotado para as delegações do orquestrador (`crew-worker`) aos agentes especialistas?
  - **R:** RabbitMQ (assíncrono/mensageria) via novas filas dedicadas.
- **Q:** Como será configurada a associação entre o agente orquestrador e as ferramentas especialistas dele? Isso será estático por agente no banco ou dinâmico no payload do ZIP?
  - **R:** Configuração dinâmica definida no arquivo de manifesto do ZIP de cadastro do agente.
- **Q:** Qual o comportamento esperado do orquestrador em caso de erro ou timeout de uma das subtarefas delegadas?
  - **R:** Retentativa automática (retry com backoff exponencial limitado a 3 tentativas). Se falhar em definitivo, executar fallback silencioso com mensagem suave e continuar o fluxo principal.

## 10. Lacunas

Nenhuma lacuna pendente.

## 11. Histórico de alterações

| Data | Alteração | Autor |
|------|-----------|-------|
| 2026-06-25 | Versão inicial gerada por `/reversa-requirements` | reversa |
| 2026-06-25 | Esclarecimentos de dúvidas integrados por `/reversa-clarify` | reversa |
