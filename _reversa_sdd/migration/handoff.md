---
schemaVersion: 1
generatedAt: 2026-05-27T14:18:00-03:00
reversa:
  version: "1.2.43"
kind: handoff
producedBy: orchestrator
hash: "sha256:d89502931a7c06ebc8c12a8b965f723aeec895eae81087a41df99de001292bf9"
---

# Handoff para o Agente de Codificação (Enterprise Agent Operating Platform)

> Este documento resume a conclusão da fase de consolidação arquitetural e geração da suíte de especificações de migração para apoiar a implementação da nova **Enterprise Agent Operating Platform**.

---

## ⚠️ Leitura obrigatória primeiro

1. **`paradigm_decision.md`**, leitura inegociável. Define a arquitetura orientada a eventos assíncrona baseada em RabbitMQ e o desacoplamento rígido de runtimes cognitivos através da interface `AgentRuntime`.
2. **`topology_decision.md`**, leitura inegociável. Define a estrutura de diretórios final do Monorepo, separando a camada de coordenação Java, workers Rust e workers cognitivos Python.
3. **`agent_package_spec.md`**, leitura inegociável para a implementação de novas capacidades cognitivas, especificando o schema YAML do `manifest.yaml` e as políticas de segurança e empacotamento dos agentes.

---

## Ordem de leitura recomendada

1. `paradigm_decision.md` (obrigatório, primeiro)
2. `topology_decision.md` (obrigatório, segundo)
3. `agent_package_spec.md` (obrigatório, terceiro)
4. `execution_lifecycle.md`
5. `delivery_semantics.md`
6. `observability_strategy.md`
7. `tool_execution_contract.md`
8. `multi_tenancy_model.md`
9. `runtime_capabilities_matrix.md`
10. `failure_modes.md`
11. `migration_brief.md`
12. `target_business_rules.md`
13. `target_architecture.md`
14. `target_domain_model.md`
15. `target_data_model.md`
16. `data_migration_plan.md`
17. `target_screens.md`
18. `screen_modernization_decision.md`
19. `screen_deviation_log.md`
20. `parity_specs.md` + `parity_tests/`
21. `risk_register.md` + `cutover_plan.md`
22. `discard_log.md`
23. `ambiguity_log.md`

---

## Lista de artefatos de migração produzidos

Todas as especificações consolidadas foram gravadas na pasta `alfabra_vector_specs/migration/`:

| Artefato | Finalidade Técnica | Status |
|---|---|---|
| `.state.json` | Estado final do pipeline do orquestrador | Concluído ✅ |
| `migration_brief.md` | Escopo unificado, stack (Java/Rust/Python/RabbitMQ) e restrições | Criado |
| `paradigm_decision.md` | Orientação a eventos, contratos `AgentRuntime` | Criado |
| `target_business_rules.md` | Unificação de regras de negócio de LibreChat e MaxKB4j | Criado |
| `discard_log.md` | Registro de elementos incompatíveis eliminados (FastAPI síncrono, MD5) | Criado |
| `migration_strategy.md` | Fases de transição, infraestrutura e deploy | Criado |
| `risk_register.md` | Riscos de loops cognitivos, latências e mitigações | Criado |
| `cutover_plan.md` | Checklist de deploy, Go/No-Go e rollback | Criado |
| `topology_decision.md` | Estrutura de pastas do monorepo | Criado |
| `target_architecture.md` | Fluxo de comunicação e boundaries dos workers | Criado |
| `target_domain_model.md` | Domínio de Agent Engineering e modelos de memória desacoplados | Criado |
| `target_data_model.md` | Schema PostgreSQL (auditorias imutáveis e pgvector parametrizável) | Criado |
| `data_migration_plan.md` | Pipeline de ingestão histórica, sanitização e favoritos | Criado |
| `screen_modernization_decision.md` | Regras Next.js e 4 estados estritos de componentes | Criado |
| `target_screens.md` | Layout de login (MFA/CAPTCHA), catálogos, console e RAG | Criado |
| `screen_deviation_log.md` | Mapeamento e justificativa de desvios visuais | Criado |
| `agent_package_spec.md` | Schema e diretórios do pacote de conformidade de agentes | Criado |
| `execution_lifecycle.md` | Máquina de estados das execuções e eventos assíncronos | Criado |
| `delivery_semantics.md` | Garantias `at-least-once`, idempotência e DLQs | Criado |
| `observability_strategy.md` | Tracing OpenTelemetry, traceparent e correlation IDs | Criado |
| `tool_execution_contract.md` | Contratos de sandboxing AST de Groovy, timeouts e retries | Criado |
| `multi_tenancy_model.md` | Segregação lógica relational/vetorial por tenantId e quotas | Criado |
| `runtime_capabilities_matrix.md` | Matriz comparativa de capacidades de runtimes cognitivos/determinísticos | Criado |
| `failure_modes.md` | Catálogo de erros operacionais e ações de recuperação (SRE) | Criado |
| `parity_specs.md` | Regras de validação e matriz de cobertura funcional | Criado |
| `parity_tests/` | Cenários Gherkin de auditorias de execução e sandbox | 2 arquivos criados |
| `ambiguity_log.md` | Registro das resoluções (KEEP, MERGE, ADAPT, DISCARD, AUTHORITATIVE) | Criado |

---

## Instruções de Implementação para o Coder

Para materializar a plataforma, execute na ordem:

1. **Configurar o Monorepo:** Inicializar a árvore de diretórios conforme especificado em `topology_decision.md`. Configurar o build do Gradle no `java-core` e os workspaces do Cargo em `rust-services`.
2. **Implementar a Infraestrutura e Banco:** Subir o docker-compose local na pasta `infrastructure/` com PostgreSQL, Redis, RabbitMQ e MinIO. Executar as migrações SQL iniciais usando Flyway em `java-core` contendo os schemas de `target_data_model.md` e habilitando pgvector com largura de dimensões parametrizável.
3. **Desenvolver o Event Backbone no RabbitMQ:** Declarar a infraestrutura de exchanges e filas assíncronas do RabbitMQ, incluindo as políticas de TTL e Dead Letter Exchange para tratamento de erros, detalhadas em `delivery_semantics.md`.
4. **Implementar os Workers:**
   - **Rust `ingestion-worker` & `rag-worker`:** Processadores físicos de extração de texto multiformato e busca de cosseno com índice HNSW.
   - **Rust `workflow-worker`:** Motor determinístico de execução de DAGs estruturadas.
   - **Python `crew-worker`:** Consumidor assíncrono conectado ao RabbitMQ, instanciando os runtimes cognitivos do CrewAI a partir de pacotes homologados e injetando as ferramentas conforme `tool_execution_contract.md`.
5. **Desenvolver a Camada Spring Gateway (`java-core`):** Criar as regras de autenticação NextAuth JWT, verificação RBAC multi-tenant, persistência de tokens/faturamento e a gravação obrigatória das tabelas de auditoria imutável (`agent_executions`, `tool_calls`).
6. **Desenvolver o Frontend (Next.js):** Construir as telas Next.js com Tailwind CSS respeitando os 4 estados estritos (`screen_modernization_decision.md`) e conectando ao console de conversação e timeline de execução dos agentes em tempo real via SSE/Websockets.
7. **Executar Testes de Paridade:** Rodar a suíte de testes Cucumber integrada a partir das features em `parity_tests/` e validar se a plataforma respeita todas as regras funcionais legadas consagradas de favoritos, 2FA, e sandboxing.
