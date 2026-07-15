# Regression Watch: Validação e Preparação para Apresentação do POC

> Identificador: `005-poc-preparation`

Este documento lista as regras e asserções que devem continuar válidas em futuras extrações semânticas da plataforma para evitar regressão de comportamento.

## 1. Tabela de Regras e Asserções

| ID | Origem (arquivo, seção) | Regra esperada após mudança | Tipo de verificação | Sinal de violação |
|----|--------------------------|-----------------------------|----------------------|-------------------|
| W001 | `_reversa_forward/005-poc-preparation/interfaces/embeddings.md` | O `embedding-service` deve expor a rota REST `/embeddings` via POST na porta 8000. | presença | Ausência da rota no roteamento do Axum ou retorno diferente de 200 OK para requisições válidas. |
| W002 | `rust-services/ingestion-worker/src/main.rs` | O `ingestion-worker` deve realizar chamadas REST para o `embedding-service` para gerar embeddings. | presença | Ingestion worker voltando a gerar embeddings locais via mock ou bypassando a chamada de rede. |

## 2. Histórico de re-extrações

*(Esta seção será preenchida pelas execuções futuras do Reversa)*

## 3. Arquivadas

*(Esta seção está vazia)*

## 4. Observações

*(Esta seção está vazia)*

## Histórico de re-extrações

### Re-extração 2026-07-15 18:19

| ID | Veredito | Observação |
|----|----------|------------|
| W001 | 🟡 amarelo | avaliação em batch rápida; evidência de _reversa_sdd inferida | 
| W002 | 🟡 amarelo | avaliação em batch rápida; evidência de _reversa_sdd inferida | 

