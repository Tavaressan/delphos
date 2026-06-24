# Análise do Detetive — Alfabra-Vector

> Gerado pelo Reversa em 2026-06-19
> Nível: Essencial | Idioma: Português

---

## 1. Arqueologia Git — ADRs Retroativos

Decisões arquiteturais implícitas recuperadas da história do repositório.

---

### ADR-R001: Migração de Schema Single-Tenant para Multi-Tenant

**Commit de origem:** `9e2bba0` — "feat: implement RAG isolation, agent and document management"
**Migration:** `V2__reversa_target_schema.sql`

**Decisão:** As tabelas originais `chats` e `chat_messages` foram descartadas e substituídas por `conversations` e `messages` com coluna `tenant_id NOT NULL`. As tabelas `documents` e `document_chunks` também receberam `tenant_id`. A tabela `agents` (V5) herdou o mesmo padrão com `agent_id` linkado a `documents` e `conversations`.

**Por que:** Isolamento de dados RAG por tenant — cada organização enxerga apenas seus documentos, agentes e histórico de conversas.

**Impacto residual:** 🟡 INFERIDO — A coluna `tenant_id` foi adicionada a `documents` com `DEFAULT '00000000-0000-0000-0000-000000000000'` (UUID zero), sinalizando que dados legados de antes da V2 não têm tenant real atribuído e podem vazar entre tenants se não forem migrados.

---

### ADR-R002: Abandono de OpenAI em favor de Vertex AI / Gemini

**Commit de origem:** `f1cac45` — "feat: implement dynamic embedding dimensions and gcp integration"

**Decisão:** A dimensão do vetor de embedding passou de um valor fixo (inferido: 1536, padrão OpenAI `text-embedding-ada-002`) para `${embedding.dimension}` configurável via properties. O rag-worker chama a API do Vertex AI Gemini diretamente.

**Por que:** 🟡 INFERIDO — Custo, integração com GCP e/ou disponibilidade de modelos de linguagem em Português com melhor desempenho para o domínio de transportes verticais. A mudança para dimensão dinâmica é uma adaptação ao Gemini Embedding, que usa 768 dimensões por padrão.

**Lacuna:** 🔴 LACUNA — Não há fallback se a API do Vertex AI estiver indisponível. Documentado como dívida técnica em `_reversa_sdd/dependencies.md`.

---

### ADR-R003: Remoção de AnythingLLM como Intermediário

**Commits de origem:** `aacb72e` (adiciona AnythingLLM) → `9d54cbb` (remove e refatora para acesso nativo)

**Decisão:** Uma tentativa de usar AnythingLLM como plataforma intermediária de LLM foi revertida. O rag-worker foi refatorado para acessar pgvector e Vertex AI diretamente, sem intermediário.

**Por que:** 🟡 INFERIDO — Eliminação de camada de indireção que adicionava latência, custo de manutenção e dependência de serviço externo sem benefício claro para o caso de uso.

---

### ADR-R004: HNSW em vez de IVFFlat para Índice Vetorial

**Origem:** `V1__init_schema.sql`, linha 114

**Decisão:** Índice HNSW (`USING hnsw`) com operador `vector_cosine_ops` para busca por similaridade de cosseno.

**Por que:** HNSW oferece menor latência de consulta e melhor recall que IVFFlat sem exigir treinamento prévio com dados existentes. Custo: maior consumo de memória RAM. Adequado para datasets em crescimento incremental (documentos adicionados continuamente).

---

### ADR-R005: Caddy como API Gateway Unificado

**Commit de origem:** `8ce1cef` — "feat: integra PoC do frontend com backend real via Caddy"

**Decisão:** Caddy Server roteia tráfego HTTP/HTTPS no ponto de entrada único do sistema — `/api/*` e `/actuator/*` para o Spring Boot, todo o restante para o Next.js.

**Por que:** Elimina problema de CORS cross-origin entre frontend e backend (mesmo domínio), provisiona TLS automático via DuckDNS e centraliza controle de acesso de rede. Firewall UFW bloqueia acesso direto a todas as portas internas.

---

### ADR-R006: Comunicação Java→Workers via RabbitMQ (não HTTP síncrono)

**Origem:** Design inicial do projeto

**Decisão:** Java Core não chama os workers Rust/Python diretamente. Publica jobs em exchanges do RabbitMQ e os workers consomem assíncronamente. Java recebe o resultado de volta via eventos publicados pelos workers na fila `agent.execution.events`.

**Por que:** Desacoplamento — o Java Core não precisa conhecer endereços dos workers. Workers podem escalar horizontalmente. Frontend não fica bloqueado aguardando LLM (polling de 2s substitui SSE/WebSocket).

---

## 2. Regras de Negócio Implícitas

Regras extraídas do código sem documentação explícita.

| # | Regra | Localização | Confiança |
|---|-------|-------------|-----------|
| RN-01 | O ZIP de cadastro de agente **deve conter pelo menos um arquivo `.md` na raiz**; seu conteúdo vira as `systemInstructions` do agente | `AgentService.java:100` | 🟢 CONFIRMADO |
| RN-02 | O tamanho total descomprimido do ZIP não pode exceder **20 MB** | `AgentService.java:104` | 🟢 CONFIRMADO |
| RN-03 | Tipos de arquivo de conhecimento aceitos: `.pdf`, `.docx`, `.txt`, `.md` | `AgentService.java:177` | 🟢 CONFIRMADO |
| RN-04 | Polling do frontend ocorre a cada **2 segundos** com timeout máximo de **2 minutos** (60 tentativas); após isso, a execução é marcada `FAILED` localmente no cliente | `useExecution.ts:120` | 🟢 CONFIRMADO |
| RN-05 | A busca vetorial retorna **Top 5 chunks** por similaridade de cosseno, filtrados por `tenant_id` e opcionalmente `agent_id` | `rag-worker/rabbitmq.rs:360` | 🟢 CONFIRMADO |
| RN-06 | Se nenhuma `system_instructions` for encontrada para o agente no RAG, usa um **prompt padrão Alfabra** como fallback | `rag-worker/rabbitmq.rs:444` | 🟢 CONFIRMADO |
| RN-07 | `ROLE_USER` pode criar e ler documentos; apenas `ROLE_ADMIN` pode deletar documentos, visualizar audit logs e gerenciar usuários | `V1__init_schema.sql:129` | 🟢 CONFIRMADO |
| RN-08 | **⚠️ RBAC não está sendo enforced na API HTTP** — `SecurityConfig` tem `anyRequest().permitAll()`. O modelo RBAC existe no banco mas não é verificado por filtros JWT na camada REST | `SecurityConfig.java:31` | 🟢 CONFIRMADO |
| RN-09 | SSH ao servidor é restrito ao range `INFRA_IP_RANGE`; acesso HTTP/HTTPS ao range `CORP_WHITELIST_RANGE` | `setup_firewall.sh:45` | 🟢 CONFIRMADO |
| RN-10 | A dimensão do vetor de embedding é configurável via property `${embedding.dimension}`; valor em uso com Gemini: **768** | `V1__init_schema.sql:68` + `f1cac45` | 🟡 INFERIDO |
| RN-11 | Documentos adicionados antes da V2 têm `tenant_id = '00000000-0000-0000-0000-000000000000'` (UUID zero) — potencial vazamento de dados cross-tenant se não corrigido | `V2__reversa_target_schema.sql:30` | 🟡 INFERIDO |
| RN-12 | O agente CrewAI é fixo como "Elevator Specialist" — não há mecanismo para instanciar agentes CrewAI dinâmicos com base no `agent_id` da execução | `crewai_adapter.py:208` | 🟡 INFERIDO |

---

## 3. Máquinas de Estado

### 3.1. AgentExecution — Ciclo de Vida de uma Execução

```
[REQUESTED] ──(job publicado no RabbitMQ)──► [QUEUED]
                                                │
                                      (worker consome job)
                                                │
                                                ▼
                                           [STARTED]
                                                │
                                    (busca vetorial iniciada)
                                                │
                                                ▼
                                    [RETRIEVAL_RUNNING]
                                                │
                                  (chunks recuperados, Gemini chamado)
                                                │
                                                ▼
                                          [THINKING] ◄──────────────┐
                                                │                    │
                              ┌─────────────────┴───────────────┐   │
                   (tool call iniciada)                  (resposta final)
                              │                                   │
                              ▼                                   ▼
                        [TOOL_RUNNING] ──(tool concluída)──► [THINKING]
                                                                   │
                                                           (output publicado)
                                                                   │
                                                                   ▼
                                                            [COMPLETED]

Em qualquer estado → [FAILED]   (erro de rede, LLM, worker)
No cliente (2min)  → [TIMEOUT]  (polling expirado, não persiste no banco)
```

**Estados adicionais no schema (não observados nos workers atuais):**
- `DISPATCHED`, `WAITING_TOOL`, `CANCELLED` — definidos em V2 mas sem transições implementadas 🟡 INFERIDO

---

### 3.2. Document — Ciclo de Vida da Ingestão

```
[UPLOADING] ──(arquivo salvo no MinIO, job publicado)──► [PROCESSING]
                                                               │
                           ┌───────────────────────────────────┤
                  (ingestion-worker conclui)         (ingestion-worker falha)
                           │                                    │
                           ▼                                    ▼
                       [INDEXED]                           [FAILED]
```

---

## 4. Matriz de Permissões RBAC

> Status atual: **RBAC definido no banco, não enforced na API** (veja RN-08)

| Permissão | ROLE_ADMIN | ROLE_USER |
|-----------|:----------:|:---------:|
| READ_DOCUMENTS | ✅ | ✅ |
| WRITE_DOCUMENTS | ✅ | ✅ |
| DELETE_DOCUMENTS | ✅ | ❌ |
| VIEW_AUDIT_LOGS | ✅ | ❌ |
| MANAGE_USERS | ✅ | ❌ |

### Escopo de Isolamento de Dados (Multi-Tenancy)

| Entidade | Isolada por Tenant | Isolada por Agent | Observação |
|----------|:-----------------:|:-----------------:|------------|
| `documents` | ✅ `tenant_id` | ✅ `agent_id` | Chunk RAG filtra ambos |
| `document_chunks` | ✅ `tenant_id` | — | Herda do documento |
| `conversations` | ✅ `tenant_id` | ✅ `agent_id` | Isolamento por agente |
| `messages` | ✅ (via conversation) | — | Isolamento indireto |
| `agent_executions` | 🔴 LACUNA | ✅ `agent_id` | Sem `tenant_id` direto na tabela |
| `agents` | ✅ `tenant_id` | — | Agente pertence a um tenant |
| `audit_logs` | 🔴 LACUNA | — | Sem `tenant_id`; apenas `user_id` |

---

## 5. Lacunas Críticas Identificadas

| # | Lacuna | Severidade | Área |
|---|--------|------------|------|
| G-01 | RBAC não enforced: `SecurityConfig.anyRequest().permitAll()` — qualquer request anônimo tem acesso total | 🔴 CRÍTICO | Segurança |
| G-02 | JWT não implementado: entidades `User`, `Role`, `Permission` existem no banco mas não há filtro de autenticação ativo | 🔴 CRÍTICO | Segurança |
| G-03 | `agent_executions` não tem `tenant_id` — impossível filtrar execuções por tenant sem JOIN | 🟡 MÉDIO | Multi-tenancy |
| G-04 | `audit_logs` não tem `tenant_id` — admin de um tenant pode ver logs de outro | 🟡 MÉDIO | Multi-tenancy |
| G-05 | Dados pré-V2 com `tenant_id = UUID(0)` não foram migrados para tenants reais | 🟡 MÉDIO | Dados |
| G-06 | CrewAI agent é hardcoded como "Elevator Specialist" — não parametriza por `agent_id` | 🟡 MÉDIO | Funcional |
| G-07 | Sem fallback para Vertex AI — falha total em caso de indisponibilidade da API GCP | 🟡 MÉDIO | Resiliência |
| G-08 | Estados `DISPATCHED`, `WAITING_TOOL`, `CANCELLED` definidos no schema sem implementação | 🟢 BAIXO | Schema |
