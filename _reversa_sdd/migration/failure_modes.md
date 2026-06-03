# Modos de Falha Operacionais (Failure Modes and Recovery)

Este documento especifica os cenários de falhas técnicas distribuídas na **Enterprise Agent Operating Platform**, definindo procedimentos e planos de mitigação para Engenheiros de Confiabilidade de Site (SRE) e equipes de resposta a incidentes.

---

## Catálogo de Cenários de Falha

### 1. Falha: Conexão Interrompida com Provedor de LLM (API Vertex AI / OpenAI)
- **Causa Raiz:** Queda do serviço de nuvem externa ou estouro de cota (Rate Limit).
- **Detecção:** Erros recorrentes do tipo `HTTP 429` (Too Many Requests) ou `HTTP 503` capturados nos traces do OpenTelemetry.
- **Protocolo de Recuperação:**
  1. O worker entra em fluxo de retry com backoff exponencial.
  2. Ao atingir 3 tentativas, desvia a chamada para a API secundária parametrizada no `EmbeddingProvider` (ex: OpenAI / Ollama local).
  3. Dispara alerta de severidade 2 no painel de monitoramento.

### 2. Falha: Travamento de Worker Cognitivo em Loop Infinito
- **Causa Raiz:** O agente cognitivo do CrewAI entra em loop de pensamento repetindo chamadas a ferramentas.
- **Detecção:** Span de span "Crew_Execution" ativo por mais de 45 segundos.
- **Protocolo de Recuperação:**
  1. A thread do worker Python força a interrupção da execução do container por timeout rígido.
  2. Salva o status `TIMEOUT` na tabela `agent_executions`.
  3. Notifica o usuário no chat via SSE com uma mensagem de erro estruturada e libera o worker para novas mensagens.

### 3. Falha: Perda de Conectividade com o RabbitMQ (Broker Down)
- **Causa Raiz:** Queda física do cluster do barramento de mensagens.
- **Detecção:** A camada de coordenação Java lança exceções de barramento e os microsserviços Rust/Python entram em modo desconectado.
- **Protocolo de Recuperação:**
  1. A camada Spring suspende novos envios e armazena de forma persistente os comandos de tarefas com status `QUEUED` no PostgreSQL local.
  2. Mecanismos de reconexão automática nos workers tentam restabelecer o canal TCP a cada 5 segundos.
  3. Assim que a conexão com o RabbitMQ é restabelecida, a camada Spring envia em lote (*replay*) os eventos pendentes armazenados no banco.

### 4. Falha: Esgotamento de Memória nos Workers Efêmeros (OOM Killed)
- **Causa Raiz:** Um agente processa payloads excessivamente pesados e ultrapassa o limite físico de RAM configurado no Pod do Kubernetes.
- **Detecção:** O pod é reiniciado com o status `OOMKilled` pelo Kubernetes.
- **Protocolo de Recuperação:**
  1. Como a mensagem no RabbitMQ não recebeu `ACK`, ela retorna automaticamente para a fila de processamento após a queda do pod.
  2. O KEDA inicializa um novo Pod para processar a tarefa.
  3. Se o novo Pod falhar sistematicamente (delivery count excedido), a mensagem é enviada para a DLQ para depuração manual, evitando sobrecarregar o cluster.
