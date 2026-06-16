# Inventário do Projeto — Alfabra-Vector

Este documento foi gerado automaticamente pelo **Scout** e contém o inventário completo da superfície do projeto.

---

## 1. Estrutura de Diretórios do Projeto

Abaixo está a representação da árvore de diretórios do projeto (excluindo pastas temporárias, dependências externas e build artifacts como `node_modules/`, `target/`, `.git/`, `.reversa/` e `_reversa_sdd/`):

```
.
├── docker-compose.override.yml
├── docker-compose.yml
├── package.json
├── package-lock.json
├── README.md
├── AGENTS.md
├── frontend/
│   ├── Dockerfile
│   ├── next.config.js
│   ├── package.json
│   ├── package-lock.json
│   ├── postcss.config.js
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   ├── public/
│   ├── src/
│   │   ├── app/ (auth, catalog, knowledge-base, design-system)
│   │   ├── components/ (ui, forms, layout, shared)
│   │   ├── domain/ (entities, use-cases, repositories, dto)
│   │   ├── features/ (chat, auth, admin, rag, users, documents)
│   │   ├── hooks/
│   │   ├── infrastructure/ (api, auth, storage, repositories, adapters)
│   │   ├── lib/
│   │   ├── providers/
│   │   └── styles/
│   └── tests/ (unit, layout, smoke, e2e)
├── java-core/
│   ├── build.gradle.kts
│   ├── Dockerfile
│   ├── gradlew
│   ├── settings.gradle.kts
│   └── src/
│       ├── main/
│       │   ├── java/com/company/core/ (Application.java, application, domain, infrastructure, interfaces, shared)
│       │   └── resources/ (application.yml, db/migration/)
│       └── test/
├── rust-services/
│   ├── Cargo.toml
│   ├── Cargo.lock
│   ├── Dockerfile
│   ├── document-processing/
│   ├── embedding-service/
│   ├── ingestion-worker/
│   ├── rag-worker/
│   ├── shared/
│   └── workflow-worker/
├── python-services/
│   └── crew-worker/
│       ├── Dockerfile
│       ├── requirements.txt
│       └── src/ (main.py, seed_rag.py, runtime, tools)
├── infrastructure/
│   ├── caddy/ (Dockerfile, Caddyfile)
│   ├── docker/
│   ├── kubernetes/
│   ├── postgres/ (init.sql)
│   └── setup_firewall.sh
├── scripts/
│   ├── dev.sh
│   ├── logs.sh
│   ├── reset.sh
│   ├── setup.sh
│   └── stop.sh
└── tests/
    └── e2e/ (runner.test.js, config.js)
```

---

## 2. Módulos e Componentes Identificados

### 2.1. Frontend (`frontend/`)
- **Tecnologia**: Next.js (React) com TypeScript.
- **Estilo**: TailwindCSS.
- **Função**: Interface com o usuário (chats, base de conhecimento, catálogo, painel administrativo, design system).
- **Testes**: Possui testes unitários, de layout, smoke e e2e estruturados na pasta `tests/`.

### 2.2. Java Core (`java-core/`)
- **Tecnologia**: Spring Boot 3.2.5 com Java 21 e Gradle.
- **Função**: API principal e orquestrador central de regras de negócio, persistência (JPA/Hibernate) e mensageria (RabbitMQ).
- **Banco de Dados**: Migrations gerenciadas via Flyway.

### 2.3. Rust Services (`rust-services/`)
- **Tecnologia**: Cargo Workspace com Rust stable.
- **Função**: Processamento de dados de alta performance e workers:
  - `embedding-service`: Geração de embeddings (integrado ao GCP Vertex AI).
  - `ingestion-worker`: Processa a fila de ingestão de documentos.
  - `rag-worker`: Gerencia operações de Retrieval-Augmented Generation conectadas ao Postgres (pgvector).
  - `workflow-worker`: Máquina de execução de workflows persistida e integrada ao RabbitMQ.
  - `document-processing`: Processamento preliminar de documentos.
  - `shared`: Biblioteca compartilhada de utilitários (ex: gcp).

### 2.4. Python Services (`python-services/`)
- **Tecnologia**: Python 3 com CrewAI.
- **Função**:
  - `crew-worker`: Orquestração de agentes de IA usando CrewAI e litellm para execução de tarefas complexas e baseadas em papel.

### 2.5. Infraestrutura (`infrastructure/`)
- **Gateway/LB**: Caddy Server (`infrastructure/caddy/`).
- **Orquestração local**: Docker Compose com Postgres + pgvector, Redis, MinIO, RabbitMQ.
- **Orquestração cloud**: Manifestos do Kubernetes.

---

## 3. Pontos de Entrada e Inicialização

- **Serviço HTTP Core**: [Application.java](file:///Users/vitortavares/Desktop/Alfabra-Vector/java-core/src/main/java/com/company/core/Application.java) (porta interna: `8080`).
- **Interface Web**: [layout.tsx](file:///Users/vitortavares/Desktop/Alfabra-Vector/frontend/src/app/layout.tsx) (porta interna: `3000`).
- **Load Balancer**: [Caddyfile](file:///Users/vitortavares/Desktop/Alfabra-Vector/infrastructure/caddy/Caddyfile) (portas expostas: `80`, `443`).
- **Workers assíncronos**:
  - Rust: `main.rs` em `rag-worker`, `ingestion-worker`, `workflow-worker`, etc.
  - Python: `main.py` em `crew-worker`.

---

## 4. Banco de Dados e Migrations

- **Banco Principal**: PostgreSQL com extensão `pgvector`.
- **Script de Iniciação**: [init.sql](file:///Users/vitortavares/Desktop/Alfabra-Vector/infrastructure/postgres/init.sql)
- **Migrations (Flyway)**: Localizadas em [db/migration/](file:///Users/vitortavares/Desktop/Alfabra-Vector/java-core/src/main/resources/db/migration/)
  - `V1__init_schema.sql`
  - `V2__reversa_target_schema.sql`
  - `V3__workflow_schema.sql`
  - `V4__seed_workflow_data.sql`
  - `V5__add_agents_and_rag_isolation.sql`

---

## 5. Cobertura e Estrutura de Testes

- **Testes Backend (Java)**: Cucumber para testes BDD/E2E em [src/test/java](file:///Users/vitortavares/Desktop/Alfabra-Vector/java-core/src/test/).
- **Testes Frontend (Node/TS)**: Testes de layout, smoke, unit e e2e em [frontend/tests/](file:///Users/vitortavares/Desktop/Alfabra-Vector/frontend/tests/).
- **Testes Globais**: Runner E2E em [tests/e2e/runner.test.js](file:///Users/vitortavares/Desktop/Alfabra-Vector/tests/e2e/runner.test.js).
