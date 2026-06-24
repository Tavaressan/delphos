# Actions: DLQ + Resiliência no Ingestion-Worker

> Identificador: `015-dlq-ingestion-resilience`
> Data: `2026-06-19`
> Roadmap: `_reversa_forward/015-dlq-ingestion-resilience/roadmap.md`

## Resumo

| Métrica | Valor |
|---------|-------|
| Total de ações | 10 |
| Paralelizáveis (`[//]`) | 5 |
| Maior cadeia de dependência | 4 (T002→T004→T005→T009 e T001→T006→T007→T008) |

---

## Fase 1 — Preparação

| ID | Descrição | Dependências | Paralelismo | Arquivo alvo | Confidência | Status |
|----|-----------|--------------|-------------|--------------|-------------|--------|
| T001 | Criar `V6__failed_jobs.sql`: DDL com `CREATE TABLE failed_jobs (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), document_id UUID REFERENCES documents(id) ON DELETE SET NULL, tenant_id UUID NOT NULL, queue VARCHAR(255) NOT NULL DEFAULT 'document.ingestion.jobs', payload JSONB NOT NULL, error_message TEXT NOT NULL, retry_count INT NOT NULL DEFAULT 0, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), next_retry_at TIMESTAMPTZ)` + `CREATE INDEX idx_failed_jobs_tenant ON failed_jobs(tenant_id)` + `CREATE INDEX idx_failed_jobs_document ON failed_jobs(document_id)` | — | `[//]` | `java-core/src/main/resources/db/migration/V6__failed_jobs.sql` | 🟢 | `[X]` |
| T002 | Adicionar linha `docx-rs = "0.4"` na seção `[dependencies]` do Cargo.toml do ingestion-worker, após a linha do `lopdf` | — | `[//]` | `rust-services/ingestion-worker/Cargo.toml` | 🟢 | `[X]` |

---

## Fase 3 — Núcleo

| ID | Descrição | Dependências | Paralelismo | Arquivo alvo | Confidência | Status |
|----|-----------|--------------|-------------|--------------|-------------|--------|
| T003 | Em `execute_ingestion` (linha 222 de `main.rs`): substituir `let chunk_size = 1000;` e `let chunk_overlap = 200;` por: `let chunk_size: usize = env::var("CHUNK_SIZE").unwrap_or_else(\|_\| "1000".to_string()).parse().unwrap_or(1000);` e `let chunk_overlap: usize = env::var("CHUNK_OVERLAP").unwrap_or_else(\|_\| "200".to_string()).parse().unwrap_or(200);`. `env` já está importado na linha 5. | — | `[-]` | `rust-services/ingestion-worker/src/main.rs` | 🟢 | `[X]` |
| T004 | Em `execute_ingestion` (linha 210 de `main.rs`): no bloco `let text = if job.file_type.eq_ignore_ascii_case("pdf")`, adicionar ramo `else if job.file_type.eq_ignore_ascii_case("docx") { extract_text_from_docx(&bytes)? }` antes do ramo `else` (texto plano). Adicionar a função síncrona `fn extract_text_from_docx(bytes: &[u8]) -> Result<String>` que executa: `let docx = docx_rs::read_docx(bytes).context("Failed to parse .docx")?;` e itera `docx.document.body.children` acumulando o texto dos parágrafos via `paragraph.children` (filtrando `Run`s e seus `RunContent`); retorna o texto concatenado ou `Err` se vazio. | T002 | `[-]` | `rust-services/ingestion-worker/src/main.rs` | 🟢 | `[X]` |
| T005 | No `Err(e)` branch do consumer loop em `main` (linha 140 de `main.rs`): antes do bloco `delivery.nack(...)`, inserir: (1) tentativa de parsear `body` como `IngestionJob` com `serde_json::from_str::<IngestionJob>(&body)`; (2) se parse OK, executar `sqlx::query!("INSERT INTO failed_jobs (document_id, tenant_id, queue, payload, error_message) VALUES ($1, $2, $3, $4::jsonb, $5)", Some(job.document_id), job.tenant_id, "document.ingestion.jobs", body.as_ref(), format!("{:#}", e)).execute(&db_pool).await`; (3) se INSERT falhar, `println!("WARN: Failed to insert job into DLQ: {}", dlq_err)` mas não interromper fluxo. O `db_pool` já está em scope no `main` e precisa ser referenciado no branch de erro (mover o bloco `Err(e)` para ser `async` ou passar `&db_pool` via captura da closure do while-let). | T001, T003, T004 | `[-]` | `rust-services/ingestion-worker/src/main.rs` | 🟢 | `[X]` |

---

## Fase 4 — Integração (Should)

| ID | Descrição | Dependências | Paralelismo | Arquivo alvo | Confidência | Status |
|----|-----------|--------------|-------------|--------------|-------------|--------|
| T006 | Criar entidade JPA `FailedJob.java` com `@Entity @Table(name = "failed_jobs")`. Campos: `@Id @GeneratedValue UUID id`, `UUID documentId`, `@Column(nullable=false) UUID tenantId`, `String queue`, `@Column(columnDefinition="jsonb") String payload`, `String errorMessage`, `int retryCount`, `OffsetDateTime createdAt`, `OffsetDateTime nextRetryAt`. Usar `@Column(name = "document_id")` etc. para mapear snake_case. Pacote `com.company.core.domain.entities`. | T001 | `[//]` | `java-core/src/main/java/com/company/core/domain/entities/FailedJob.java` | 🟢 | `[X]` |
| T007 | Criar `FailedJobRepository.java` com `public interface FailedJobRepository extends JpaRepository<FailedJob, UUID>` e método `Page<FailedJob> findByTenantId(UUID tenantId, Pageable pageable)`. Pacote `com.company.core.domain.repositories`. | T006 | `[-]` | `java-core/src/main/java/com/company/core/domain/repositories/FailedJobRepository.java` | 🟢 | `[X]` |
| T008 | Criar `FailedJobController.java` com `@RestController`. Dois endpoints: (1) `@GetMapping("/api/admin/failed-jobs")` — extrai `tenantId` do JWT via `Authentication`, chama `failedJobRepository.findByTenantId(tenantId, pageable)`, retorna `Page<FailedJob>`; (2) `@PostMapping("/api/documents/{id}/retry")` — busca `FailedJob` por `documentId == id` mais recente, publica `payload` (String JSON) de volta na fila `document.ingestion.jobs` via `RabbitTemplate`, atualiza `documents.status = 'PROCESSING'` via `DocumentRepository`. Injetar `FailedJobRepository`, `DocumentRepository`, `RabbitTemplate` via construtor. Pacote `com.company.core.interfaces.rest`. | T007 | `[-]` | `java-core/src/main/java/com/company/core/interfaces/rest/FailedJobController.java` | 🟡 | `[X]` |

---

## Fase 5 — Polimento

| ID | Descrição | Dependências | Paralelismo | Arquivo alvo | Confidência | Status |
|----|-----------|--------------|-------------|--------------|-------------|--------|
| T009 | Em `main.rs`: no branch `Err(e)` do consumer loop, substituir o `println!` de erro genérico (linha 141-143) por log que inclui `document_id` e `tenant_id` quando o parse do job (feito em T005) teve sucesso: `println!("ERROR: document_id={:?} tenant_id={:?} error={:#}", parsed_job.as_ref().map(\|j\| j.document_id), parsed_job.as_ref().map(\|j\| j.tenant_id), e)`. Reusar a variável `parsed_job: Option<IngestionJob>` já declarada em T005. | T005 | `[//]` | `rust-services/ingestion-worker/src/main.rs` | 🟡 | `[X]` |
| T010 | Em `docker-compose.yml`: no serviço `ingestion-worker`, adicionar dentro da chave `environment` (ou criá-la se ausente) as linhas comentadas `# - CHUNK_SIZE=1000` e `# - CHUNK_OVERLAP=200` logo após as variáveis existentes, para documentar a configurabilidade introduzida em T003. | T003 | `[//]` | `docker-compose.yml` | 🟢 | `[X]` |

---

## Notas de execução

<!-- Reservado para /reversa-coding registrar avisos durante a execução. -->

## Histórico de alterações

| Data | Alteração | Autor |
|------|-----------|-------|
| 2026-06-19 | Versão inicial gerada por `reversa-to-do` | reversa |