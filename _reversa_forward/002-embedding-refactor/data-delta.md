# Data Delta: Refatoração do Embedding Service

> Identificador: `002-embedding-refactor`
> Data: `2026-06-02`

## 1. Delta do Modelo de Dados

Esta feature é puramente estrutural e arquitetural no nível de código da aplicação. Não há qualquer alteração no modelo de dados físico ou lógico da plataforma.

- **Novas tabelas:** Nenhuma
- **Novas colunas:** Nenhuma
- **Colunas removidas / alteradas:** Nenhuma
- **Novos índices:** Nenhum

As definições mapeadas em `_reversa_sdd/data-dictionary.md` e `_reversa_sdd/erd-complete.md` permanecem 100% inalteradas e válidas.

## 2. Migrações de Banco de Dados

Não há necessidade de migrações SQL (Flyway ou scripts manuais) ou qualquer tipo de DDL/DML.

## 3. Estado Físico e Ciclo de Vida

O ciclo de estados de documentos (`UPLOADING`, `PROCESSING`, `INDEXED`, `FAILED`) gerenciado pelo `ingestion-worker` e persistido na coluna `status` da tabela `documents` permanece inalterado.

A comunicação interna entre o `ingestion-worker` e o `embedding-service` na porta `8000` via chamadas HTTP REST continuará a respeitar os mesmos contratos de dados definidos em `_reversa_sdd/domain.md#[DR03]` e `_reversa_sdd/domain.md#[DR04]`.
