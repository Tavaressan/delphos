# Requirements: Solução de Warnings Rust (nack options)

> Identificador: `014-rust-nack-warnings`
> Data: `2026-06-17`
> Pasta da extração reversa: `_reversa_sdd/`
> Confidência: 🟢 CONFIRMADO, 🟡 INFERIDO, 🔴 LACUNA / DÚVIDA

## 1. Resumo executivo

Esta feature visa eliminar os warnings de compilação apontados pelo compilador Rust referentes à instanciação da struct `BasicNackOptions` ao chamar `delivery.nack(...)`. A alteração simplificará e explicitará os campos da struct nos microsserviços do monorepo, prevenindo problemas na compilação e mantendo o comportamento correto de não refileiramento (`requeue: false`) para mensagens com erro.

## 2. Contexto a partir do legado

Os warnings estão localizados nos microsserviços em Rust (`rust-services`), que consomem mensagens de filas do RabbitMQ de forma assíncrona.

| Fonte | Trecho relevante | Confidência |
|-------|------------------|-------------|
| `_reversa_sdd/code-analysis.md#2.3.-módulo:-rust-services` | Detalha o consumo assíncrono de tarefas de busca vetorial no `rag-worker`. | 🟢 CONFIRMADO |
| `_reversa_sdd/inventory.md#2.3.-rust-services-(rust-services/)` | Estrutura de diretórios e divisão de microsserviços em Rust (workers). | 🟢 CONFIRMADO |

## 3. Personas e cenários de uso

| Persona | Objetivo | Cenário-chave |
|---------|----------|---------------|
| **Desenvolvedor Rust** | Garantir uma compilação limpa, rápida e sem avisos de linter/compilador no pipeline de CI/CD e localmente. | Executa a compilação do projeto e não recebe avisos de compilação ou de clippy sobre instanciação incorreta de opções de nack. |

## 4. Regras de negócio novas ou alteradas

1. **RN-01: Descarte Seguro de Mensagens Inválidas (Sem Refileiramento):** O comportamento em caso de erro no processamento das tarefas dos workers Rust deve continuar sendo de descarte (ou DLX) (`requeue: false`), evitando loops infinitos de processamento (poison pills) no RabbitMQ. 🟢
   - Origem no legado: `rust-services/rag-worker/src/rabbitmq.rs`, `rust-services/workflow-worker/src/rabbitmq.rs` e `rust-services/ingestion-worker/src/main.rs`.
   - Tipo: mantida/confirmada.

## 5. Requisitos Funcionais

| ID | Requisito | Prioridade | Critério de aceite | Confidência |
|----|-----------|------------|--------------------|-------------|
| **RF-01** | **Correção do Warning de Instanciação do `BasicNackOptions`**: Explicitar os campos `multiple` e `requeue` na inicialização de `BasicNackOptions` nos arquivos afetados para eliminar o warning do compilador. | Must | Os warnings associados à linha `delivery.nack(BasicNackOptions {` devem ser eliminados na compilação. | 🟢 |
| **RF-02** | **Cobertura de todos os workers Rust**: Aplicar a mesma correção em todos os arquivos identificados que contêm o mesmo padrão. | Must | Alteração realizada em `rag-worker`, `workflow-worker` e `ingestion-worker`. | 🟢 |

## 6. Requisitos Não Funcionais

| Tipo | Requisito | Evidência ou justificativa | Confidência |
|------|-----------|----------------------------|-------------|
| **Qualidade / Compilação** | A compilação do projeto Rust (`rust-services`) deve rodar limpa, livre de warnings relacionados à instanciação de structs de opções da biblioteca de mensageria Lapin. | Reduz ruído de logs no pipeline de build e melhora a manutenibilidade do código. | 🟢 |

## 7. Critérios de Aceitação

```gherkin
Cenário: Compilação sem warnings nos workers Rust
  Dado que as modificações de instanciação do BasicNackOptions foram aplicadas
  Quando o desenvolvedor executar a verificação com o compilador rust
  Então a compilação deve ocorrer sem emitir warnings relacionados ao delivery.nack
```

## 8. Prioridade MoSCoW

| Item | MoSCoW | Justificativa |
|------|--------|---------------|
| RF-01 | Must | Essencial para atingir o objetivo principal da feature e limpar o processo de build. |
| RF-02 | Must | Garante consistência arquitetural por todo o projeto Rust de forma proativa. |
| Requisito de Qualidade | Should | Mantém a qualidade geral e a facilidade de leitura nos logs do monorepo. |

## 9. Esclarecimentos

### Sessão 2026-06-17

- **Q:** O escopo desta feature engloba a correção do warning nos três microsserviços em Rust (`rag-worker`, `workflow-worker` e `ingestion-worker`), visto que todos utilizam a mesma construção do `delivery.nack`?
- **R:** Sim, o escopo engloba os três microsserviços em Rust, garantindo que a compilação de todos os workers em `rust-services` seja limpa.

## 10. Lacunas

*Nenhuma lacuna ou dúvida pendente.*

## 11. Histórico de alterações

| Data | Alteração | Autor |
|------|-----------|-------|
| 2026-06-17 | Versão inicial gerada por `/reversa-requirements` | reversa |
| 2026-06-17 | Esclarecido escopo da feature (Sessão 2026-06-17) | reversa |
