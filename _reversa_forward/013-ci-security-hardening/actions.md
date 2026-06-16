# Actions: CI Pipeline Optimization & Security Hardening (Defense in Depth)

> Identificador: `013-ci-security-hardening`
> Data: `2026-06-16`
> Roadmap: `_reversa_forward/013-ci-security-hardening/roadmap.md`

## Resumo

| Métrica | Valor |
|---------|-------|
| Total de ações | 20 |
| Paralelizáveis (`[//]`) | 15 |
| Maior cadeia de dependência | 6 |

## Fase 1, Preparação

<!-- Setup, scaffolding, migrações iniciais, configuração de infraestrutura local. -->

| ID | Descrição | Dependências | Paralelismo | Arquivo alvo | Confidência | Status |
|----|-----------|--------------|-------------|--------------|-------------|--------|
| T001 | Adicionar o serviço ClamAV daemon (`clamav/clamav:stable`) com a porta 3310 exposta na rede interna no `docker-compose.yml` | - | `[//]` | `docker-compose.yml` | 🟢 | `[X]` |
| T002 | Criar a migração do Flyway `V6__add_multi_tenancy_rls.sql` para adicionar `tenant_id` e habilitar Row-Level Security no PostgreSQL | - | `[//]` | `java-core/src/main/resources/db/migration/V6__add_multi_tenancy_rls.sql` | 🟢 | `[X]` |
| T003 | Atualizar o pipeline do GitHub Actions para a versão otimizada com cache para Next.js, JUnit/Cucumber, Rust-cache e novo job de Python CI | - | `[//]` | `.github/workflows/ci.yml` | 🟢 | `[X]` |

## Fase 2, Testes

<!-- Testes que precisam existir antes ou logo após o núcleo. -->

| ID | Descrição | Dependências | Paralelismo | Arquivo alvo | Confidência | Status |
|----|-----------|--------------|-------------|--------------|-------------|--------|
| T004 | Desenvolver suite de testes de integração JUnit/Cucumber no backend Java para validar isolamento de inquilino via header `X-Tenant-ID` | T002 | `[//]` | `java-core/src/test/java/com/company/core/interfaces/rest/MultiTenantControllerIT.java` | 🟢 | `[X]` |
| T005 | Desenvolver suite de testes JUnit para validar bloqueios automáticos no endpoint de chat do RAG contra Prompt Injections | - | `[//]` | `java-core/src/test/java/com/company/core/interfaces/rest/PromptInjectionIT.java` | 🟢 | `[X]` |
| T006 | Desenvolver suite de testes JUnit para validar rejeições no upload de arquivos maliciosos ou extensões fraudulentas | T001 | `[//]` | `java-core/src/test/java/com/company/core/interfaces/rest/SecureUploadIT.java` | 🟢 | `[X]` |
| T007 | Desenvolver testes utilizando PyTest para certificar o linting e lógica do CrewAI no novo job Python CI | T003 | `[//]` | `python-services/tests/ci_validation_test.py` | 🟡 | `[X]` |

## Fase 3, Núcleo

<!-- Lógica central da feature. -->

| ID | Descrição | Dependências | Paralelismo | Arquivo alvo | Confidência | Status |
|----|-----------|--------------|-------------|--------------|-------------|--------|
| T008 | Adicionar a dependência de análise de arquivos `org.apache.tika:tika-core:2.9.1` no build do Spring Boot | - | - | `java-core/build.gradle.kts` | 🟢 | `[X]` |
| T009 | Implementar o interceptador `TenantInterceptor` para leitura do header `X-Tenant-ID` e injeção do ID na thread local | T004 | `[//]` | `java-core/src/main/java/com/company/core/infrastructure/security/TenantInterceptor.java` | 🟢 | `[X]` |
| T010 | Implementar o interceptador `PromptInjectionInterceptor` usando regex para cálculo de risco no prompt do chat | T005 | `[//]` | `java-core/src/main/java/com/company/core/infrastructure/security/PromptInjectionInterceptor.java` | 🟡 | `[X]` |
| T011 | Criar a classe utilitária `FileUploadValidator` com validação de bytes mágicos utilizando Apache Tika | T008 | `[//]` | `java-core/src/main/java/com/company/core/infrastructure/security/FileUploadValidator.java` | 🟢 | `[X]` |
| T012 | Criar o serviço `ClamAvService` com integração TCP socket para escaneamento de vírus do arquivo enviado | T001, T006 | `[//]` | `java-core/src/main/java/com/company/core/infrastructure/security/ClamAvService.java` | 🟢 | `[X]` |

## Fase 4, Integração

<!-- Cola com outras partes do sistema, contratos externos, ganchos. -->

| ID | Descrição | Dependências | Paralelismo | Arquivo alvo | Confidência | Status |
|----|-----------|--------------|-------------|--------------|-------------|--------|
| T013 | Registrar os interceptadores de tenant e injeção de prompt na configuração de MVC do Spring Boot | T009, T010 | - | `java-core/src/main/java/com/company/core/infrastructure/config/WebMvcConfig.java` | 🟢 | `[X]` |
| T014 | Atualizar o controller de upload de documentos para aplicar `FileUploadValidator` e `ClamAvService` antes do envio ao MinIO | T011, T012 | - | `java-core/src/main/java/com/company/core/interfaces/rest/DocumentController.java` | 🟢 | `[X]` |
| T015 | Ajustar a busca vetorial no `DocumentChunkRepository` para obrigar filtragem parametrizada pela coluna `tenant_id` | T002, T009 | `[//]` | `java-core/src/main/java/com/company/core/domain/repositories/DocumentChunkRepository.java` | 🟢 | `[X]` |
| T016 | Adicionar limitadores de profundidade de execução, timeouts e allowlist de ferramentas nas configurações do CrewAI Worker | T007 | `[//]` | `python-services/crew_worker.py` | 🟡 | `[X]` |
| T017 | Configurar interceptador HTTP no cliente API do frontend Next.js para injetar o header `X-Tenant-ID` in todas as requisições | - | `[//]` | `frontend/src/lib/api-client.ts` | 🟢 | `[X]` |
| T018 | Habilitar cabeçalhos CSP rígidos no Next.js e encapsular saídas de chat com componente sanitizado por `DOMPurify` | - | `[//]` | `frontend/next.config.js` | 🟢 | `[X]` |

## Fase 5, Polimento

<!-- Logs, telemetria, mensagens de erro, documentação corta. -->

| ID | Descrição | Dependências | Paralelismo | Arquivo alvo | Confidência | Status |
|----|-----------|--------------|-------------|--------------|-------------|--------|
| T019 | Adicionar logs estruturados de auditoria de segurança para incidentes de prompt injection e bloqueios de uploads | T010, T014 | `[//]` | `java-core/src/main/java/com/company/core/application/AuditService.java` | 🟢 | `[X]` |
| T020 | Configurar métricas customizadas de incidentes de segurança via Actuator e Micrometer para exportação ao Prometheus | T013 | `[//]` | `java-core/src/main/java/com/company/core/infrastructure/config/MetricsConfig.java` | 🟡 | `[X]` |

## Notas de execução

<!--
Reservado para /reversa-coding registrar avisos ou observações que surgiram durante a execução.
Não use isso para corrigir ações, edits manuais ficam fora desse arquivo, vão direto no código.
-->

## Histórico de alterações

| Data | Alteração | Autor |
|------|-----------|-------|
| 2026-06-16 | Versão inicial gerada por `/reversa-to-do` | reversa |
| 2026-06-16 | Marcar tarefas como concluídas no ciclo de coding | reversa |
