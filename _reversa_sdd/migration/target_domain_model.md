# Modelo de Domínio: Agent Engineering

Este documento especifica a terminologia de negócios, entidades centrais, agregados e as abstrações de memória da **Enterprise Agent Operating Platform**, formalizados pelo domínio de **Agent Engineering**.

---

## 1. Agregados do Domínio `Agent Engineering`

```
 ┌────────────────────────────────────────────────────────┐
 │                   AGENT REGISTRY                       │
 │                                                        │
 │  ┌──────────────────────────────────────────────────┐  │
 │  │                 Agent Package                    │  │
 │  │                                                  │  │
 │  │  - manifest.yaml                                 │  │
 │  │  - Instructions (system, handoff, policies)      │  │
 │  │  - Tools metadata & configuration                │  │
 │  │  - Knowledge specifications                      │  │
 │  └──────────────────────────────────────────────────┘  │
 │                                                        │
 │  - Versioning (SemVer)                                 │
 │  - Publication State (DRAFT, IN_REVIEW, PUBLISHED)     │
 │  - Governance & Access Policies                        │
 └────────────────────────────────────────────────────────┘
```

### 1.1. Agregado: Agent Registry
Responsável por gerenciar os metadados dos agentes corporativos autorizados para execução:
- **Agent:** Representação lógica de um agente com UUID, nome, versão, descrição, status de publicação e restrições de Tenant.
- **Agent Package:** Artefato físico contendo a definição completa do agente. Inclui as instruções base (system instructions, handoff rules, policies), definição de ferramentas (tools) e configurações da base de conhecimento a ser consumida.
- **Agent Publication Workflow:** Ciclo de estados que rege a publicação do agente: `DRAFT` → `IN_REVIEW` → `PUBLISHED` / `REJECTED`. Exige a auditoria e aprovação explícita de um usuário com o papel `ROLE_ADMIN`.

### 1.2. Agregado: Agent Runtime
Responsável pela execução cognitiva dinâmica das tarefas:
- **Agent Task:** A unidade de trabalho solicitada ao agente, contendo o prompt inicial do usuário, inputs específicos e limites de custo (max tokens).
- **Runtime Adapter:** Camada de mapeamento de código responsável por inicializar e converter a definição abstrata do `Agent Package` nas classes concretas do runtime executor ativo (ex: instanciar os Agents e Tasks do CrewAI).
- **Execution Handle:** Identificador atômico que monitora o ciclo de vida assíncrono de execução do job no RabbitMQ e Kubernetes.

---

## 2. Abstrações de Memória Desacopladas (`Memory Sovereignty`)

Para evitar o acoplamento do estado aos runtimes efêmeros (CrewAI), a plataforma define cinco abstrações de persistência:

### 2.1. Memory Service
Interface central que coordena a gravação e recuperação do contexto conversacional do usuário e das saídas parciais/finais dos agentes.

### 2.2. Conversation Store
Armazena a estrutura clássica de chat humana:
- **Conversation (Conversa):** Agrupamento lógico de interações, associada a um `user_id` e `tenant_id`.
- **Message (Mensagem):** Mensagens do chat associadas ao autor (`USER`, `ASSISTANT`, `SYSTEM`), com suporte a marcas de estado.

### 2.3. Execution Store
Persiste os detalhes de depuração interna da execução dos agentes:
- **Agent Execution (Execução de Agente):** Grava o histórico detalhado de execuções ligadas a uma tarefa, incluindo o bloco de pensamentos (*thought logs*), os inputs enviados e os resultados parciais gerados antes da conclusão.

### 2.4. Audit Store
Garante a conformidade de segurança e imutabilidade dos dados de auditoria:
- **Audit Log:** Registra de forma estruturada as atividades críticas executadas (ex: data e hora da criação do agente, chamadas a ferramentas externas via MCP, eventos de recuperação de base de conhecimento e modelos de IA consumidos).

### 2.5. Vector Store
Persiste os trechos de documentos processados (`Document Chunk`) e seus respectivos embeddings de dimensionalidade parametrizável (compatível com o modelo de embeddings configurado) no PostgreSQL, acelerando a recuperação de dados via busca vetorial de cosseno.
