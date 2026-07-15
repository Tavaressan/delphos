# Rust Services, Design Técnico

> Template do arquivo `design.md`. Foca no COMO a unit é construída, com base no código legado lido.

## Interface

A interface principal não é HTTP REST, mas Consumo de RabbitMQ:

| Símbolo | Assinatura | Retorno | Observação |
|---------|-----------|---------|------------|
| `process_delegated_job` | `(msg: Delivery, pool: PgPool)` | `Result<()>` | Processa request de embedding/busca. |
| `vector_search_query` | `(has_agent: bool)` | `&'static str` | Monta SQL cru para ser parseado pelo sqlx. |
| `escape_chunk_content` | `(content: &str)` | `String` | Sanitização em memória. |

API Auxiliar (Liveness):
GET `/healthz` -> 200 OK

## Fluxo Principal (Busca Vetorial RAG)
1. Job de retrieval cai na fila Rabbit.
2. Worker rust desempacota o payload, obtém o texto/vetor e o TenantId.
3. Invoca a query via `sqlx::query` usando binding nativo no Postgres (`1 - (dc.embedding <=> $1::vector) as similarity`).
4. Result sets são desserializados em Structs Rust tipadas e validadas (com tratativa robusta de nulos).
5. Passam por `escape_chunk_content`.
6. Publica evento `agent.retrieval.delegated.finished` contendo a array serializada final de Contextos RAG.

## Fluxos Alternativos
- **[Conexão Postgres Perdida]:** Driver Rust (`sqlx`) usa pooling. Se o connection pool exaurir ou falhar, propaga o erro e recusa ACK da mensagem temporariamente.

## Dependências
- [RabbitMQ], [Consume jobs e envia results]
- [PostgreSQL pgvector], [Uso nativo da extensão de indexação HNSW do PG 15+]
- [GCP Vertex AI], [Módulo `gcp-auth` incluso para usar service account se necessitar gerar o embedding antes da busca]

## Decisões de Design Identificadas

| Decisão | Evidência no código | Confiança |
|---------|---------------------|-----------|
| Rust / sqlx em vez de Java Hibernate para Vector | `retrieval.rs` usa SQL string bruta e ponteiros otimizados | 🟢 |
| Pre-fetch QoS 1 | Impede o consumer Rust de "roubar" jobs que não vai processar de imediato | 🟡 |

## Estado Interno
Crate 100% Stateless. Depende estritamente do DB para persistência e não mantem cache de contexto em memória longa.

## Riscos e Lacunas
- 🟡 Qual a tolerância a falhas na biblioteca `gcp-auth` durante renovação de token OAUTH2 no meio de uma enxurrada de mensagens?
