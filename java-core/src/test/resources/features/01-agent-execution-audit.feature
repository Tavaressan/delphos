# language: pt
Funcionalidade: Auditoria de Execução de Agentes Distribuídos

  Como um oficial de segurança e governança corporativa,
  Eu quero que todas as interações e processamentos cognitivos dos agentes sejam auditados
  Para garantir a conformidade regulatória e a rastreabilidade operacional.

  Contexto:
    Dado que a plataforma "Enterprise Agent Operating Platform" está ativa e conectada ao RabbitMQ
    E o banco de dados PostgreSQL com pgvector está pronto para gravação
    E o worker cognitivo "crew-worker" em Python está escutando na fila "agent.execution.jobs"

  @integration
  Cenário: Solicitação de execução de agente e persistência na timeline
    Quando o usuário envia uma tarefa de processamento para o agente "compliance-agent"
    Então o sistema deve registrar a execução no banco com o status "QUEUED"
    E uma mensagem contendo o Trace Context "traceparent" deve ser publicada no RabbitMQ
    E o worker cognitivo deve consumir a mensagem mudando o status para "STARTED"

  @integration
  Cenário: Gravação detalhada de chamadas de ferramentas (Tool Calls)
    Dado que o agente "compliance-agent" inicia a execução de uma tarefa
    Quando o agente dispara a ferramenta "database-auditor-server" para varrer logs
    Então o sistema deve registrar un span "Tool_Execution_Call" no OpenTelemetry
    E uma linha na tabela "tool_calls" deve ser gravada contendo o status "COMPLETED"
    E os milissegundos totais de processamento da ferramenta devem ser persistidos

  @pending
  Cenário: Gravação de buscas vetoriais (Retrieval Events) no RAG
    Dado que o agente executa uma busca semântica na base de conhecimento
    Quando o worker Rust "rag-worker" retorna 3 chunks relevantes via índice HNSW
    Então um evento de ciclo de vida "RetrievalCompleted" deve ser publicado no broker
    E os 3 chunks com seus respectivos scores de similaridade de cosseno devem ser gravados em "retrieval_events"

  @integration
  Cenário: Submissão com agentId inexistente retorna 404 sem persistência
    Quando o usuário envia uma execução com agentId inexistente
    Então o sistema deve retornar HTTP 404
    E nenhum registro deve existir em agent_executions

  @integration
  Cenário: Falha de publicação no RabbitMQ persiste execução com status FAILED
    Dado que o broker RabbitMQ está indisponível
    Quando o usuário envia uma tarefa de processamento para o agente "compliance-agent"
    Então o sistema deve retornar HTTP 500
    E o registro em agent_executions deve ter o status "FAILED"

  @integration
  Cenário: Evento ToolCallFinished com executionId inválido não insere em tool_calls
    Dado que não existe uma execução com ID "00000000-0000-0000-0000-000000000099"
    Quando o listener processa um evento ToolCallFinished com esse executionId
    Então nenhuma linha deve ser inserida em tool_calls
    E nenhuma exceção não-tratada deve se propagar
