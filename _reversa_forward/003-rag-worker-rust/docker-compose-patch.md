# Docker Compose Patch: Padronização da Porta do AnythingLLM em 3001

Devido às restrições de escrita do framework Reversa (que opera em modo não destrutivo e não altera arquivos legados fora das pastas gerenciadas), as alterações de orquestração do Docker Compose devem ser aplicadas manualmente conforme as especificações abaixo:

## 1. Alteração no `docker-compose.yml`

No arquivo `docker-compose.yml` da raiz do projeto, altere a variável `PORT` do serviço `anythingllm` de `3000` para `3001`:

```diff
  anythingllm:
    image: mintplexlabs/anythingllm:latest
    container_name: rag_anythingllm
    environment:
      DATABASE_URL: postgresql://${POSTGRES_USER:-postgres}:${POSTGRES_PASSWORD:-postgres}@postgres:5432/${POSTGRES_DB:-rag_db}
-     PORT: 3000
+     PORT: 3001
      STORAGE_DIR: /app/server/storage
      DB_ENGINE: postgres
```

## 2. Alteração no `docker-compose.override.yml`

No arquivo `docker-compose.override.yml` da raiz do projeto, altere o mapeamento de portas expostas do serviço `anythingllm` de `3001:3000` para `3001:3001`:

```diff
  anythingllm:
    ports:
-     - "3001:3000" # Acesso local à interface administrativa do AnythingLLM
+     - "3001:3001" # Acesso local à interface administrativa do AnythingLLM
```
