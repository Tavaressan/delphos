# Data Delta: Modelo de Dados do Runner de Testes E2E

> Identificador: `006-e2e-tests-rag-llm`
> Data: `2026-06-05`
> Documento principal: `_reversa_forward/006-e2e-tests-rag-llm/roadmap.md`

Este documento detalha o impacto de dados e migrações para a feature de testes E2E e validação dos scripts locais.

## 1. Mapeamento de Esquema do Legado

A suíte de testes E2E consumirá as tabelas existentes do banco de dados relacional e vetorial PostgreSQL (`rag_db`), modeladas em `java-core/src/main/resources/db/migration/V1__init_schema.sql`:
- `users`: para validação de credenciais administrativas de teste.
- `documents`: para inserção, verificação de status (`UPLOADING`, `PROCESSING`, `INDEXED`, `FAILED`) e exclusão de documentos de teste.
- `document_chunks`: para validação do cálculo e persistência dos trechos indexados e dos vetores gerados pelo provedor de embedding.
- `chats` e `chat_messages`: para validação de fluxos de conversação simulados via RAG.

## 2. Delta de Dados

Não há novas tabelas ou colunas a serem adicionadas para a feature `006-e2e-tests-rag-llm`. A alteração do banco reside exclusivamente no ciclo de vida de **dados voláteis (temporários)** de teste.

- **Novas tabelas:** nenhuma (n/a)
- **Novas colunas:** nenhuma (n/a)
- **Alterações de tipo:** nenhuma (n/a)
- **Novos índices:** nenhuma (n/a)

## 3. Gestão e Limpeza de Dados de Teste

Para assegurar que o banco de dados não sofra com poluição de registros órfãos ou inconsistências entre execuções de teste, o runner utilizará as seguintes diretivas:
1. **Identificadores UUID estáticos ou controlados:** Todos os registros criados (documentos, chats) possuirão UUIDs gerados dinamicamente no script de teste e registrados em variáveis na memória para exclusão garantida no bloco de teardown (`after`).
2. **Teardown robusto:**
   - Será executado um comando `DELETE FROM documents WHERE name = 'documento_teste_e2e_006.pdf'` (ou baseado no UUID gerado).
   - Como a tabela `document_chunks` está configurada com exclusão em cascata (`ON DELETE CASCADE` na chave estrangeira `document_id`), a remoção do documento de teste eliminará de forma limpa e automática todos os seus chunks associados.
   - De igual modo, as tabelas `chat_messages` contêm cascade para `chats`, simplificando a limpeza de sessões de chat de teste.
