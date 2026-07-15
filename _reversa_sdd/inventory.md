# Inventário do Sistema (Scout)

> Gerado automaticamente por `reversa-scout`
> Data de geração: 2026-07-15

## 1. Visão Geral da Arquitetura

O projeto **Alfabra-Vector** está organizado sob um modelo de monorepo poliglota e orientado a serviços, suportado por Docker Compose (`docker-compose.yml`) e infraestrutura dedicada.

Os componentes principais dividem-se logicamente e fisicamente em:
* **Frontend:** Aplicação em React baseada no Next.js (TypeScript).
* **Core:** Aplicação principal Spring Boot (Java) gerenciada com Gradle.
* **Workers Cognitivos/Python:** Serviços em Python construídos ao redor do framework CrewAI e LiteLLM.
* **Rust Services:** Ecossistema de alta performance (Cargo Workspace) operando pipelines de RAG, ingestão de dados, processamento de documentos e gestão de workflows.
* **Infraestrutura:** PostgreSQL com pgvector, MinIO (S3), Redis, RabbitMQ e Caddy (reverso Proxy).

## 2. Tecnologias Base

* **Frontend:** TypeScript, Next.js (14.2), React (18), TailwindCSS, Framer Motion.
* **Java Core:** Java 21, Spring Boot (4.1.0) com Actuator, Data JPA, Security, Amqp, Flyway. Testes baseados em Cucumber (BDD) e Testcontainers.
* **Python Services:** Python 3, CrewAI (>=1.0.0), SQLAlchemy, Pydantic, Pika.
* **Rust Services:** Rust, Tokio (1.0), Reqwest (0.11), gcp-auth (OAuth GCP).

## 3. Diretórios Top-Level

* `/frontend` - Interface web (Next.js)
* `/java-core` - API de coordenação (Spring Boot)
* `/python-services` - Workers de agentes de IA baseados em Python (`crew-worker`)
* `/rust-services` - Coleção de serviços Rust focados em dados, embeddings e pipelines pesados (`ingestion-worker`, `rag-worker`, `workflow-worker`, etc.)
* `/infrastructure` - Configurações de serviços de apoio (init do Postgres, Caddyfile, etc.)
* `/docs` - Documentação e diagramas
* `/.github/workflows` - Definições de CI/CD (GitHub Actions)

## 4. Entry Points Principais

* **Frontend:** Inicializado através de scripts no `package.json` (`next dev`, `next build`, `next start`) ou via `frontend/Dockerfile`.
* **Java Core:** Compilado e gerido por `java-core/build.gradle.kts`. Configuração de entrada via classes SpringApplication.
* **Rust:** Configurado através do workspace Cargo `rust-services/Cargo.toml` e seus sub-crates.
* **Python (Crew Worker):** Gerido pelo `python-services/crew-worker/requirements.txt` e scripts no src interno.
* **Orquestração:** O ambiente completo é provisionado via `docker-compose.yml` raiz que liga as redes de microsserviços.

## 5. Testes Identificados

* O ambiente Java utiliza massivamente BDD usando **Cucumber** com suporte a **Testcontainers** (PostgreSQL pgvector) focado em testes de integração (`@integration`). 
* O frontend utiliza o test runner nativo do Node.js (`node --test`) sobre arquivos compilados com `tsx`, verificando vários fluxos (como `smoke.test.js`, `agent-chat-upload`, painéis e HITL).
