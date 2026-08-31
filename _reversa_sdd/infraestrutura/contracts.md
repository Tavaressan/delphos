# Infraestrutura, Contratos e Integrações

Este documento foca nos Contratos Ambientais (Environment Variables e Portas de Rede) estabelecidos para o funcionamento da Infra.

## 1. Portas Internas de Serviço (Docker Compose)
- **3000**: Next.js Deno (Frontend Web).
- **8080**: Java Core Spring Boot (REST Gateway).
- **8000**: Rust Embedding Service (Internal TCP Only).
- **5432**: PostgreSQL (banco + pgvector).
- **5672**: RabbitMQ Data Port (AMQP 0-9-1).
- **15672**: RabbitMQ Management UI.
- **9000 / 9001**: MinIO (S3 API Mock local / Console).

## 2. Variáveis de Ambiente Mandatórias (Top-Level)
O CI/CD e o Compose injetam estritamente estas variáveis aos workers, constituindo um contrato de Runtime:

- `DATABASE_URL`: JDBC ou String de conexão PostgreSQL pro Java e Rust (`postgres://user:pass@host:5432/db`).
- `RABBITMQ_HOST` / `RABBITMQ_USER` / `RABBITMQ_PASS`: Credenciais pra engatar AMQP.
- `MINIO_URL` / `MINIO_ACCESS_KEY` / `MINIO_SECRET_KEY`: Variáveis S3 standard.
- `GOOGLE_AI_STUDIO_API_KEY`: Utilizada primariamente como Fallback ou Main API Key do LLM/Embedding para Google Studio (necessária em `servicos-rust` e `servicos-python`).
- `VERTEX_AI_API_KEY` / `GCP_PROJECT_ID`: Utilizada para Vertex AI pura no GCP.

## 3. Contratos de CI/CD (GitHub Secrets)
O Workflow Actions exige as variáveis acima mascaradas no Settings do repositório para orquestrar Deploy, além de:
- `AWS_OIDC_ROLE_ARN`: Identificação pra boot de runner remoto.
- `GHCR_PAT`: Token restrito ao GitHub Container Registry.
