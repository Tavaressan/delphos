-- Issue #53: página de Perfil de Usuário precisa de campos adicionais no
-- backend para identidade (avatar, cargo/departamento), dados de acesso
-- (tenant) e atividade (último login).
--
-- Segue a mesma convenção de V10/V11 para tenant_id: registros existentes
-- recebem o UUID zero como marcador explícito de "tenant desconhecido".

ALTER TABLE users ADD COLUMN avatar_url VARCHAR(500);
ALTER TABLE users ADD COLUMN job_title VARCHAR(150);
ALTER TABLE users ADD COLUMN tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000';
ALTER TABLE users ADD COLUMN last_login TIMESTAMP WITH TIME ZONE;

CREATE INDEX idx_users_tenant_id ON users (tenant_id);
