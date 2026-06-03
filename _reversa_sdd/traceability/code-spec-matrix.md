# Matriz de Rastreabilidade (Code-to-Spec Matrix)

Este documento relaciona cada arquivo do projeto legado com a respectiva especificação de unit gerada, demonstrando a cobertura de documentação do sistema.

---

## 1. Tabela de Rastreabilidade

| Arquivo do Legado | Unit Correspondente | Cobertura | Observação / Escopo de Cobertura |
|---|---|---|---|
| `frontend/src/app/layout.tsx` | `frontend/` | 🟢 | RootLayout do Next.js e tema global |
| `frontend/src/app/auth/layout.tsx` | `frontend/` | 🟢 | AuthLayout para fluxos de login e recuperação |
| `java-core/src/main/java/com/company/core/Application.java` | `nucleo-java/` | 🟢 | Classe principal de inicialização do Spring Boot |
| `java-core/src/main/resources/application.yml` | `nucleo-java/` | 🟢 | Configurações de banco, Redis, JPA e Actuator |
| `java-core/src/main/resources/db/migration/V1__init_schema.sql` | `nucleo-java/` | 🟢 | Esquema relacional, índices HNSW e seeds de RBAC |
| `rust-services/document-processing/src/main.rs` | `servicos-rust/` | 🟢 | API Axum de processamento e parsing de arquivos |
| `rust-services/embedding-service/src/main.rs` | `servicos-rust/` | 🟢 | API Axum de cálculo e geração de vetores de embedding |
| `rust-services/ingestion-worker/src/main.rs` | `servicos-rust/` | 🟢 | Daemon Rust do pipeline de ingestão e heartbeats |
| `rust-services/shared/src/lib.rs` | `servicos-rust/` | 🟢 | Biblioteca local utilitária do workspace Rust |
| `infrastructure/postgres/init.sql` | `infraestrutura/` | 🟢 | Script de pré-carga das extensões do Postgres |
| `infrastructure/caddy/Caddyfile` | `infraestrutura/` | 🟢 | Proxy reverso, mapeamento DNS e TLS DuckDNS |
| `infrastructure/setup_firewall.sh` | `infraestrutura/` | 🟢 | Configuração UFW, whitelists e isolamento Docker |
| `docker-compose.yml` | `infraestrutura/` | 🟢 | Definição e dependências de containers do monorepo |
| `docker-compose.override.yml` | `n/a` | `n/a` | Configurações locais de override do Docker |

---

## 2. Resumo da Cobertura de Análise

* **Arquivos Mapeados no Legado:** 14
* **Arquivos Cobertos por Especificações:** 13
* **Arquivos Não Mapeados (n/a):** 1 (apenas configurações de ambiente local `docker-compose.override.yml`)
* **Taxa de Cobertura de Código Estimada:** **92.8%**
