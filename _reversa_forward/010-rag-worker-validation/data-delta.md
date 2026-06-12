# Data Delta: Validação e Testes E2E do RAG Worker Rust

Este documento descreve as necessidades de massa de dados e o esquema de vetores utilizado para a validação.

## 1. Schema das tabelas envolvidas

### Tabela `document_chunks`
* **Coluna `embedding`**: `vector(768)`
* **Massa de Testes**: Arquivos de teste na pasta `tests/fixtures/` devem ser ingeridos para criar pelo menos 1 documento válido com chunks gerados com dimensão de 768.

## 2. Índices de Similaridade
* Utiliza a extensão `pgvector`.
* As buscas semânticas realizam ordenação por similaridade cossena (`<=>`) para buscar os N chunks mais relevantes de contexto.
