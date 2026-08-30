# Arquitetura e Dívidas Técnicas

## Visão Geral
O sistema Alfabra-Vector adota uma arquitetura baseada em microsserviços (Event-Driven Architecture) e orquestração de Agentes IA (via CrewAI/LLMs).
A comunicação assíncrona é feita via **RabbitMQ** e o estado central é mantido num banco relacional **PostgreSQL** (com extensão `pgvector` para Embeddings RAG). Armazenamento de arquivos anexos/RAG é feito no **MinIO** (S3).

Os módulos principais são:
1. **Frontend**: Aplicação SPA feita em Next.js (rodando sob Deno runtime), que exibe as conversas e gerencia catálogos de agentes.
2. **Java Core**: Serviço Spring Boot (backend de controle), expondo APIs REST para o frontend, validando entidades, controlando permissões por tenant e enviando comandos de orquestração ao RabbitMQ.
3. **Rust Services**: Monorepo contendo vários workers de alta performance:
   - *ingestion-worker*: baixa documentos do Minio e os converte em texto.
   - *rag-worker*: realiza a busca semântica em HNSW no PostgreSQL.
   - *workflow-worker*: motor DAG para processos determinísticos.
   - *embedding-service*: API de predição de embeddings.
4. **Python Services**: Contém o *crew-worker*, responsável por rodar os agentes do CrewAI num contexto sandbox, mitigando problemas de recursão (Poison Pill) com reinício automático.

## Integrações Externas (🟢 CONFIRMADO)
- **Vertex AI / Google AI Studio**: Provedores de LLM para as etapas de geração de linguagem e extração de Embeddings RAG.
- **MinIO / AWS S3**: Sistema de File Storage para os documentos base de agentes.

## Dívidas Técnicas Encontradas (🟡 INFERIDO)
- **Latência em Sandboxing Python**: A utilização de subprocessos via CLI (`python3 -I`) e diretórios temporários para mitigar exploits em custom tools é segura, mas introduz *cold start* para cada Tool Call.
- **Complexidade do Stack Rust**: Há 4 workers diferentes divididos no monorepo Rust, potencialmente aumentando o *blast radius* no CI/CD se um job falhar.
- **Sincronia de Modelos DTO**: A mesma modelagem de Eventos do RabbitMQ (ex. `AgentExecutionStarted`) precisa estar sincronizada manualmente no Java Core, nos Rust Workers e no Python Worker, indicando falta de um repositório central de esquemas (ex. Protobuf ou AsyncAPI).
- **Restart de Worker Contencioso**: A solução atual para o `StackDepthExceededError` no CrewAI é encerrar abruptamente o container Python (os._exit), o que pode dropar/cancelar a execução sem um *graceful shutdown*.
