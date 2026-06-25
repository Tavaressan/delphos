# Data Delta: Multi-agent Orchestration — Delegação de tarefas entre agentes

> Identificador: `018-multi-agent-orchestration`
> Data: `2026-06-25`

## 1. Diff Conceitual sobre o Modelo do Legado

Não há novos modelos relacionais a serem persistidos de forma permanente no banco de dados PostgreSQL. A infraestrutura existente para auditoria (`tool_calls` e `agent_executions`) é suficiente para armazenar e expor as métricas e logs das delegações distribuídas.

A alteração estrutural conceitual ocorre na modelagem do arquivo ZIP de configuração do agente (baseado em MinIO):
- **Origem:** `_reversa_sdd/domain.md#Agent` (ZIP de configuração exige apenas arquivos `.md` na raiz para ler system instructions).
- **Destino:** O arquivo ZIP agora conterá opcionalmente um arquivo `manifest.yaml` na raiz para mapear e habilitar ferramentas especialistas no orquestrador.

## 2. Novos Campos e Configurações

### Especificação do `manifest.yaml` (ZIP do Agente)
```yaml
# manifest.yaml
schema_version: 1
agent_settings:
  allow_delegation: true
  tools:
    - name: "search_knowledge_base"
      enabled: true
      parameters:
        limit: 5
    - name: "execute_workflow"
      enabled: false
```

## 3. Persistência de Auditoria (`tool_calls`)
Ao delegar uma subtarefa para o `rag-worker`, o `crew-worker` registrará a chamada de ferramenta na tabela `tool_calls` usando o seguinte mapeamento:
- `id`: UUID gerado.
- `execution_id`: UUID da execução principal (`AgentExecution`).
- `tool_name`: `"search_knowledge_base"`.
- `input_params`: JSON contendo a string de busca e o tenant_id.
- `output_result`: JSON contendo os chunks recuperados e scores correspondentes.
- `created_at`: Timestamp UTC.

## 4. Migrações Necessárias
- Nenhuma migração de banco de dados SQL (Flyway) é requerida.
