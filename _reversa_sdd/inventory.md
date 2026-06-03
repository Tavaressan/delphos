# Inventário do Projeto - alfabra_vector

Este documento apresenta o inventário completo da superfície do repositório **alfabra_vector**, incluindo a árvore de arquivos, pontos de entrada principais, configurações, dockerização e recursos identificados pelo **Scout**.

## 📁 Estrutura de Diretórios Mapeada

Abaixo está a estrutura simplificada do monorepo, excluindo diretórios de build, pacotes externos e arquivos de controle de versão (`.git`, `node_modules`, etc.):

```
.
├── anythingllm
│   └── README.md
├── docker-compose.override.yml
├── docker-compose.yml
├── docs
│   └── architecture
│       ├── README.md
│       ├── workspace.dsl
│       └── workspace.json
├── frontend
│   ├── Dockerfile
│   ├── README.md
│   ├── package.json
│   ├── src
│   │   ├── README.md
│   │   ├── app
│   │   │   ├── auth
│   │   │   │   └── layout.tsx
│   │   │   └── layout.tsx
│   │   ├── components
│   │   ├── domain
│   │   ├── features
│   │   │   ├── auth
│   │   │   ├── chat
│   │   │   ├── documents
│   │   │   ├── rag
│   │   │   └── users
│   │   ├── hooks
│   │   ├── infrastructure
│   │   ├── lib
│   │   ├── providers
│   │   ├── styles
│   │   ├── types
│   │   └── utils
│   └── tests
├── infrastructure
│   ├── README.md
│   ├── caddy
│   │   ├── Caddyfile
│   │   └── Dockerfile
│   ├── postgres
│   │   └── init.sql
│   └── setup_firewall.sh
├── java-core
│   ├── Dockerfile
│   ├── README.md
│   ├── build.gradle.kts
│   ├── settings.gradle.kts
│   └── src
│       ├── main
│       │   ├── java
│       │   │   └── com
│       │   │       └── company
│       │   │           └── core
│       │   │               ├── Application.java
│       │   │               ├── application
│       │   │               ├── domain
│       │   │               │   ├── entities
│       │   │               │   └── repositories
│       │   │               ├── infrastructure
│       │   │               │   ├── config
│       │   │               │   ├── external
│       │   │               │   └── persistence
│       │   │               ├── interfaces
│       │   │               │   ├── dto
│       │   │               │   └── rest
│       │   │               └── shared
│       │   └── resources
│       └── test
├── package-lock.json
├── package.json
├── rust-services
│   ├── Cargo.lock
│   ├── Cargo.toml
│   ├── Dockerfile
│   ├── document-processing
│   │   ├── Cargo.toml
│   │   ├── Dockerfile
│   │   └── src
│   │       └── main.rs
│   ├── embedding-service
│   │   ├── Cargo.toml
│   │   ├── Dockerfile
│   │   └── src
│   │       └── main.rs
│   ├── ingestion-worker
│   │   ├── Cargo.toml
│   │   ├── Dockerfile
│   │   └── src
│   │       └── main.rs
│   └── shared
│       ├── Cargo.toml
│       └── src
│           └── lib.rs
└── scripts
    ├── dev.sh
    ├── logs.sh
    ├── reset.sh
    ├── setup.sh
    └── stop.sh
```

## 🎯 Pontos de Entrada da Aplicação

1. **Frontend (Next.js)**:
   - `frontend/src/app/layout.tsx` (Ponto de entrada do Layout principal da aplicação)
2. **Java Core API (Spring Boot)**:
   - `java-core/src/main/java/com/company/core/Application.java` (Classe principal que inicializa o Spring Boot)
3. **Serviços em Rust**:
   - `rust-services/document-processing/src/main.rs` (Início do serviço de processamento de documentos - Axum)
   - `rust-services/embedding-service/src/main.rs` (Início do serviço de embeddings - Axum)
   - `rust-services/ingestion-worker/src/main.rs` (Início do daemon worker de ingestão - Tokio runtime loop)

## ⚙️ Configurações e DevOps

- **Variáveis de Ambiente**: `.env.example` descrevendo as variáveis do PostgreSQL, JWT, MinIO, Caddy e DuckDNS.
- **Orquestração Docker**: `docker-compose.yml` e `docker-compose.override.yml` com orquestração completa dos contêineres:
  - `postgres` (pgvector)
  - `redis` (cache)
  - `minio` (armazenamento de arquivos)
  - `anythingllm` (motor RAG de MVP)
  - `core` (Spring Boot Java)
  - `structurizr` (ferramenta de C4 Model)
  - `document-processing` (Rust)
  - `embedding-service` (Rust)
  - `ingestion-worker` (Rust)
  - `frontend` (Next.js)
  - `caddy` (Proxy Reverso HTTPS)
- **Caddyfile**: Configurado em `infrastructure/caddy/Caddyfile` para redirecionamento SSL/HTTPS com Let's Encrypt.
- **Scripts Utilitários**:
  - `scripts/setup.sh` (Configura e inicializa o ambiente inicial)
  - `scripts/dev.sh` (Sobe o Docker Compose local)
  - `scripts/stop.sh` (Para a execução do projeto)
  - `scripts/reset.sh` (Reinicializa bancos e volumes)
  - `scripts/logs.sh` (Exibe logs de execução)
  - `infrastructure/setup_firewall.sh` (Configurações de segurança no host local)

## 🗄️ Dicas de Banco de Dados

- **Inicialização**: `infrastructure/postgres/init.sql` carrega as extensões `vector` (pgvector) e `uuid-ossp`.
- **Versionamento**: O Spring Boot utiliza `flyway-core` para migrações futuras, embora a pasta de migrations esteja atualmente vazia ou sob orquestração de banco interna.

## 🧪 Cobertura de Testes

- **Frontend**: O módulo `frontend/tests` foi identificado, contudo, sem frameworks específicos (como Jest ou Playwright) instalados formalmente nas dependências do `package.json`.
- **Java Core**: JUnit Platform está ativado no `build.gradle.kts` através de `tasks.withType<Test> { useJUnitPlatform() }`. Nenhuma suite de testes implementada.
- **Rust Services**: Sem suites de testes implementadas nos módulos rust.

---
*Gerado automaticamente pelo Scout durante a etapa de Reconhecimento.*
