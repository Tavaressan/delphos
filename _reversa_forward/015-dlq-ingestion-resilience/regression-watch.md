# Regression Watch: DLQ + Resiliência no Ingestion-Worker

> Identificador: `015-dlq-ingestion-resilience`
> Gerado por: `reversa-coding`
> Data: `2026-06-19`

## Watch Items

| ID | Origem (arquivo, seção) | Regra esperada após mudança | Tipo de verificação | Sinal de violação |
|----|-------------------------|-----------------------------|---------------------|-------------------|
| W001 | `_reversa_sdd/review.md#G-NEW-05` / `main.rs` error handler | Jobs falhos no consumer loop devem gerar INSERT em `failed_jobs` antes do NACK; `requeue: false` permanece | `presença` | Se extração reversa mostrar que o Err branch de main não menciona `failed_jobs` ou sqlx INSERT — regressão |
| W002 | `_reversa_sdd/review.md#G-NEW-06` / `main.rs execute_ingestion` | Branch `.docx` presente no match de file_type; função `extract_text_from_docx` existe | `presença` | Se extração reversa não detectar o branch docx em execute_ingestion — regressão |
| W003 | `_reversa_sdd/review.md#G-NEW-07` / `main.rs execute_ingestion` | `chunk_size` e `chunk_overlap` lidos de env (`CHUNK_SIZE`, `CHUNK_OVERLAP`) com fallback numérico — não mais hardcoded | `redação` | Se extração reversa mostrar `let chunk_size = 1000` ou `let chunk_overlap = 200` como literais — regressão |
| W004 | `_reversa_sdd/detective.md#3.2` / Document lifecycle | Estado `FAILED` é agora re-entrante: `POST /api/documents/{id}/retry` pode transitar de volta para `PROCESSING` | `redação` | Se extração reversa descrever `FAILED` como estado terminal sem menção a retry — regressão |
| W005 | `_reversa_sdd/domain.md` / Multi-tenancy invariant | `failed_jobs.tenant_id NOT NULL` e endpoint `GET /api/admin/failed-jobs` filtra por tenant | `presença` | Se extração futura mostrar `failed_jobs` sem `tenant_id` ou endpoint sem filtro de tenant — regressão |

## Histórico de re-extrações

<!-- Preenchido pelo agente /reversa quando rodar nova extração após esta feature -->

## Arquivadas

<!-- Watch items encerrados após confirmação em re-extração -->