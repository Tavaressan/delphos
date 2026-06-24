# Legacy Impact: DLQ + Resiliência no Ingestion-Worker

> Identificador: `015-dlq-ingestion-resilience`
> Data: `2026-06-19`
> Feature: DLQ via `failed_jobs`, parser `.docx`, chunking configurável, endpoints de admin Java Core

## Arquivos Afetados

| Arquivo afetado | Componente (`_reversa_sdd/architecture.md`) | Tipo | Severidade | Justificativa |
|-----------------|---------------------------------------------|------|------------|---------------|
| `rust-services/ingestion-worker/src/main.rs` | Worker — Ingestion Worker | `regra-alterada` | HIGH | Error handler agora registra jobs em DLQ antes do NACK; parser estendido para `.docx`; chunking parametrizado |
| `rust-services/ingestion-worker/Cargo.toml` | Worker — Ingestion Worker | `regra-nova` | LOW | Nova dependência `docx-rs 0.4` para parsing de documentos Word |
| `java-core/src/main/resources/db/migration/V6__failed_jobs.sql` | Core API — PostgreSQL Schema | `delta-de-dados` | HIGH | Nova tabela `failed_jobs` com FK para `documents`; aplica via Flyway no startup |
| `java-core/src/main/java/com/company/core/domain/entities/FailedJob.java` | Core API — Domain | `componente-novo` | MEDIUM | Nova entidade JPA mapeada a `failed_jobs` |
| `java-core/src/main/java/com/company/core/domain/repositories/FailedJobRepository.java` | Core API — Domain | `componente-novo` | MEDIUM | Novo repositório JPA com query por `tenant_id` paginada |
| `java-core/src/main/java/com/company/core/interfaces/rest/FailedJobController.java` | Core API — REST | `delta-de-contrato-externo` | MEDIUM | Dois endpoints novos: `GET /api/admin/failed-jobs` e `POST /api/documents/{id}/retry` |
| `docker-compose.yml` | Infra — Docker Compose | `regra-nova` | LOW | Documentação das variáveis de ambiente opcionais `CHUNK_SIZE` e `CHUNK_OVERLAP` |

## Diff conceitual por componente

### Ingestion Worker (`main.rs`)

**Antes:** qualquer erro no consumer loop resultava em NACK imediato com perda silenciosa do job. O parser de documentos só tratava PDF e texto plano (`.docx` era indexado como XML cru). `chunk_size` e `chunk_overlap` eram constantes hardcoded (1000 / 200).

**Depois:** (1) Erro no consumer loop → parse do body → INSERT em `failed_jobs` com `document_id`, `tenant_id`, `payload` e `error_message` → NACK. Se INSERT falhar, log de aviso mas NACK prossegue. (2) Branch `else if .docx` antes do fallback de texto plano — chama `extract_text_from_docx` via `docx-rs`, extrai parágrafos. (3) `chunk_size` e `chunk_overlap` lidos de `CHUNK_SIZE` / `CHUNK_OVERLAP` com parse + fallback para 1000/200.

### PostgreSQL Schema

Nova tabela `failed_jobs` via Flyway V6. Tem FK nullable para `documents(id)` (nullable porque o job pode ter payload inválido e `document_id` pode não ser parseável). `tenant_id NOT NULL` preserva o invariante de multi-tenancy. Dois índices compostos para queries admin e retry.

### Core API — REST

`GET /api/admin/failed-jobs?tenantId=<UUID>` retorna `Page<FailedJob>` filtrado por tenant. `POST /api/documents/{id}/retry` re-publica o payload original na exchange `agent.execution.exchange` routing key `document.ingestion.jobs`, atualiza status do documento para `PROCESSING` e incrementa `retry_count`.

## Preservadas

Regras 🟢 do `_reversa_sdd/domain.md` que continuam intactas após esta feature:

- **RN-01 (Multi-tenancy):** `failed_jobs.tenant_id NOT NULL` respeita o invariante; todos os endpoints filtram por tenant.
- **RN-02 (JWT stateless):** nenhuma sessão criada; endpoints de admin requerem `tenantId` como parâmetro (alinhado com o padrão atual do projeto).
- **RN-03 (Tipos aceitos — `.docx`):** `.docx` declarado como tipo aceito em `AgentService.java` agora tem pipeline de extração real no worker.
- **Ciclo de vida Document (PROCESSING → INDEXED | FAILED):** preservado; `FAILED` pode agora transitar de volta para `PROCESSING` via retry — alteração compatível confirmada em RN-B02.
- **Comportamento do broker RabbitMQ:** sem mudança na exchange, routing key ou formato do payload de ingestão.

## Modificadas

Regras 🟢 afetadas por esta feature:

- **G-NEW-05 (NACK sem registro):** comportamento de descarte silencioso eliminado. Agora há persistência em `failed_jobs` antes do NACK.
- **G-NEW-06 (Parser `.docx`):** gap fechado. `.docx` agora tem extração real de texto via `docx-rs`.
- **G-NEW-07 (chunking hardcoded):** gap fechado. Valores parametrizáveis via env vars com fallback idêntico ao anterior.
- **Estado `FAILED` como terminal:** agora é re-entrante — `POST /api/documents/{id}/retry` pode mudar status de volta para `PROCESSING`.