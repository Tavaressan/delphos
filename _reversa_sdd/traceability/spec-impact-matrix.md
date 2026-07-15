# Matriz de Impacto (Spec Impact Matrix)

> Identifica qual componente quebra caso sua dependência primária mude.

| Se este componente mudar... | ...Impacta diretamente este componente | Tipo de Impacto | Risco |
|-----------------------------|----------------------------------------|-----------------|-------|
| **Schema DB (pgvector)** | `rust-services` (sqlx) e `python-services` (psycopg2) | Forte: Queries RAW vão quebrar imediatamente na inicialização ou execução de queries. | 🔴 ALTO |
| **RabbitMQ JSON DTOs** | `java-core`, `python-services`, `rust-services` | Médio: Alteração de chave num Producer quebra o Consumer correspondente. | 🔴 ALTO |
| **AgentExecution JPA** | `ExecutionController` e Frontend UI (SSE) | Médio: Adicionar novos status na máquina de estado do backend precisa de parse no frontend para não quebrar UI. | 🟡 MÉDIO |
| **Frontend UI (Next)** | N/A | Baixo: Backend é agnóstico. | 🟢 BAIXO |
| **Vertex AI API / Models** | `python-services` (CrewAI) | Alto: Depreciação de modelo impacta todo o pipeline cognitivo subjacente. | 🔴 ALTO |
