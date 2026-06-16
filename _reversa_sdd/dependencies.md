# Dependências do Projeto — Alfabra-Vector

Este documento foi gerado automaticamente pelo **Scout** e detalha as dependências e versões críticas de cada módulo.

---

## 1. Java Core (`java-core/`)

- **Plataforma / Build**: Java 21, Gradle (Kotlin DSL).
- **Framework Principal**: Spring Boot `3.2.5`
- **Dependency Management**: `io.spring.dependency-management` `1.1.4`
- **Dependências de Produção**:
  - `spring-boot-starter-web`: Spring MVC REST APIs.
  - `spring-boot-starter-security`: Segurança e autenticação.
  - `spring-boot-starter-data-jpa`: Persistência JPA com Hibernate.
  - `spring-boot-starter-validation`: Validação baseada em anotações.
  - `spring-boot-starter-actuator`: Health checks e métricas operacionais.
  - `spring-boot-starter-data-redis`: Cache e armazenamento chave-valor.
  - `spring-boot-starter-amqp`: Comunicação orientada a mensagens com RabbitMQ.
  - `flyway-core`: Gerenciamento e migração de banco de dados SQL.
  - `minio` (`8.5.9`): Cliente SDK para armazenamento compatível com S3 (MinIO).
  - `postgresql` (runtimeOnly): Driver JDBC do PostgreSQL.
- **Dependências de Teste**:
  - `spring-boot-starter-test`: Utilitários gerais para testes Spring.
  - `spring-security-test`: Utilitários de teste para Spring Security.
  - `cucumber-java` (`7.18.0`): BDD (Behavior Driven Development) em Java.
  - `cucumber-spring` (`7.18.0`): Integração do Cucumber com contexto do Spring.
  - `cucumber-junit-platform-engine` (`7.18.0`): Runner do Cucumber na JUnit Platform.
  - `junit-platform-suite` (`1.10.2`): Execução de suítes de testes na JUnit Platform.

---

## 2. Frontend (`frontend/`)

- **Plataforma / Build**: Node.js 20+, npm.
- **Framework Principal**: Next.js `^14.2.35` (React `^18`, React DOM `^18`).
- **Dependências de Produção**:
  - `framer-motion` (`^11.1.7`): Animações na interface.
  - `lucide-react` (`^0.378.0`): Pacote de ícones.
  - `clsx` (`^2.1.1`): Utilitário para classes CSS condicionais.
  - `tailwind-merge` (`^2.3.0`): Mesclagem eficiente de classes Tailwind.
- **Dependências de Desenvolvimento**:
  - `typescript` (`^5`): TypeScript compiler.
  - `tailwindcss` (`^3.4.1`): Framework CSS utilitário.
  - `postcss` (`^8.5.15`), `autoprefixer` (`^10.5.0`): Processamento de CSS.
  - `eslint` (`^8.57.1`), `eslint-config-next` (`^14.2.35`): Linter de código.
  - `tsx` (`^4.22.4`): Execução direta de arquivos TS em Node.js.

---

## 3. Rust Services (`rust-services/`)

- **Plataforma / Build**: Cargo Workspace, Rust compiler (Stable).
- **Membros do Workspace**:
  - `shared` (biblioteca utilitária comum).
  - `document-processing` (ingestão e parsing de docs).
  - `embedding-service` (geração de vetores).
  - `ingestion-worker` (fila de ingestão).
  - `rag-worker` (Retrieval-Augmented Generation).
  - `workflow-worker` (orquestração de tarefas).
- **Dependências Globais (Workspace.dependencies)**:
  - `tokio` (`1.0`, features `full`): Runtime assíncrono para Rust.
  - `reqwest` (`0.11`, features `json`, `rustls-tls`): Cliente HTTP assíncrono.
  - `serde_json` (`1.0`): Serialização/deserialização JSON.
  - `gcp-auth` (crate `gcp_auth` `0.9`): Geração automática de tokens OAuth para GCP.

---

## 4. Python Services (`python-services/`)

- **Plataforma**: Python 3.10+.
- **Dependências de Produção (`requirements.txt`)**:
  - `crewai` (`>=1.0.0`): Framework de orquestração de agentes autônomos.
  - `litellm`: Tradução e padronização de APIs de LLMs.
  - `google-cloud-aiplatform` (`>=1.60.0`): SDK oficial da Vertex AI (GCP).
  - `pika` (`1.3.2`): Cliente AMQP para RabbitMQ.
  - `SQLAlchemy` (`2.0.29`): ORM e ferramenta SQL Toolkit.
  - `psycopg2-binary` (`2.9.9`): Driver PostgreSQL para Python.
  - `PyYAML` (`6.0.1`): Parser de configurações YAML.
  - `pydantic` (`>=2.7.1`): Validação de dados e parsing usando tipos Python.

---

## 5. Root Project (`/`)

- **Dependências de Produção (`package.json`)**:
  - `reversa` (`^1.2.43`): O framework de Engenharia Reversa.
  - `pg` (`^8.11.5`): Cliente PostgreSQL (usado pelos runners globais de teste).
