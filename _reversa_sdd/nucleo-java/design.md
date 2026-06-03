# Núcleo Java, Design Técnico

## Interface

### Estrutura de Tabelas (PostgreSQL)

| Tabela | Chave Primária | Relacionamentos Críticos | Descrição |
|---|---|---|---|
| `users` | `id` (UUID) | N:M com `roles` via `user_roles` | Contém dados de autenticação e status do operador. |
| `documents` | `id` (UUID) | 1:N com `document_chunks`, N:1 com `users` | Metadados de arquivos carregados. |
| `document_chunks`| `id` (UUID) | N:1 com `documents` | Armazena trechos textuais e o vetor `vector` (dimensão parametrizável). |
| `chats` | `id` (UUID) | N:1 com `users`, 1:N com `chat_messages` | Sessões de chat do usuário. |
| `audit_logs` | `id` (UUID) | N:1 com `users` (opcional) | Logs detalhados em JSONB. |

---

## Fluxo Principal

### 1. Inicialização do Backend e Migrações
1. O Spring Boot inicializa e carrega o arquivo `application.yml`.
2. O Flyway é disparado, lendo os scripts de migração em `db/migration/`.
3. Executa `V1__init_schema.sql`, habilitando as extensões `vector` e `uuid-ossp`, criando as tabelas, índices padrão, índice vetorial HNSW e seeds de papéis (`ROLE_ADMIN`, `ROLE_USER`) e permissões (`READ_DOCUMENTS`, `WRITE_DOCUMENTS`, etc.).
4. O Spring Security valida as sessões/conexões usando o Redis como suporte a cache.

---

## Dependências
* **Spring Security / RBAC:** Filtra e garante restrição de acessos.
* **Flyway Core:** Gerencia migrations em banco Postgres.
* **pgvector Extension:** Adiciona suporte a armazenamento e pesquisa de vetores no Postgres.
* **Redis Client:** Fornece conexões e cache temporário.

---

## Decisões de Design Identificadas

| Decisão | Evidência no código | Confiança |
|---------|---------------------|-----------|
| Hibernate `ddl-auto: validate` | `java-core/src/main/resources/application.yml:15` | 🟢 CONFIRMADO |
| HNSW Index para cosseno | `V1__init_schema.sql:114` | 🟢 CONFIRMADO |
| Spring Boot Actuator | `java-core/src/main/resources/application.yml:35-39` | 🟢 CONFIRMADO |
| UUID como PK padrão | `V1__init_schema.sql` (uso de `DEFAULT gen_random_uuid()`) | 🟢 CONFIRMADO |
| Autenticação Stateless (JWT) | Decisão arquitetural homologada | 🟢 CONFIRMADO (Confirmado pelo usuário) |

---

## Configuração de Segurança (Security Configuration)

A autenticação é stateless baseada em tokens JWT assinados simetricamente (HS256):

* **Autenticação:** Spring Security + OAuth2 Resource Server + JWT Stateless
* **Componentes:** `AuthenticationManager` para login, `JwtEncoder`/`JwtDecoder` para geração/validação, filtro de segurança baseado em Bearer Token e sem sessões HTTP (`SessionCreationPolicy.STATELESS`).
* **Parâmetros e Variáveis de Ambiente:**
  * `JWT_SECRET`: Chave secreta de no mínimo 256 bits codificada em Base64.
  * `JWT_EXPIRATION`: Tempo de expiração do Access Token (sugerido: `3600000`ms / 1 hora).
  * `JWT_REFRESH_EXPIRATION`: Tempo de expiração do Refresh Token (sugerido: `604800000`ms / 7 dias).
* **Evolução Arquitetural:** Inicialmente HS256 com variáveis de ambiente. Em caso de expansão de microserviços/consumidores externos, planeja-se migrar para **RS256** com par de chaves pública/privada integrada a um KMS (Vault).

---

## Riscos e Lacunas
*(Nenhuma lacuna crítica pendente neste módulo)*
