# Especificação de Arquitetura-Alvo: Enterprise Agent Platform

Este documento detalha o fluxo físico e lógico de integração de componentes da **Enterprise Agent Operating Platform**, estabelecendo os limites funcionais de cada serviço e os mecanismos de escalonamento.

---

## 1. Diagrama de Fluxo Físico e Lógico

```
                        ┌────────────────────────┐
                        │   Next.js Frontend     │
                        └───────────┬────────────┘
                                    │ HTTP / JWT (HttpOnly Cookies)
                                    ▼
                        ┌────────────────────────┐
                        │ java-core (Coordination│
                        └───────────┬────────────┘
                                    │ Eventos (RabbitMQ)
                                    ▼
                        ┌────────────────────────┐
                        │    RabbitMQ Broker     │
                        └─────┬──────────────┬───┘
                              │              │
                              ▼ (jobs)       ▼ (jobs)
         ┌──────────────────────┐          ┌──────────────────────┐
         │  rust-services/      │          │  python-services/    │
         │  - ingestion-worker  │          │  - crew-worker       │
         │  - rag-worker        │          │    (CrewAI Runtime)  │
         │  - workflow-worker   │          └──────────┬───────────┘
         └──────────┬───────────┘                     │
                    │ Inserção Lote / Busca Híbrida   │ Escrita
                    ▼                                 ▼
         ┌────────────────────────────────────────────────────────┐
         │               PostgreSQL + pgvector                    │
         └────────────────────────────────────────────────────────┘
```

---

## 2. Limites de Responsabilidades dos Workers

Para evitar duplicação de orquestração (*overlap*) e garantir fronteiras claras entre os motores de execução determinísticos e cognitivos, aplicam-se as seguintes regras de governança:

### 2.1. Camada de Coordenação (`java-core`)
- **Papel:** API Gateway central da plataforma, orquestração de autenticação/sessões NextAuth, verificação RBAC de acesso aos tenants, auditoria física persistente em banco de dados (`Audit Store`), e geração do controle de limites tarifários e cotas corporativas de tokens.
- **Não faz:** Parsing de documentos, geração de embeddings vetoriais, ou chamadas de orquestração cognitiva a LLMs.

### 2.2. Worker de Fluxo de Trabalho Determinístico (`workflow-worker` - Rust)
- **Papel:** Execução de rotinas e DAGs (Directed Acyclic Graphs) baseadas em lógica estruturada, fluxos sistemáticos e transições rígidas de máquinas de estados. Ex: processamento ordenado de regras de conformidade corporativa pós-RAG, orquestração linear de tarefas programadas (triggers).
- **Não faz:** Decisões dinâmicas de planejamento e colaborações ad-hoc entre múltiplos agentes autônomos.

### 2.3. Workers de Dados (`ingestion-worker` & `rag-worker` - Rust)
- **Papel:** Execução de tarefas pesadas de leitura de arquivos físicos multiformato (extração de texto via `lopdf`, `pdf-extract`, `docx-rs` e motor OCR Tesseract), vetorização (integração com Vertex AI) e consultas rápidas de similaridade de cosseno com índice HNSW no PostgreSQL.
- **Não faz:** Agenciamento de chat ou roteamento de mensagens cognitivas.

### 2.4. Worker Cognitivo (`crew-worker` - Python)
- **Papel:** Planejamento flexível (*reasoning*), delegação dinâmica, orquestração de múltiplos agentes CrewAI de forma assíncrona, e chamadas de ferramentas (*tool calling*).
- **Não faz:** Controle de sessão HTTP do usuário, validação inicial de permissões RBAC de acesso aos documentos, ou persistência primária relacional.

---

## 3. Escalonamento no Kubernetes com KEDA

Para lidar com picos de demanda no processamento cognitivo sem sobrecarregar permanentemente o cluster, a plataforma adota o **KEDA (Kubernetes Event-driven Autoscaling)**:
1. O KEDA escuta a exchange do RabbitMQ e monitora a profundidade da fila `agent.execution.jobs`.
2. Conforme o número de mensagens pendentes sobe, o KEDA escala horizontalmente o número de Pods do `crew-worker` executando em Kubernetes (escalando de `0` até o limite configurado `N`).
3. Uma vez que o processamento do lote cognitivo é concluído e a fila é esvaziada, o KEDA escala gradualmente o número de réplicas de volta a `0`, reduzindo os custos de faturamento e liberando os recursos de hardware do cluster.
