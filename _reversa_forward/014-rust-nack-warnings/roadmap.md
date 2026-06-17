# Roadmap: Solução de Warnings Rust (nack options)

> Identificador: `014-rust-nack-warnings`
> Data: `2026-06-17`
> Requirements: `_reversa_forward/014-rust-nack-warnings/requirements.md`
> Confidência: 🟢 CONFIRMADO, 🟡 INFERIDO, 🔴 LACUNA

## 1. Resumo da abordagem

A abordagem técnica consiste em substituir a instanciação da struct `BasicNackOptions` com `..Default::default()` por uma inicialização explícita de todos os seus campos (`requeue` e `multiple`), eliminando os warnings gerados pelo compilador Rust (ou clippy) e garantindo uma compilação limpa. A alteração será realizada nos arquivos `rust-services/rag-worker/src/rabbitmq.rs`, `rust-services/workflow-worker/src/rabbitmq.rs` e `rust-services/ingestion-worker/src/main.rs`. O comportamento de descartar mensagens com erro (`requeue: false`, `multiple: false`) continuará preservado.

## 2. Princípios aplicados

| Princípio | Como a feature se relaciona | Status |
|-----------|------------------------------|--------|
| Qualidade de compilação | Evita ruído nos logs de compilação e mantém o build limpo. | respeita |

## 3. Decisões técnicas

| ID | Decisão | Justificativa | Alternativas descartadas | Confidência |
|----|---------|----------------|--------------------------|-------------|
| D-01 | Inicialização explícita de `BasicNackOptions` | Elimina o warning de clippy/compilador e remove o uso desnecessário de struct update syntax (`..Default::default()`). | Usar `#[allow(clippy::needless_update)]` (apenas silenciaria o warning em vez de limpar o código), Usar `BasicNackOptions::default()` (menos explícito que declarar os campos). | 🟢 |
| D-02 | Aplicação nos três workers | Mantém a paridade e consistência técnica entre todos os workers em Rust (`rag-worker`, `workflow-worker`, `ingestion-worker`). | Corrigir apenas nos workers onde o compilador disparou os primeiros avisos. | 🟢 |

## 4. Premissas

| Premissa | Origem (`requirements.md` seção) | Risco se errada |
|----------|----------------------------------|-----------------|
| n/a | n/a | n/a |

## 5. Delta arquitetural

| Componente | Arquivo de origem no legado | Tipo de mudança | Resumo |
|------------|------------------------------|-----------------|--------|
| `rag-worker` | `_reversa_sdd/architecture.md#2.-tecnologias-empregadas` | regra-mantida | Ajuste na chamada do `nack` no RabbitMQ handler. |
| `workflow-worker` | `_reversa_sdd/architecture.md#2.-tecnologias-empregadas` | regra-mantida | Ajuste na chamada do `nack` no RabbitMQ handler. |
| `ingestion-worker` | `_reversa_sdd/architecture.md#2.-tecnologias-empregadas` | regra-mantida | Ajuste na chamada do `nack` no RabbitMQ handler. |

## 6. Delta no modelo de dados

- Resumo das mudanças: n/a (sem alterações no banco de dados ou caches)
- Detalhe completo em: `_reversa_forward/014-rust-nack-warnings/data-delta.md`

## 7. Delta de contratos externos

Não há alterações em contratos externos de APIs ou filas.

## 8. Plano de migração

n/a (sem alterações de dados ou de infraestrutura que necessitem migração)

## 9. Riscos e mitigações

| Risco | Impacto | Probabilidade | Mitigação |
|-------|---------|---------------|-----------|
| Incompatibilidade de assinatura na chamada do `nack` | médio | baixo | Validar a compilação local de cada módulo do `rust-services` afetado após aplicar as alterações. |

## 10. Critério de pronto

- [ ] Todas as ações do `actions.md` marcadas `[X]`
- [ ] Compilação do `rust-services` livre de warnings relacionados ao `BasicNackOptions`

## 11. Histórico de alterações

| Data | Alteração | Autor |
|------|-----------|-------|
| 2026-06-17 | Versão inicial gerada por `/reversa-plan` | reversa |
