# Legacy Impact: Compartimentação e Integração do RAG Worker com AnythingLLM

> Identificador da feature: `003-rag-worker-rust`
> Data: `2026-06-03`

Este documento consolida os impactos gerados pela implementação do `rag-worker` sobre a infraestrutura e arquitetura legadas descritas em `_reversa_sdd/`.

## 1. Tabela de Arquivos Afetados

| Arquivo afetado | Componente | Tipo | Severidade | Justificativa |
|-----------------|------------|------|------------|---------------|
| `rust-services/rag-worker/Cargo.toml` | `rag-worker` | componente-novo | MEDIUM | Inclusão das dependências AMQP, HTTP e utilitárias para o novo worker. |
| `rust-services/rag-worker/src/*.rs` | `rag-worker` | componente-novo | MEDIUM | Código fonte do novo worker Rust integrado ao Cargo Workspace. |
| `docker-compose-patch.md` | `anythingllm` | delta-de-contrato-externo | LOW | Especificação de patch manual para alterar a porta interna de AnythingLLM de 3000 para 3001. |

## 2. Diff Conceitual por Componente

*   **`rag-worker` (Rust):** O worker Rust foi ativado e estruturado sob um modelo limpo de submódulos (config, rabbitmq, anythingllm, errors), abandonando o stub inicial e passando a escutar eventos do RabbitMQ e interagir via HTTP REST com AnythingLLM.
*   **`anythingllm`:** A infraestrutura de orquestração RAG foi padronizada na porta 3001 interna/externa (mapeamento "3001:3001"), resolvendo o desalinhamento que existia em relação ao teste de healthcheck original do compose.

## 3. Regras Preservadas

As seguintes regras originais documentadas em `_reversa_sdd/domain.md` permanecem intactas e inalteradas:
*   **`[DR03]` (Dimensionalidade Parametrizável de Vetores):** Mantida, visto que o AnythingLLM gerencia os embeddings e a dimensionalidade de forma independente e compatível.
*   **`[DR04]` (Busca por Similaridade de Cosseno):** Mantida (executada pelo AnythingLLM internamente).
*   **`[DR05]` (Heartbeat de Ingestão):** Mantida (específico do ingestion-worker).
*   **`[DR07]` (Restrição de Entrada no Firewall):** Mantida.
*   **`[DR08]` (Isolamento de Portas de Banco de Dados):** Mantida.

## 4. Regras Modificadas ou Estendidas

*   **`[DR06]` (Monitoramento de Microsserviços):** Estendida. O `rag-worker` foi implementado para expor um endpoint `/healthz` HTTP GET na porta 8000 para atender a essa diretriz de conformidade da plataforma.
*   **`RN-01` (Orquestração de RAG Delegada):** Nova regra/Modificação. O `rag-worker` delega 100% da orquestração e busca semântica para o AnythingLLM via API REST.
*   **`RN-02` (Isolamento por Workspace):** Nova regra. Cada tenantID mapeia-se para um workspace correspondente (`tenant-{tenant_id}`) no AnythingLLM.
*   **`RN-03` (Transição de Estados):** Nova regra. Geração e envio de eventos `RetrievalStarted` e `RetrievalCompleted` no barramento RabbitMQ.
*   **`RN-04` (Padronização de Porta):** Nova regra. A porta interna e externa do AnythingLLM está unificada na 3001.
