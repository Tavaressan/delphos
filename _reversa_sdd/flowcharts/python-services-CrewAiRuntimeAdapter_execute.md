# Fluxograma Detalhado: CrewAiRuntimeAdapter.execute

> Obrigatório no modo de documentação Detalhado.

```mermaid
flowchart TD
    Start((Início .execute)) --> Valid[validate_and_sanitize(prompt)]
    Valid --> |Fail| Abort[Aborta: AgentExecutionFailed]
    Valid --> |Pass| EvtStarted[Publica AgentExecutionStarted]
    EvtStarted --> RAG[Chama _search_db]
    RAG --> |HTTP POST| Embed[embedding-service]
    Embed --> |SQL| DB[pgvector Query]
    DB --> |Retorna chunks| EvtRAG[Publica RetrievalCompleted]
    EvtRAG --> LoadTools{Qual o tag do Agente?}
    LoadTools -->|piso| TPiso[Add calculate_floor_specs Tool]
    LoadTools -->|orquestrador| TOrq[Add route_to_agent Tool]
    LoadTools -->|outro| TDef[Tools Básicas]
    TPiso --> CheckCust[Carrega Custom Tools / Sandbox]
    TOrq --> CheckCust
    TDef --> CheckCust
    CheckCust --> Crew[Instancia agent e task CrewAI]
    Crew --> Kick[crew.kickoff]
    Kick --> EvtFin[Publica AgentExecutionFinished]
    EvtFin --> End((Fim))
```
