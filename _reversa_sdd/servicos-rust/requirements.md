# Serviços Rust (RAG, Ingestion, Workflow, Embeddings)

## Visão Geral
Monorepo Rust com workers altamente performáticos voltados para tarefas intensivas de CPU e IO vetorial: extração de texto em larga escala, chunking, geração de embeddings, e busca semântica em banco vetorial (pgvector).

## Responsabilidades
- **ingestion-worker**: Fazer download de arquivos nativos (S3/MinIO), realizar parsing estruturado (PDF, DOCX), dividir texto em chunks com overlap, buscar embeddings (via API interna) e salvar tudo no `pgvector`.
- **rag-worker**: Receber consultas do CrewAI Worker, vetorizar a consulta, rodar similaridade Cosseno/HNSW no PostgreSQL, e emitir os chunks mais relevantes como contexto para a IA.
- **workflow-worker**: Motor de grafos diretos acíclicos (DAG) para automação determinística.
- **embedding-service**: API REST que padroniza o uso da Vertex AI (gemini-embedding-001) para gerar vetores de texto.

## Regras de Negócio
- Antes de ingerir um arquivo já existente, o worker atomicamente deleta (DELETE) todos os chunks antigos daquele arquivo na mesma transação. 🟢
- Isolamento estrito de tenant: toda busca vetorial (RAG) carrega condicionalmente o `tenant_id` na cláusula `WHERE` do SQL. 🟢
- Arquivos retidos em estado de processamento (`PROCESSING`) sofrem varredura de *Heartbeat Reaper*, que os re-enfileira ou marca como `FAILED` caso os limites de retentativa estourem. 🟢

## Requisitos Funcionais

| ID | Requisito | Prioridade | Critério de Aceite |
|----|-----------|-----------|-------------------|
| RF-01 | Ingestão de PDF | Must | Parsear texto via library nativa ignorando imagens. |
| RF-02 | Ingestão de DOCX | Must | Converter parágrafos para Markdown otimizado antes do chunking. |
| RF-03 | Busca HNSW | Must | Realizar select vetor `<=>` no pgvector ordenando por similaridade. |
| RF-04 | Heartbeat Reaper | Should | Loop independente deve limpar documentos presos após 15min. |

## Requisitos Não Funcionais

| Tipo | Requisito inferido | Evidência no código | Confiança |
|------|--------------------|---------------------|-----------|
| Performance | Compilação Antecipada em CI | ADR de Deno/Imagens GHCR (Issue #367) | 🟢 |
| Resiliência | API Mockável de Embeddings | Flags locais para evitar uso de cota do Google. | 🟢 |
| Tolerância a Falhas| DLQ RabbitMQ | Integração AMQP | 🟢 |

> Inferido a partir do código. Validar com equipe de operações.

## Critérios de Aceitação

```gherkin
Dado um arquivo longo
Quando submetido ao ingestion-worker
Então ele deve ser quebrado em blocos respeitando as variáveis CHUNK_SIZE e CHUNK_OVERLAP

Dado um search_query recebido pelo rag-worker
Quando processado
Então a consulta no Postgres deve usar o índice HNSW limitando a busca por tenant e retornando o TOP-K configurado
```

## Prioridade (MoSCoW)

| Requisito | MoSCoW | Justificativa |
|-----------|--------|---------------|
| `rag-worker` e `ingestion-worker` | Must | Sem isso, o sistema RAG para de funcionar, sendo a premissa base da plataforma. |
| `embedding-service` (Wrapper API) | Must | Centraliza fallbacks das chaves de IA (Google / Vertex). |
| `workflow-worker` (DAG) | Should | Feature adicionada tardiamente (#308) para automações de sistema, pode funcionar parcialmente sem ela se não houver grafos engatilhados. |

> Prioridade inferida por frequência de chamada e posição na cadeia de dependências.

## Rastreabilidade de Código

| Arquivo | Função / Classe | Cobertura |
|---------|-----------------|-----------|
| `rust-services/ingestion-worker/*` | Main worker loop | 🟢 |
| `rust-services/rag-worker/*` | Vector search | 🟢 |
| `rust-services/embedding-service/*` | Axum HTTP server | 🟢 |
