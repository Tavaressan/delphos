# language: pt
Funcionalidade: Execução de Workflows Determinísticos pós-RAG

  Como um oficial de segurança e governança corporativa,
  Eu quero que o processamento determinístico de DAGs pelo workflow-worker seja validado
  Para garantir conformidade de auditoria e controle de timeouts de execução.

  Contexto:
    Dado que a plataforma "Enterprise Agent Operating Platform" está ativa e conectada ao RabbitMQ
    E o banco de dados PostgreSQL com pgvector está pronto para gravação
    E o worker determinístico "workflow-worker" em Rust está escutando na fila "agent.workflow.queue"

  @pending
  Cenário: Execução bem-sucedida de DAG declarativa pós-RAG
    Dado que existe uma definição de DAG cadastrada no PostgreSQL com ID "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d"
    Quando uma mensagem de job de workflow é publicada na exchange "agent.execution.exchange" com a routing key "agent.workflow.requested"
    Então o "workflow-worker" deve consumir o job e carregar a topologia da DAG do banco de dados
    E deve disparar a execução dos nós declarados
    E deve publicar o evento "agent.workflow.completed" ao finalizar com sucesso
    E deve enviar o ACK da mensagem original para o RabbitMQ

  @pending
  Cenário: Abortamento por Timeout de Execução
    Dado que existe uma definição de DAG com nós de longa duração
    Quando o "workflow-worker" inicia a execução do job
    E o processamento total da DAG excede o limite configurado de 15 segundos
    Então o worker Rust deve interromper a execução usando tokio::select!
    E deve registrar o evento de falha "agent.workflow.failed" com o status "TIMEOUT" no broker
    E deve enviar o NACK da mensagem original
