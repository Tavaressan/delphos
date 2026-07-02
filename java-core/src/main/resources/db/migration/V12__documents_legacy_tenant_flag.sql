-- Issue #85: V2__reversa_target_schema.sql adicionou tenant_id a `documents`
-- com DEFAULT UUID zero, e DocumentController fazia fallback silencioso para
-- esse mesmo UUID zero quando tenantId não era informado na requisição --
-- misturando documentos de tenants distintos em um "bucket" comum sem
-- autenticação/autorização por tenant.
--
-- Esta migração não apaga nem tenta adivinhar o tenant real dos registros
-- legados: apenas sinaliza explicitamente, via flag booleana, quais
-- documentos foram gravados sob o UUID zero antes do fix da issue #85.

ALTER TABLE documents ADD COLUMN legacy_unknown_tenant BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE documents SET legacy_unknown_tenant = TRUE
    WHERE tenant_id = '00000000-0000-0000-0000-000000000000';
