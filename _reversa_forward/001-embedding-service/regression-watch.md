# Regression Watch: Embedding Service

> Identificador: `001-embedding-service`

Este arquivo define as regras de regressão que devem continuar válidas em futuras re-extrações da engenharia reversa.

## 1. Regras Ativas de Verificação

| ID | Origem (arquivo, seção) | Regra esperada após mudança | Tipo de verificação | Sinal de violação |
|----|-------------------------|-----------------------------|---------------------|-------------------|
| W001 | `_reversa_sdd/domain.md#2.2 [DR06]` | O endpoint `/healthz` na porta 8000 deve continuar respondendo com "OK". | presença | Ausência da rota GET `/healthz` ou retorno diferente de "OK". |
| W002 | `_reversa_sdd/domain.md#2.2 [DR03]` | O serviço de embeddings deve aceitar a dimensão informada dinamicamente na requisição. | presença | Falta de tratamento do parâmetro `dimensions` no corpo do POST `/embeddings`. |

## 2. Histórico de re-extrações

*(Seção vazia. Será preenchida pelo agente reverso nas próximas execuções do `/reversa`)*

## 3. Arquivadas

*(Seção vazia)*
