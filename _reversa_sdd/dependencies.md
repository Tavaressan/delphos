# Dependências do Projeto

Este documento detalha todas as dependências e versões identificadas em cada módulo do projeto **alfabra_vector**.

## 💻 Frontend (Next.js)

| Dependência | Versão | Tipo | Descrição / Uso |
|-------------|--------|------|-----------------|
| `next` | `14.2.3` | Produção | Framework web react principal |
| `react` | `^18` | Produção | Biblioteca de UI principal |
| `react-dom` | `^18` | Produção | Renderizador react para a Web |
| `lucide-react` | `^0.378.0` | Produção | Biblioteca de ícones vetoriais |
| `framer-motion` | `^11.1.7` | Produção | Biblioteca de animações dinâmicas |
| `clsx` | `^2.1.1` | Produção | Utilitário para classes CSS dinâmicas |
| `tailwind-merge` | `^2.3.0` | Produção | Fusão eficiente de classes Tailwind |
| `typescript` | `^5` | Desenvolvimento | Tipagem estática para JavaScript |
| `@types/node` | `^20` | Desenvolvimento | Definições de tipos do Node.js |
| `@types/react` | `^18` | Desenvolvimento | Definições de tipos do React |
| `@types/react-dom` | `^18` | Desenvolvimento | Definições de tipos do React DOM |
| `postcss` | `^8` | Desenvolvimento | Processador CSS |
| `tailwindcss` | `^3.4.1` | Desenvolvimento | Framework de estilização utilitária |
| `eslint` | `^8` | Desenvolvimento | Linter de código |
| `eslint-config-next` | `14.2.3` | Desenvolvimento | Configuração de lint padrão do Next.js |

## ☕ Java Core API (Spring Boot)

| Dependência | Versão | Tipo | Descrição / Uso |
|-------------|--------|------|-----------------|
| `org.springframework.boot` | `3.2.5` | Framework | Plataforma backend base |
| `spring-boot-starter-web` | *herdada* | Produção | Endpoints REST e servidor web Tomcat embutido |
| `spring-boot-starter-security` | *herdada* | Produção | Autenticação e segurança (JWT) |
| `spring-boot-starter-data-jpa` | *herdada* | Produção | Camada de persistência SQL (Hibernate) |
| `spring-boot-starter-validation` | *herdada* | Produção | Validação de DTOs e beans |
| `spring-boot-starter-actuator` | *herdada* | Produção | Endpoints de saúde e monitoramento |
| `spring-boot-starter-data-redis` | *herdada* | Produção | Cache e gestão de sessões via Redis |
| `org.flywaydb:flyway-core` | *herdada* | Produção | Migração e versionamento de banco de dados |
| `org.postgresql:postgresql` | *herdada* | Produção (runtime) | Driver do banco de dados PostgreSQL |
| `spring-boot-starter-test` | *herdada* | Teste | Framework de teste unitário e integrado |
| `spring-security-test` | *herdada* | Teste | Auxiliares de teste para Spring Security |

## ⚙️ Rust Services (Cargo Workspace)

### Módulo `document-processing`
| Dependência | Versão | Descrição |
|-------------|--------|-----------|
| `shared` | local | Módulo interno com estruturas compartilhadas |
| `tokio` | `1` (com "full") | Runtime assíncrono para Rust |
| `axum` | `0.7` | Framework web rápido para servidores assíncronos |

### Módulo `embedding-service`
| Dependência | Versão | Descrição |
|-------------|--------|-----------|
| `shared` | local | Módulo interno com estruturas compartilhadas |
| `tokio` | `1` (com "full") | Runtime assíncrono para Rust |
| `axum` | `0.7` | Framework web rápido para servidores assíncronos |

### Módulo `ingestion-worker`
| Dependência | Versão | Descrição |
|-------------|--------|-----------|
| `shared` | local | Módulo interno com estruturas compartilhadas |
| `tokio` | `1` (com "full") | Runtime assíncrono para Rust |

### Módulo `shared`
| Dependência | Versão | Descrição |
|-------------|--------|-----------|
| `serde` | `1.0` (com "derive") | Serialização/deserialização eficiente de dados |

---
*Gerado automaticamente pelo Scout durante a etapa de Reconhecimento.*
