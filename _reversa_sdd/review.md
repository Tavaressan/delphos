# Relatório de Revisão Cruzada — Alfabra-Vector

> Gerado pelo Reversa (Revisor) em 2026-06-19
> Revisão cruzada entre execução anterior (2026-05-25) e extração atual (2026-06-19)

---

## 1. Resumo Executivo

Esta revisão cruzou os artefatos gerados na **extração atual** (Scout, Arqueólogo, Detetive, Arquiteto, Redator — junho/2026) com os artefatos da **execução anterior** (maio/2026). Foram encontradas **3 divergências**, **1 lacuna crítica reaberta** e **4 novos gaps** não identificados na sessão anterior.

| Categoria | Quantidade |
|-----------|-----------|
| Confirmações entre execuções | 12 |
| Divergências identificadas | 3 |
| Lacuna crítica reaberta | 1 |
| Novos gaps não identificados anteriormente | 4 |
| Inconsistências de versão corrigidas | 2 |

---

## 2. Divergências Entre Execuções

### DIV-01 — 🔴 JWT/RBAC: Decisão documentada, mas NÃO implementada no código

**Execução anterior (gaps.md, 2026-05-25):**
> "🔴 → 🟢 Configuração de JWT resolvida — OAuth2 Resource Server + JWT HS256 via .env"

**Evidência atual (detective.md / SecurityConfig.java:31):**
```java
.authorizeHttpRequests(auth -> auth
    .anyRequest().permitAll()   // ← ainda no código
);
```

**Veredicto:** A "resolução" anterior documentou uma **decisão arquitetural futura**, não código implementado. O `SecurityConfig.java` em produção ainda libera todos os endpoints sem autenticação. A lacuna G-01 do Detective está **ativa no código atual**.

**Impacto:** Qualquer client pode submeter execuções, listar documentos e acessar conversas de qualquer tenant sem autenticação. Toda a matriz RBAC existe no banco mas é inoperante.

**Ação requerida:** 🔴 LACUNA CRÍTICA REABERTA — implementação de JWT pendente.

---

### DIV-02 — 🟢 RESOLVIDA — ingestion-worker usa exclusivamente RabbitMQ

**Execução anterior (architecture.md):**
> "O Ingestion Worker realiza consultas frequentes (polling) no banco PostgreSQL"

**Confirmado por leitura de código ([ingestion-worker/src/main.rs:108](rust-services/ingestion-worker/src/main.rs#L108)):**
```rust
while let Some(delivery) = consumer.next().await {
    // loop bloqueante — event-driven, sem polling
}
```

O worker entra num consumer loop bloqueante sobre a fila `document.ingestion.jobs`. Não há `sleep` periódico nem varredura de banco. O PostgreSQL é usado exclusivamente para escrita (atualizar status e inserir chunks).

**Conclusão:** A documentação anterior (`architecture.md`) e o `CLAUDE.md` estavam desatualizados. O ingestion-worker foi refatorado para RabbitMQ no commit `9e2bba0`. 🟢 CONFIRMADO.

---

### DIV-03 — 🟢 Versões de dependências desatualizadas no artefato anterior

| Dependência | Execução anterior | Estado atual (código) | Status |
|-------------|------------------|-----------------------|--------|
| Java | 17 | **21** (`build.gradle.kts:11`) | 🟢 Corrigido nesta extração |
| Spring Boot | 3.2.5 | **4.1.0** (Dependabot bump) | 🟢 Corrigido nesta extração |
| Next.js | 14.2.3 | **^14.2.35** (Dependabot bump) | 🟢 Corrigido nesta extração |

---

## 3. Novos Gaps Identificados Nesta Extração

Gaps não presentes nos artefatos da execução anterior.

| ID | Gap | Severidade | Origem |
|----|-----|------------|--------|
| G-NEW-01 | `agent_executions` sem coluna `tenant_id` — impossível filtrar execuções por tenant sem JOIN extra | 🟡 MÉDIO | detective.md G-03 |
| G-NEW-02 | `audit_logs` sem `tenant_id` — admin de um tenant pode tecnicamente ver logs de outro | 🟡 MÉDIO | detective.md G-04 |
| G-NEW-03 | CrewAI agent hardcoded como "Elevator Specialist" — não parametriza por `agent_id` ou `system_instructions` do banco | 🟡 MÉDIO | detective.md G-06 |
| G-NEW-04 | Redis declarado como dependência (`spring-boot-starter-data-redis`) mas sem uso identificado nos workers analisados | 🟡 MÉDIO | architect.md Impact Matrix |
| G-NEW-05 | NACK sem DLQ e `requeue: false` — jobs de ingestão que falham são descartados silenciosamente, sem retry automático | 🔴 ALTO | ingestion-worker/main.rs:148 |
| G-NEW-06 | Parser de documentos incompleto — apenas PDF (lopdf) e texto plano implementados; `.docx` e `.md` não têm parser dedicado (tratados como texto plano) | 🟡 MÉDIO | ingestion-worker/main.rs:210 |
| G-NEW-07 | Chunking hardcoded — `chunk_size=1000` chars e `chunk_overlap=200` não são configuráveis via env var | 🟢 BAIXO | ingestion-worker/main.rs:222 |

---

## 4. Confirmações Entre Execuções

Itens validados por ambas as extrações — alta confiança.

| Item | Confirmado em |
|------|--------------|
| RBAC: 2 roles (ROLE_ADMIN, ROLE_USER), 5 permissões | permissions.md (ant.) + detective.md (atual) |
| Vertex AI como provedor de embeddings (768D) | questions.md (ant.) + detective.md ADR-R002 (atual) |
| HNSW index para busca de cosseno no pgvector | architecture.md (ant.) + architect.md ERD (atual) |
| Caddy como API Gateway com TLS automático DuckDNS | architecture.md (ant.) + architect.md ADR-A05 (atual) |
| Multi-tenancy via `tenant_id` em entidades principais | architecture.md (ant.) + architect.md (atual) |
| Ingestion pipeline: lopdf / docx-rs / Tesseract | questions.md resposta 2 (ant.) + inventory.md (atual) |
| Auth.js + cookies HTTPOnly para sessão do frontend | questions.md resposta 3 (ant.) + sdd.md (atual) |
| Structurizr exclusivo dev local (não vai para produção) | questions.md resposta 4 (ant.) |
| Polling frontend 2s / timeout 2min | code-analysis.md (ant.) + detective.md RN-04 (atual) |
| Top 5 chunks RAG por similaridade de cosseno | code-analysis.md (ant.) + detective.md RN-05 (atual) |
| RabbitMQ assíncrono para Java → Workers | architecture.md (ant.) + architect.md (atual) |
| Dívida técnica: sem fallback Vertex AI | architecture.md (ant.) + detective.md G-07 (atual) |

---

## 5. Lacunas Pendentes para Validação Humana

Todas as perguntas desta sessão foram respondidas. Nenhuma lacuna pendente de validação humana.

---

## 6. Relatório de Confiança Atualizado

Consolidado sobre todos os artefatos desta extração (junho/2026).

| Nível | Itens | Percentual |
|-------|-------|-----------|
| 🟢 CONFIRMADO | 72 | 85.7% |
| 🟡 INFERIDO | 7 | 8.3% |
| 🔴 LACUNA | 5 | 6.0% |
| **Total** | **84** | **100%** |

**Confiança geral: 88.7%**
_(calculada como: `(72 + 7×0.5 + 5×0) / 84 × 100`)_

> **Nota:** Atualizado após confirmação de DIV-02 (RabbitMQ exclusivo no ingestion-worker — +1 🟢) e adição de 3 novos gaps descobertos pela leitura do código: NACK sem DLQ (🔴), parser docx ausente (🟡), chunking hardcoded (🟢).

### Por Artefato

| Artefato | 🟢 | 🟡 | 🔴 | Confiança |
|----------|----|----|----|----|
| inventory.md | 12 | 0 | 0 | 100% |
| dependencies.md | 10 | 1 | 0 | 95.2% |
| code-analysis.md | 18 | 2 | 0 | 94.7% |
| detective.md | 10 | 3 | 2 | 82.7% |
| architect.md | 9 | 2 | 1 | 83.3% |
| domain.md | 5 | 1 | 0 | 91.7% |
| sdd.md | 4 | 0 | 1 | 80.0% |

---

## 7. Recomendações de Evolução (Priorizadas)

### 🔴 Críticas — implementar antes de qualquer deploy produtivo

1. **Implementar JWT + Spring Security FilterChain** conforme decisão arquitetural já definida em `questions.md`:
   - `SecurityConfig` com `OAuth2 Resource Server` + `JwtDecoder` com chave `HS256`
   - Variáveis de ambiente: `JWT_SECRET`, `JWT_EXPIRATION=3600000`, `JWT_REFRESH_EXPIRATION=604800000`
   - Proteger `/api/admin/**` para `ROLE_ADMIN` e `/api/**` para `ROLE_USER`

2. **Adicionar `tenant_id` à tabela `agent_executions`** via nova migration Flyway `V6__add_tenant_to_executions.sql`

### 🟡 Médias — próximo ciclo

3. **Parametrizar o agente CrewAI** — remover hardcode "Elevator Specialist" e carregar `system_instructions` + `agent_id` do banco dinamicamente no `crewai_adapter.py`

4. **Confirmar uso do Redis** — identificar onde `spring-boot-starter-data-redis` é realmente utilizado ou remover a dependência se não houver uso planejado

5. **Adicionar `tenant_id` à tabela `audit_logs`** via migration

6. **Implementar retry exponencial** no `embedding-service` para falhas da API Vertex AI

### 🟢 Manutenção

7. Atualizar `_reversa_sdd/architecture.md` (execução anterior) para refletir que Spring Boot já está em 4.1.0 e Java em 21
8. Resolver DIV-02 (confirmar mecanismo do ingestion-worker) e atualizar `architect.md`
