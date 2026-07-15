# Dependências Principais (Scout)

> Gerado automaticamente por `reversa-scout`
> Data de geração: 2026-07-15

Este arquivo consolida as dependências essenciais do ecossistema poliglota do **Alfabra-Vector**.

## 1. Frontend (Node.js / Next.js)
_Local: `frontend/package.json`_

| Dependência | Versão | Propósito |
|-------------|--------|-----------|
| `next` | `^14.2.35` | Framework web React |
| `react` / `react-dom` | `^18` | Biblioteca de UI |
| `framer-motion` | `^12.41.0` | Animações de UI |
| `tailwindcss` | `^3.4.1` | Framework CSS utilitário |
| `react-markdown` | `^10.1.0` | Renderização rica (para LLM chat) |
| `lucide-react` | `^0.378.0` | Pacote de ícones |

## 2. Java Core (Spring Boot)
_Local: `java-core/build.gradle.kts`_

| Dependência | Versão / Tag | Propósito |
|-------------|--------------|-----------|
| `spring-boot-starter-web` | `4.1.0` | MVC e REST APIs |
| `spring-boot-starter-security` | `4.1.0` | Controle de acesso e Autenticação |
| `spring-boot-starter-data-jpa` | `4.1.0` | Mapeamento ORM/Banco de dados |
| `spring-boot-starter-amqp` | `4.1.0` | Integração RabbitMQ |
| `spring-boot-starter-flyway` | `4.1.0` | Migrações de Banco de Dados |
| `postgresql` | - | Driver JDBC PostgreSQL |
| `io.minio:minio` | `9.0.3` | SDK S3 para Armazenamento de Documentos |
| `cucumber-java` | `7.34.3` | Testes BDD |
| `testcontainers` | `1.20.4` | Containeres em tempo de teste |

## 3. Rust Services (Cargo Workspace)
_Local: `rust-services/Cargo.toml`_

| Dependência | Versão | Propósito |
|-------------|--------|-----------|
| `tokio` | `1.0` | Runtime Assíncrono |
| `reqwest` | `0.11` | Cliente HTTP Assíncrono (com rustls-tls) |
| `serde_json` | `1.0` | Serialização/Desserialização JSON |
| `gcp-auth` | `0.12` | Gerenciamento automático de tokens OAuth GCP |

## 4. Python Services (Crew-Worker)
_Local: `python-services/crew-worker/requirements.txt`_

| Dependência | Versão | Propósito |
|-------------|--------|-----------|
| `crewai` | `>=1.0.0` | Framework orquestrador de múltiplos agentes de IA |
| `litellm` | - | Interface padronizada para chamadas a diversos LLMs |
| `google-cloud-aiplatform`| `>=1.60.0` | SDK GCP (Vertex AI) |
| `pika` | `1.3.2` | Cliente para RabbitMQ (integração de filas) |
| `SQLAlchemy` | `2.0.29` | ORM em Python para Banco de Dados |
| `psycopg2-binary` | `2.9.9` | Driver PostgreSQL para Python |
| `pydantic` | `>=2.7.1` | Validação de tipagem forte e validação de schema |
