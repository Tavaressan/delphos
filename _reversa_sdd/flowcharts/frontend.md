```mermaid
graph TD
    User([Usuário]) --> |Acessa| ChatCanvas
    User --> |Gerencia Agentes| CatalogClient
    User --> |Gerencia Documentos| KnowledgeBasePage
    User --> |Agenda Tarefas| SchedulePage

    ChatCanvas --> |SSE Streaming| APIClient
    ChatCanvas --> |Polling Execuções| APIClient
    CatalogClient --> |REST API| APIClient
    KnowledgeBasePage --> |Upload (FormData) / Polling| APIClient
    SchedulePage --> |REST API| APIClient

    APIClient --> |HTTP| Backend[(Backend API)]
```
