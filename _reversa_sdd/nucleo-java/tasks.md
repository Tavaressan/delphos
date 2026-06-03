# Núcleo Java, Tarefas de Implementação

## Pré-requisitos
- [ ] PostgreSQL com extensão pgvector instalada no ambiente de testes.
- [ ] Redis configurado e acessível.
- [ ] JDK 17 configurado.

---

## Tarefas

- [ ] **T-01: Setup do Projeto Spring Boot**
  - Origem no legado: `java-core/build.gradle.kts` / `Application.java`
  - Critério de pronto: Configurar dependências para Web, Security, Actuator, Flyway, Postgres e Redis. Rodar a classe principal com sucesso.
  - Confiança: 🟢 CONFIRMADO
  
- [ ] **T-02: Configuração de Variáveis de Banco e Redis**
  - Origem no legado: `java-core/src/main/resources/application.yml`
  - Critério de pronto: Configurar conexões com banco relacional, Flyway ativo (`baseline-on-migrate: true`), validação do JPA (`ddl-auto: validate`) e host/porta do Redis.
  - Confiança: 🟢 CONFIRMADO

- [ ] **T-03: Implementação de Tabelas e Seeds (Flyway)**
  - Origem no legado: `java-core/src/main/resources/db/migration/V1__init_schema.sql`
  - Critério de pronto: Criar script SQL que declare extensões, tabelas (users, roles, permissions, user_roles, role_permissions, documents, document_chunks, chats, chat_messages, audit_logs), índices convencionais, índice vetorial HNSW e insira as roles e permissões iniciais.
  - Confiança: 🟢 CONFIRMADO

---

## Tarefas de Teste

- [ ] **TT-01: Teste de Conexão e Migração de Banco**
  - Validar se ao rodar a aplicação, as migrations do Flyway executam sem erros e criam todas as tabelas e índices.
- [ ] **TT-02: Teste de Health Check**
  - Validar se os endpoints expostos pelo Actuator (`/actuator/health`, `/actuator/info`) retornam status `UP` (HTTP 200).
- [ ] **TT-03: Teste de Seed de Permissões**
  - Validar no banco se `ROLE_USER` e `ROLE_ADMIN` possuem as permissões corretas inseridas.
