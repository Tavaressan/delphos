# Data Delta: GCP Authentication Environment Configuration

> Identificador: `008-google-ai-auth`
> Data: `2026-06-09`

## 1. Banco de Dados e Esquema
Esta feature **não altera** o esquema do banco de dados relacional (PostgreSQL) nem o suporte vetorial (pgvector). Não há novas tabelas, colunas, índices HNSW ou restrições criadas.

## 2. Configurações de Ambiente (Delta do `.env`)

As alterações de configuração de dados residem no arquivo de variáveis de ambiente `.env` e `.env.example`.

### 2.1. Variáveis Removidas / Descontinuadas
- `VERTEX_AI_API_KEY`: Será descontinuada para uso do provider `real`, pois a autenticação passará a usar tokens OAuth2 dinâmicos gerados via conta de serviço.

### 2.2. Variáveis Novas / Alteradas
Abaixo está o diff das variáveis que devem ser declaradas no `.env` para suporte completo ao autenticador:

```diff
# Provedor do Google
- GOOGLE_APPLICATION_CREDENTIALS=4c4659fbc68153d3faf5a9c4f476bc9b5a348cc0
+ GOOGLE_APPLICATION_CREDENTIALS="/app/credentials/gcp-key.json"
GCP_PROJECT_ID=alfabra-platform
GCP_LOCATION=us-central1
```

*Nota:* No ambiente de desenvolvimento local, o valor de `GOOGLE_APPLICATION_CREDENTIALS` pode apontar para o caminho absoluto da máquina do desenvolvedor (ex: `"/Users/vitortavares/Desktop/Chaves/.gcp/alfabra-platform-4c4659fbc681.json"`). No ambiente dockerizado ou produção, a variável deve apontar para o caminho onde o volume monta o arquivo dentro do contêiner.

## 3. Mapeamento de Volumes no Docker Compose

Para que a chave do GCP esteja acessível no contêiner do `embedding-service`, o arquivo `docker-compose.yml` deve ser atualizado para montar a credencial como volume:

```yaml
  embedding-service:
    build:
      context: ./rust-services
      dockerfile: embedding-service/Dockerfile
    environment:
      - GOOGLE_APPLICATION_CREDENTIALS=/app/credentials/gcp-key.json
      - GCP_PROJECT_ID=${GCP_PROJECT_ID}
      - GCP_LOCATION=${GCP_LOCATION}
      - EMBEDDING_PROVIDER=${EMBEDDING_PROVIDER}
      - EMBEDDING_MODEL=${EMBEDDING_MODEL}
    volumes:
      # Monta o arquivo físico de chave JSON configurado no host para o container
      - ${GOOGLE_APPLICATION_CREDENTIALS}:/app/credentials/gcp-key.json
```
