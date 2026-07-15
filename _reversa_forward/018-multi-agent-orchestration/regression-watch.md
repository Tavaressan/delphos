# Regression Watch: Multi-agent Orchestration — Delegação de tarefas entre agentes

> Identificador: `018-multi-agent-orchestration`
> Data: `2026-06-25`

Este documento lista as regras e asserções críticas que devem continuar verdadeiras e válidas nas próximas execuções e re-extrações do legado.

## 1. Watch Items

| ID | Origem (arquivo, seção) | Regra esperada após mudança | Tipo de verificação | Sinal de violação |
|----|--------------------------|-----------------------------|---------------------|-------------------|
| W001 | `_reversa_forward/018-multi-agent-orchestration/legacy-impact.md#4` | O cadastro de agentes via ZIP deve processar o arquivo `manifest.yaml` (se houver) e salvar na coluna `manifest_config`. | presença | O upload de um ZIP contendo `manifest.yaml` resulta na coluna `manifest_config` persistida como nula no PostgreSQL. |
| W002 | `_reversa_forward/018-multi-agent-orchestration/legacy-impact.md#4` | O `crew-worker` deve delegar as pesquisas RAG enviando mensagens à fila RabbitMQ `agent.retrieval.delegated.jobs` e lendo em `agent.retrieval.delegated.events`. | presença | O orquestrador realiza queries diretas ao banco do Postgres local no runtime da ferramenta ou falha ao publicar na fila. |
| W003 | `_reversa_forward/018-multi-agent-orchestration/legacy-impact.md#4` | Em instabilidade da fila, o orquestrador executa 3 tentativas com backoff exponencial antes de prosseguir com fallback silencioso. | redação | A execução principal falha imediatamente em caso de queda de resposta ou não aplica o fallback suave na resposta. |

## 2. Histórico de re-extrações

*(Seção preenchida pelo Reversa nas próximas execuções)*

## 3. Arquivadas

*(Itens arquivados/inativos no futuro)*

### Re-extração 2026-07-15 11:00

| ID | Veredito | Observação |
|----|----------|------------|
|  W001  | 🟢 verde | preservado |
|  W002  | 🟢 verde | preservado |
|  W003  | 🟢 verde | preservado |
