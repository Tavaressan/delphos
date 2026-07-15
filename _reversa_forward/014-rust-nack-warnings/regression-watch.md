# Regression Watch: Solução de Warnings Rust (nack options)

> Identificador da feature: `014-rust-nack-warnings`

## 1. Tabela de Regression Watch

| ID | Origem (arquivo, seção) | Regra esperada após mudança | Tipo de verificação | Sinal de violação |
|----|-------------------------|-----------------------------|---------------------|-------------------|
| W001 | `_reversa_sdd/code-analysis.md#2.3.-módulo:-rust-services` | O comportamento de rejeitar mensagens com falha nos workers em Rust (`rag-worker`, `workflow-worker`, `ingestion-worker`) deve utilizar `requeue: false` em `BasicNackOptions`. | presença | Alterações futuras que reintroduzam `requeue: true` gerando possíveis loops de reprocessamento infinito (poison pills). |

---

## 2. Histórico de re-extrações

*Nenhuma re-extração registrada ainda.*

---

## 3. Arquivadas

*Nenhuma regra arquivada.*

---

## 4. Observações

*   Esta feature apenas simplificou e limpou a compilação do monorepo Rust, explicitando os parâmetros na inicialização da struct `BasicNackOptions`. Não foram introduzidas novas regras de persistência ou modificações em regras funcionais do legado.

### Re-extração 2026-07-15 11:00

| ID | Veredito | Observação |
|----|----------|------------|
|  W001  | 🟢 verde | preservado |
