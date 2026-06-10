# Data Delta: Embedding Service

> Identificador: `001-embedding-service`
> Data: `2026-06-02`

Este documento apresenta a análise de impacto no modelo de dados do projeto legado para a implantação do `embedding-service`.

## 1. Mapeamento do Modelo Legado

O banco de dados relacional e vetorial PostgreSQL (`rag_db`) já possui suporte nativo a vetores de alta dimensionalidade configurado na tabela `document_chunks`.

De acordo com o arquivo `java-core/src/main/resources/db/migration/V1__init_schema.sql` (ou `V2__reversa_target_schema.sql`), o esquema da tabela de chunks é:

```sql
CREATE TABLE document_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL,
    chunk_index INT NOT NULL,
    content TEXT NOT NULL,
    embedding VECTOR(768), -- Vetor de 768 dimensões para similaridade
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## 2. Análise de Mudanças (Delta)

* **Novas Tabelas:** Nenhuma.
* **Novas Colunas:** Nenhuma.
* **Campos Removidos:** Nenhum.
* **Alterações de Índices:** O índice HNSW existente na tabela (`idx_chunks_embedding`) é compatível e será mantido sem alterações.

## 3. Conclusão e Plano de Migração de Dados

Uma vez que o microsserviço de embeddings é **stateless** (recebe payloads HTTP textuais e devolve as dimensões flutuantes equivalentes), ele não interage diretamente com o banco de dados. Toda a persistência é orquestrada de forma externa pelo `ingestion-worker` ou pelo `rag-worker`.

Como consequência:
- **Mudanças no Banco:** **n/a** (Nenhuma mudança necessária).
- **Scripts de Migração (Flyway):** **n/a**.
- **Impacto em Dados Existentes:** Nenhum. Não há risco de quebra de compatibilidade com os vetores já salvos.
