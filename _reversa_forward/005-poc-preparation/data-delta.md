# Data Delta: Modelo de Dados do POC

> Identificador: `005-poc-preparation`
> Data: `2026-06-05`
> Documento principal: `_reversa_forward/005-poc-preparation/roadmap.md`

Este documento consolida as análises sobre o modelo de dados para a feature de preparação do POC.

## 1. Mapeamento de Esquema do Legado

O banco de dados relacional e vetorial PostgreSQL já foi provisionado com suporte a pgvector pelo Flyway. A tabela afetada é `document_chunks`, cujos vetores semanticamente computados são indexados via índice HNSW:

```sql
CREATE TABLE document_chunks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL,
    chunk_index INT NOT NULL,
    content TEXT NOT NULL,
    embedding vector(768) NOT NULL, -- Tamanho de vetor definido em Flyway
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

## 2. Delta de Dados

Não há novas tabelas ou colunas a serem adicionadas para a feature `005-poc-preparation`. 

- **Novas tabelas:** nenhuma (n/a)
- **Novas colunas:** nenhuma (n/a)
- **Alterações de tipo:** nenhuma (n/a)

O delta reside inteiramente na **origem dos dados inseridos** na coluna `embedding`, que passa de um vetor aleatório gerado deterministicamente por hash local (mock) para um vetor de 768 floats reais computados pela API da Vertex AI.
