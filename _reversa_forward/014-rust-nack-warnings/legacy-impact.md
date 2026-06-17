# Legacy Impact: Solução de Warnings Rust (nack options)

> Identificador: `014-rust-nack-warnings`
> Data: `2026-06-17`

Este documento detalha o impacto das alterações da feature sobre o código do sistema legado mapeado em `_reversa_sdd/`.

## 1. Tabela de Impacto

| Arquivo afetado | Componente | Tipo | Severidade | Justificativa |
|-----------------|------------|------|------------|---------------|
| `rust-services/rag-worker/src/rabbitmq.rs` | `rag-worker` | regra-mantida | LOW | Correção de warning de compilação na inicialização de `BasicNackOptions`. Sem alteração na regra de negócio. |
| `rust-services/workflow-worker/src/rabbitmq.rs` | `workflow-worker` | regra-mantida | LOW | Correção de warning de compilação na inicialização de `BasicNackOptions`. Sem alteração na regra de negócio. |
| `rust-services/ingestion-worker/src/main.rs` | `ingestion-worker` | regra-mantida | LOW | Correção de warning de compilação na inicialização de `BasicNackOptions`. Sem alteração na regra de negócio. |

## 2. Diff Conceitual por Componente

*   **rag-worker (`rust-services/rag-worker/src/rabbitmq.rs`)**:
    *   A instanciação da struct `BasicNackOptions` foi atualizada de `requeue: false, ..Default::default()` para declarar explicitamente todos os seus campos (`multiple: false, requeue: false`). Isso elimina os alertas de desuso de struct update syntax ou regras estritas de clippy. O comportamento operacional de rejeitar a mensagem sem reinseri-la na fila (`requeue: false`) foi mantido intacto.
*   **workflow-worker (`rust-services/workflow-worker/src/rabbitmq.rs`)**:
    *   Aplicação do mesmo padrão de declaração explícita em `BasicNackOptions` para descarte correto e seguro da mensagem sob falha sem gerar warnings do compilador.
*   **ingestion-worker (`rust-services/ingestion-worker/src/main.rs`)**:
    *   Garantida a paridade técnica e a limpeza total de avisos de compilação em todas as frentes de workers em Rust, explicitando os campos na chamada do `.nack()`.

## 3. Preservadas

As seguintes regras do `_reversa_sdd/domain.md` permanecem completamente preservadas e sem alterações:

*   **[DR01] Hierarquia de Papéis** 🟢
*   **[DR02] Isolamento de Conversas** 🟡
*   **[DR03] Dimensionalidade Parametrizável de Vetores** 🟢
*   **[DR04] Busca por Similaridade de Cosseno** 🟢
*   **[DR05] Heartbeat de Ingestão** 🟢 (o loop de heartbeat e o processamento de mensagens no `ingestion-worker` mantêm o mesmo comportamento).
*   **[DR06] Monitoramento de Microsserviços** 🟢
*   **[DR07] Restrição de Entrada no Firewall** 🟢
*   **[DR08] Isolamento de Portas de Banco de Dados** 🟢

## 4. Modificadas

Nenhuma regra de negócio original foi modificada ou removida.
