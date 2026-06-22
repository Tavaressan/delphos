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