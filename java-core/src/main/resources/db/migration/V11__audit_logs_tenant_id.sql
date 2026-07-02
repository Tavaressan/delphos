-- Issue #84: audit_logs não tinha tenant_id, permitindo que um admin de um
-- tenant recuperasse (teoricamente, se um endpoint de listagem existisse)
-- logs de auditoria de outro tenant.
--
-- Não há hoje uma coluna/relacionamento que amarre audit_logs a um tenant de
-- forma confiável (user_id aponta para users, que também não tem tenant_id).
-- Registros existentes são, portanto, legados sem tenant conhecido e recebem
-- o UUID zero como marcador explícito de "tenant desconhecido" -- não uma
-- tentativa de adivinhação. Novas gravações (a partir da aplicação desta
-- migração) passam a informar o tenant_id real do usuário autenticado.

ALTER TABLE audit_logs ADD COLUMN tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000';

CREATE INDEX idx_audit_logs_tenant_id ON audit_logs (tenant_id);
