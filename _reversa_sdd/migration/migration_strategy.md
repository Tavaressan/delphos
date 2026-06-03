# Estratégia de Migração e Consolidação

Este documento define a estratégia operacional e de transição para implantar a **Enterprise Agent Operating Platform**, consolidando as capacidades dos sistemas legados sob o novo ecossistema distribuído orientado a eventos.

---

## 1. Abordagem de Migração: Phased Transition (Transição em Fases)

Para mitigar os riscos de indisponibilidade da plataforma de agentes corporativos, a migração será dividida em quatro fases progressivas:

```
Fase 1: Infraestrutura & Event Backbone (RabbitMQ, Postgres, Redis, MinIO)
                     │
                     ▼
Fase 2: Core Platform & Workers (Spring Coordination, Rust & Python Workers)
                     │
                     ▼
Fase 3: Data Migration & Parity Testing (Flyway, Sanitização, BDD Features)
                     │
                     ▼
Fase 4: Production Cutover & Coexistência (Traffic Routing, Blue-Green)
```

---

## 2. Detalhamento das Fases

### Fase 1: Infraestrutura & Event Backbone
1. **Provisionamento do Cluster:** Configurar o ambiente Kubernetes inicial e preparar o deploy dos charts do PostgreSQL com `pgvector`, Redis com suporte a clustering e MinIO para armazenamento de objetos.
2. **Backbone de Mensageria (RabbitMQ):** Declarar as exchanges e filas oficiais (`agent.execution.jobs`, `agent.execution.events`, `document.ingestion.jobs`, etc.), definindo as políticas de Dead Letter Exchange (DLX) e TTL.

### Fase 2: Core Platform & Workers
1. **API Gateway / Coordination Layer (Java):** Desenvolver o controle RBAC, sessões JWT Stateless baseadas em NextAuth/Auth.js, catálogo de pacotes de agentes e a persistência na modelagem de Auditoria Completa.
2. **Implementação de Workers Rust:**
   - `ingestion-worker` e `rag-worker` para processamento e busca vetorial de chunks com dimensionalidade de vetores parametrizável de acordo com o modelo configurado.
   - `workflow-worker` para orquestração de DAGs determinísticas e regras de fluxo de trabalho estruturadas.
3. **Implementação de Workers Python:**
   - `crew-worker` acoplado ao RabbitMQ para consumir as solicitações cognitivas, instanciar dinamicamente os agentes CrewAI através do `AgentPackage` e executar as tarefas multiagente.

### Fase 3: Data Migration & Parity Testing
1. **Migração de Dados Estruturados:** Executar o plano de migração de banco de dados (sanitização de hashes de MD5 para BCrypt, normalização do modelo de usuários e preferências de favoritos do LibreChat).
2. **Validação de Paridade Funcional:** Executar os cenários de teste automatizados Cucumber/Gherkin descritos na pasta `parity_tests/` para auditar a paridade e a conformidade da resposta dos agentes.

### Fase 4: Production Cutover
1. **Deploy Blue-Green:** Deploy da nova plataforma ao lado dos sistemas legados.
2. **Dupla Escrita Temporária:** Manter a sincronização do banco de dados legado com a nova plataforma para viabilizar um rollback rápido.
3. **Traffic Cutover:** Roteamento gradual do tráfego do frontend Next.js legado para o Next.js moderno da nova plataforma Agent Operating Platform.
