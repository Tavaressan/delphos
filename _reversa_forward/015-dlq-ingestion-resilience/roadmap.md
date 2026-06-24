# Roadmap: DLQ + Resiliência no Ingestion-Worker

> Identificador: `015-dlq-ingestion-resilience`
> Data: `2026-06-19`
> Requirements: `_reversa_forward/015-dlq-ingestion-resilience/requirements.md`
> Confidência: 🟢 CONFIRMADO, 🟡 INFERIDO, 🔴 LACUNA

## 1. Resumo da abordagem

Três melhorias independentes no `ingestion-worker` Rust, mais uma migration Flyway e endpoints opcionais no Java Core:

1. **DLQ via `failed_jobs`** — na captura de qualquer erro no consumer loop, INSERT em nova tabela PostgreSQL antes do NACK. Sem mudança no comportamento do broker.
2. **Parser `.docx`** — adicionar `docx-rs` ao `Cargo.toml` e branch no match de extensão de arquivo para extrair parágrafos de documentos Word.
3. **Chunking configurável** — ler `CHUNK_SIZE` e `CHUNK_OVERLAP` de variáveis de ambiente na inicialização; fallback para 1000/200.
4. **Java Core (Should)** — `GET /api/admin/failed-jobs` e `POST /api/documents/{id}/retry` para visibilidade e reprocessamento sem re-upload.

## 2. Princípios aplicados

| Princípio | Como a feature se relaciona | Status |
|-----------|------------------------------|--------|
| Multi-tenancy | `failed_jobs` carrega `tenant_id` — consistente com todas as entidades principais | respeita |
| Resiliência | Falhas de ingestão deixam de ser silenciosas e viram dados consultáveis | respeita |
| Configurabilidade via env | `CHUNK_SIZE`/`CHUNK_OVERLAP` seguem o padrão já usado por `EMBEDDING_DIMENSIONS` | respeita |

## 3. Decisões técnicas

| ID | Decisão | Justificativa | Alternativas descartadas | Confidência |
|----|---------|----------------|--------------------------|-------------|
| D-01 | DLQ via PostgreSQL `failed_jobs` (não DLX) | Tenant-awareness nativa, visibilidade via admin Java Core, sem nova infra RabbitMQ | RabbitMQ Dead Letter Exchange — sem tenant_id, exige consumer Rust extra e policy no broker | 🟢 |
| D-02 | `docx-rs` para parsing Word | Crate puro Rust sem dependência nativa; mantém o padrão do `lopdf` já em uso | `mammoth-rs` (menos manutenida), `zip`+XML manual (frágil) | 🟢 |
| D-03 | `CHUNK_SIZE`/`CHUNK_OVERLAP` lidos na startup (não hot-reload) | Simplicidade; restart do worker é operação normal em Docker Compose | Reload dinâmico via sinal Unix — complexidade desnecessária para o estágio atual | 🟢 |
| D-04 | Migration V6 para `failed_jobs` | V1–V5 existem; BL-004 (multi-tenancy) usará V7+V8 em feature futura | — | 🟡 |

## 4. Premissas

| Premissa | Origem | Risco se errada |
|----------|--------|-----------------|
| `ingestion-worker` já possui PgPool ativo para escrita de chunks e status | `ingestion-worker/main.rs` — usa `sqlx` para INSERT de chunks | Baixo — se não existir, adicionar PgPool replica padrão dos outros workers |
| `docx-rs` suporta os subformatos `.docx` usados nos documentos corporativos | Crate doc oficial | Médio — testar com amostra de documentos reais antes de fechar T003 |
| `tenant_id` está disponível no payload do job RabbitMQ | `document.ingestion.jobs` routing — Java Core publica o job com metadados do documento | 🟢 CONFIRMADO por ADR-R006 |

## 5. Delta arquitetural

| Componente | Arquivo de origem no legado | Tipo de mudança | Resumo |
|------------|------------------------------|-----------------|--------|
| `ingestion-worker` | `rust-services/ingestion-worker/src/main.rs` | alterado | Error handler: INSERT em `failed_jobs` antes do NACK |
| `ingestion-worker` | `rust-services/ingestion-worker/src/main.rs` | alterado | Parser: branch `.docx` via `docx-rs` |
| `ingestion-worker` | `rust-services/ingestion-worker/src/main.rs` | alterado | Chunking: lê `CHUNK_SIZE`/`CHUNK_OVERLAP` de env |
| `ingestion-worker` | `rust-services/ingestion-worker/Cargo.toml` | alterado | Nova dependência: `docx-rs` |
| Java Core | novo arquivo `FailedJobRepository.java` | adicionado | Spring Data JPA para `failed_jobs` |
| Java Core | novo arquivo `FailedJobController.java` | adicionado | `GET /api/admin/failed-jobs`, `POST /api/documents/{id}/retry` |

## 6. Delta no modelo de dados

Nova tabela `failed_jobs` via Flyway V6:

```sql
CREATE TABLE failed_jobs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id     UUID REFERENCES documents(id) ON DELETE SET NULL,
    tenant_id       UUID NOT NULL,
    queue           VARCHAR(255) NOT NULL DEFAULT 'document.ingestion.jobs',
    payload         JSONB NOT NULL,
    error_message   TEXT NOT NULL,
    retry_count     INT NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    next_retry_at   TIMESTAMPTZ
);

CREATE INDEX idx_failed_jobs_tenant ON failed_jobs(tenant_id);
CREATE INDEX idx_failed_jobs_document ON failed_jobs(document_id);
```

## 7. Delta de contratos externos

| Contrato | Mudança |
|----------|---------|
| `GET /api/admin/failed-jobs` | Novo endpoint — lista jobs falhos por tenant (paginado) |
| `POST /api/documents/{id}/retry` | Novo endpoint — re-publica job na fila e reseta status para `PROCESSING` |
| RabbitMQ `document.ingestion.jobs` | Sem mudança — comportamento de publicação inalterado |

## 8. Plano de migração

1. Aplicar `V6__failed_jobs.sql` via Flyway (automático no startup do Java Core)
2. Reiniciar `ingestion-worker` com as novas variáveis de ambiente opcionais
3. Nenhuma migração de dados retroativa necessária — `failed_jobs` parte vazia

## 9. Riscos e mitigações

| Risco | Impacto | Probabilidade | Mitigação |
|-------|---------|---------------|-----------|
| `docx-rs` não extrai corretamente subtipos de `.docx` (tabelas, headers) | Médio — texto incompleto indexado | Médio | Testar com amostra real de documentos antes de marcar T003 como [X] |
| INSERT em `failed_jobs` falha (DB indisponível durante falha do job) | Alto — perda silenciosa do registro de erro | Baixo | Logar erro do INSERT mas não bloquear o NACK; o documento já está `FAILED` no banco |
| Conflito de versão Flyway se BL-004 for implementado antes desta feature | Baixo | Baixo | BL-001 está na posição 1 do backlog; se reordenar, renumerar migration |

## 10. Critério de pronto

- [ ] Flyway V6 aplicado sem erro no startup
- [ ] Job com falha de embedding aparece em `failed_jobs` com `tenant_id` e `error_message` corretos
- [ ] Upload de `.docx` resulta em chunks com texto legível (não XML) no pgvector
- [ ] Worker iniciado com `CHUNK_SIZE=500` usa chunks de 500 chars; sem variável, usa 1000
- [ ] (Should) `GET /api/admin/failed-jobs` retorna jobs do tenant correto
- [ ] (Should) `POST /api/documents/{id}/retry` re-publica job e muda status para `PROCESSING`
- [ ] `cargo build --release` no workspace `rust-services` sem erros ou warnings novos

## 11. Histórico de alterações

| Data | Alteração | Autor |
|------|-----------|-------|
| 2026-06-19 | Versão inicial gerada por `/reversa-plan` | reversa |
