# C4 Model - Nível 2 (Containers)

```mermaid
C4Container
    title Diagrama de Containers - Alfabra Vector

    Person(user, "Usuário Interno", "Acessa pelo browser")
    
    Container(spa, "Single Page App", "Next.js", "Providencia a interface de Chat, Painel de Tarefas e Gestão.")
    Container(caddy, "Reverse Proxy", "Caddy", "Terminação TLS e roteamento de rotas.")
    
    Container(api, "API Gateway / Core", "Java Spring Boot", "Lida com CRUD, Segurança, Sessões e roteamento ao RabbitMQ.")
    
    ContainerQueue(mq, "Message Broker", "RabbitMQ", "Trafega eventos assíncronos e submissões (AgentExecution).")
    
    Container(py_worker, "Crew-Worker", "Python / CrewAI", "Worker cognitivo, faz planilhas, pensa em steps, usa Tools.")
    Container(rs_worker, "RAG / Vector-Worker", "Rust / Tokio", "Realiza embedding rápido, ingestão e queries brutas de similaridade.")
    
    ContainerDb(db, "Relational Database", "PostgreSQL + pgvector", "Armazena tenants, permissões, histórico e vetores.")
    
    System_Ext(vertex, "Google Vertex AI", "LLM API")

    Rel(user, caddy, "Acessa", "HTTPS")
    Rel(caddy, spa, "Serve Estáticos / SSR")
    Rel(caddy, api, "API Calls", "HTTPS/SSE")
    
    Rel(api, db, "Lê/Escreve", "JDBC")
    Rel(api, mq, "Publica Tarefas", "AMQP")
    
    Rel(mq, py_worker, "Consome", "AMQP")
    Rel(mq, rs_worker, "Consome", "AMQP")
    
    Rel(py_worker, db, "Busca Embeddings", "psycopg2")
    Rel(rs_worker, db, "Queries pgvector", "sqlx")
    
    Rel(py_worker, vertex, "Prompts", "gRPC / REST")
    Rel(rs_worker, vertex, "Embeddings / Tasks", "gRPC / REST")
```
