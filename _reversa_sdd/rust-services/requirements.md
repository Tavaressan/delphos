# Rust Services

> Template do arquivo `requirements.md`. Foca no QUE a unit faz, não no como.

## Visão Geral
O `rust-services` contém workers assíncronos focados em altíssima performance para as requisições RAG (Retrieval-Augmented Generation), consumindo diretamente o `pgvector` do PostgreSQL por meio de conexões multiplexadas.

## Responsabilidades
- Ingerir e ler pedaços de documentos vetorizados.
- Buscar documentos no banco relacional via similaridade de cosseno (HNSW/IVFFlat).
- Proteger contra Injeção de Prompt ao retornar os chunks extraídos.
- Autenticar-se (via `gcp-auth`) no serviço da Vertex AI se houver delegação.

## Regras de Negócio
- [Isolamento RAG] A query de busca vetorial obrigatoriamente inclui restrição de `tenant_id` e filtragem por `agent_id` (se aplicável), evitando vazar contexto entre clientes. 🟢
- [Sanitização] Retornos do banco devem passar por escape estrito (`escape_chunk_content`) para evitar XML Injection no prompt de LLM de saída. 🟢

## Requisitos Funcionais

| ID | Requisito | Prioridade | Critério de Aceite |
|----|-----------|-----------|-------------------|
| RF-01 | Busca de Similaridade | Must | Um Job que cai na fila `agent.retrieval.delegated.jobs` aciona query SQL bruta no banco calculando Cosseno, e devolvendo os TOP 5 resultados. |
| RF-02 | Health Probe | Should | O crate levanta API HTTP na porta 8000 para Kubernetes liveness probe (`/healthz`). |

## Requisitos Não Funcionais

| Tipo | Requisito inferido | Evidência no código | Confiança |
|------|--------------------|---------------------|-----------|
| Performance | Assincronicidade sem bloqueios IO (Tokio runtime) | `main.rs` | 🟢 |
| Segurança | Omissão de ORM para lidar livremente com `::vector` raw e segurança de queries parametrizadas | `retrieval.rs:42` | 🟢 |

## Critérios de Aceitação

```gherkin
Dado um array de embeddings [0.01, 0.5, ...] gerado de uma pergunta
Quando o worker processa a busca
Então ele invoca `vector_search_query`
E retorna os Chunks mais próximos até o limite estabelecido
E despacha um evento formatado de volta ao RabbitMQ
```

## Prioridade (MoSCoW)
| Requisito | MoSCoW | Justificativa |
|-----------|--------|---------------|
| Algoritmo PG Vector e Conexões Multiplexadas | Must | Core de IA generativa no banco. |
| Tratamento contra Prompt Injection | Must | Essencial para LLM não enlouquecer com dados maliciosos guardados no vector store. |

## Rastreabilidade de Código

| Arquivo | Função / Classe | Cobertura |
|---------|-----------------|-----------|
| `rust-services/rag-worker/src/retrieval.rs` | Lógica Vetorial PG | 🟢 |
| `rust-services/rag-worker/src/main.rs` | Entrypoint Tokio / MQ | 🟢 |
