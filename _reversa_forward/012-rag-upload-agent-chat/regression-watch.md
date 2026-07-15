# Regression Watch: Upload de Documentos para RAG e Chat com Agentes

> Identificador: `012-rag-upload-agent-chat`

Este documento lista itens específicos de regras de negócio modificadas que devem ser verificados em futuras rodadas de engenharia reversa para garantir que a implementação no código permaneça equivalente à especificação de domínio.

## Tabela de Watch Items

| ID | Origem (arquivo, seção) | Regra esperada após mudança | Tipo de verificação | Sinal de violação |
|---|---|---|---|---|
| W001 | `_reversa_sdd/domain.md#2.1.-Controle-de-Acesso-(RBAC)` (DR02) | As conversas devem ser isoladas por usuário, tenant e agent_id. A busca vetorial RAG deve recuperar apenas chunks de documentos correspondentes ao `agent_id` do chat ou documentos gerais (`agent_id IS NULL`). | `presença` | Busca RAG retornar chunks de documentos pertencentes a outros agentes (vazamento de conhecimento entre agentes). |

## Histórico de re-extrações

* (A ser populado pelo framework `/reversa` em futuras varreduras)

## Arquivadas

* (Nenhum item arquivado nesta rodada)

## Observações

* (Nenhuma observação de confidência baixa/média relevante para regressão)

### Re-extração 2026-07-15 11:00

| ID | Veredito | Observação |
|----|----------|------------|
|  W001  | 🟢 verde | preservado |
