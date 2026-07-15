# Python Services

> Template do arquivo `requirements.md`. Foca no QUE a unit faz, não no como.

## Visão Geral
O `python-services` é o cérebro cognitivo do sistema. Construído com `pika` (RabbitMQ) e `CrewAI`, ele assume as requisições, pesquisa contexto semântico, instiga o LLM (`gemini-1.5-flash`), valida AST de skills customizadas e dispara chamadas em ferramentas para formular a melhor resposta do agente.

## Responsabilidades
- Ingerir Jobs do RabbitMQ.
- Sanitizar inputs contra tentativas de Prompt Injection.
- Orquestrar delegacias via Framework CrewAI multi-agente (ou single agent dependendo do agentId e Tags).
- Executar scripts via parser AST validando a Sandbox de Segurança.
- Acionar a Cloud Vertex AI para obtenção das strings do LLM.

## Regras de Negócio
- [Mitigação de Prompt Injection] Qualquer string do usuário deve passar por validação sanitizada antes de concatenar ao `<user_query>`. Ocorrências de fraude derrubam a submissão e geram evento de Falha. 🟢
- [Sandbox Python] O código contido em Zips `.py` na pasta `tools/` de upload do agente é validado. Se chamar modulos inseguros (`sys`, `os`), a exceção bloqueia o Agente de rodar. (Ref: ADR-002). 🟢

## Requisitos Funcionais

| ID | Requisito | Prioridade | Critério de Aceite |
|----|-----------|-----------|-------------------|
| RF-01 | Adaptação CrewAI | Must | O sistema pega um `agent_id`, baixa seu SystemPrompt (BD), insere as custom tools e aciona a `Crew.kickoff()`. |
| RF-02 | Emissão de Eventos de Tool | Must | Quando o AgentLLM decide chamar uma Tool (ex: `calculate_floor_specs`), emite evento de MQ: `ToolCallStarted` e depois `ToolCallFinished` pro frontend renderizar. |
| RF-03 | Quota e Parsing | Should | Suporta tools para calculo de Quotas, com tratamento via Pydantic (`QuotaValue`). |

## Requisitos Não Funcionais

| Tipo | Requisito inferido | Evidência no código | Confiança |
|------|--------------------|---------------------|-----------|
| Segurança | O uso restrito do Vertex via `GOOGLE_APPLICATION_CREDENTIALS` | `CrewAiRuntimeAdapter` construtor | 🟢 |
| Resiliência | ACK/NACK com controle rigoroso do `prefetch_count=1` para evitar preensão das tasks por worker engasgado. | `main.py` | 🟢 |

## Critérios de Aceitação

```gherkin
Dado que o Worker consumiu um Evento
Quando o Agente decide buscar conhecimento (Tool: search_knowledge_base)
Então o Adapter publica ToolCallStarted
E interage com DB
E envia ToolCallFinished ao Frontend via fila Events
E devolve contexto ao LLM para prosseguir
```

## Prioridade (MoSCoW)
| Requisito | MoSCoW | Justificativa |
|-----------|--------|---------------|
| Pipeline CrewAI (Adapter) | Must | Core LLM cognitivo. |
| Segurança AST Sandbox | Must | Risco RCE gravíssimo sem ele. |
| Suporte Pydantic | Could | Importante, mas opcional se fosse JSON raw nativo. |

## Rastreabilidade de Código

| Arquivo | Função / Classe | Cobertura |
|---------|-----------------|-----------|
| `python-services/crew-worker/src/runtime/crewai_adapter.py` | Core | 🟢 |
