# Investigation: Análise e Pesquisa de Integração do RAG Worker

> Identificador da feature: `003-rag-worker-rust`

Este documento resume a investigação técnica sobre a API do AnythingLLM e a arquitetura de comunicação assíncrona necessária para implementar o `rag-worker` em Rust.

## 1. Padrões de Integração com AnythingLLM API

De acordo com a especificação da API Developer do AnythingLLM, a interação de chat contextualizado (RAG) ocorre por meio do endpoint:

*   **URL:** `http://anythingllm:3001/api/v1/workspace/{slug}/chat`
*   **Método:** `POST`
*   **Headers:**
    ```http
    Authorization: Bearer <ANYTHINGLLM_API_KEY>
    Content-Type: application/json
    ```
*   **Request Payload:**
    ```json
    {
      "message": "pergunta do usuário",
      "mode": "query"
    }
    ```
    *Nota:* O modo `query` realiza busca vetorial + completação contextualizada no workspace. O modo `chat` mantém histórico de conversa. Como os workers Rust processam jobs independentes e o histórico de chats é mantido pelo `java-core`, o modo ideal é o `query` (stateless).

## 2. Abordagem de Multi-Tenancy

O isolamento de dados entre diferentes clientes corporativos (tenants) é um requisito essencial da Alfabra Vector. A decisão técnica estabelece que:
1. Cada `tenant_id` possui um workspace individual configurado no AnythingLLM.
2. O slug do workspace no AnythingLLM seguirá a nomenclatura padronizada `tenant-{tenant_id}`.
3. Se o workspace correspondente não existir no AnythingLLM na subida do tenant, o `java-core` ou o worker deve reportar erro de configuração.

## 3. Padrão de Inicialização de Conexões no Rust

O `ingestion-worker` legado estabelece um padrão resiliente de conexão com serviços de infraestrutura (PostgreSQL e RabbitMQ) que deve ser replicado no `rag-worker`:
- **Retry loop na subida:** Tentativa de conexão a cada 5 segundos por até 10 vezes para evitar falhas silenciosas na orquestração de containers do Docker Compose.
- **Isolamento de Threads:** Uso do runtime Tokio assíncrono para escutar a fila e efetuar as chamadas sem bloquear o processo principal do daemon.
