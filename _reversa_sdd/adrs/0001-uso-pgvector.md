# ADR 0001 - Uso do pgvector para Banco de Dados Relacional e Vetorial Unificado

## Status
🟢 CONFIRMADO (Extraído da estrutura de migração inicial `V1__init_schema.sql`)

## Contexto
A plataforma RAG corporativa precisa salvar metadados estruturados altamente relacionados (como usuários, permissões, logs de auditoria e chats de conversa) junto com dados vetoriais de alta dimensão (vetores de embeddings de dimensionalidade parametrizável gerados para trechos de documentos). As consultas no RAG exigem o cruzamento frequente de metadados relacionais (filtragem por permissão do usuário, status do documento, autor do chat) com busca por similaridade aproximada de vetores.

## Decisão
Utilizar o PostgreSQL estendido com a extensão `pgvector` como banco de dados único e central do sistema, em vez de adotar um banco de dados vetorial dedicado (ex: Pinecone, Milvus, Qdrant) em paralelo com um banco relacional.

## Justificativa
1. **Simplicidade de Operação:** Reduz o overhead operacional de implantar, gerenciar, monitorar e fazer backup de dois sistemas de banco de dados diferentes.
2. **Consistência de Dados Transacionais (ACID):** Garante integridade transacional completa. Não há necessidade de construir pipelines complexos para sincronizar metadados do banco relacional com chaves no banco vetorial externo.
3. **Busca Híbrida em Query Única:** Permite escrever queries SQL padrão que filtram metadados relacionais (ex: verificar se o usuário tem permissão `READ_DOCUMENTS` no documento correspondente ao chunk) e calculam a similaridade de cosseno vetorial no mesmo plano de execução.
4. **Desempenho com Índices HNSW:** O uso de índices HNSW (Hierarchical Navigable Small World) implementados pela extensão `pgvector` fornece buscas por similaridade rápida e escalável para cenários corporativos típicos.
