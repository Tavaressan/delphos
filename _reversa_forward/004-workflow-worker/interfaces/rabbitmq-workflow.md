# Interface de Fila: RabbitMQ Workflow Agent

> Identificador da feature: `004-workflow-worker`
> Data: `2026-06-03`
> Documento principal: `_reversa_forward/004-workflow-worker/roadmap.md`

Este documento especifica o contrato externo de mensageria assíncrona RabbitMQ do `workflow-worker` na plataforma **Alfabra Vector**.

---

## 1. Configurações da Fila e Exchange

* **Exchange Central:** `agent.execution.exchange`
  * **Tipo:** `topic`
  * **Durabilidade:** `durable` (persistente em reinicializações do broker)
* **Fila do Worker:** `agent.workflow.queue`
  * **Durabilidade:** `durable`
  * **Dead Letter Exchange (DLX):** `agent.execution.dlx` (redirecionamento de mensagens rejeitadas com NACK sem requeue)
* **Routing Key de Ingestão de Jobs:** `agent.workflow.requested`

---

## 2. Contratos de Payload

### 2.1. Payload de Entrada (Job Request)

Enviado pelo `java-core` quando um workflow determinístico é disparado pelo usuário ou regras de negócio:

* **Routing Key:** `agent.workflow.requested`
* **Content-Type:** `application/json`
* **Schema:**

```json
{
  "workflow_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "workflow_version": 1,
  "tenant_id": "default-tenant",
  "execution_id": "c3a76ef4-bbcc-467a-bc12-f47285a85fae"
}
```

* **Campos:**
  * `workflow_id` (String UUID, obrigatório): ID da definição da DAG no PostgreSQL.
  * `workflow_version` (Integer, obrigatório): Versão da DAG correspondente.
  * `tenant_id` (String, obrigatório): Identificador para filtragem lógica multi-tenant no banco.
  * `execution_id` (String UUID, obrigatório): Identificador único da execução para fins de tracing e auditoria global.

---

### 2.2. Eventos de Ciclo de Vida Enviados pelo Worker

O `workflow-worker` deve notificar a exchange sobre o ciclo de vida da execução da DAG.

#### A. Início da Execução (`agent.workflow.started`)

Disparado assim que a mensagem é consumida e validada no worker:

* **Routing Key:** `agent.workflow.started`
* **Payload:**

```json
{
  "eventId": "f7842e5d-16a7-47b2-bd77-1a0a2f42aee4",
  "eventType": "agent.workflow.started",
  "executionId": "c3a76ef4-bbcc-467a-bc12-f47285a85fae",
  "timestamp": "2026-06-03T17:55:00Z",
  "payload": {}
}
```

#### B. Sucesso na Execução (`agent.workflow.completed`)

Disparado quando todos os nós da DAG declarativa foram processados com sucesso:

* **Routing Key:** `agent.workflow.completed`
* **Payload:**

```json
{
  "eventId": "7c1e3db4-aa2f-488b-a3d1-9fbd2f71ee43",
  "eventType": "agent.workflow.completed",
  "executionId": "c3a76ef4-bbcc-467a-bc12-f47285a85fae",
  "timestamp": "2026-06-03T17:55:12Z",
  "payload": {
    "outputResult": "DAG concluída com sucesso. Executados 2 nós.",
    "executionTimeMs": 12000
  }
}
```

#### C. Falha na Execução (`agent.workflow.failed`)

Disparado em caso de timeout de 15 segundos excedido, erros de conexão no Postgres ou falha de validação da DAG:

* **Routing Key:** `agent.workflow.failed`
* **Payload:**

```json
{
  "eventId": "12de4fa8-bb92-48f1-aee1-2489ae21f3ab",
  "eventType": "agent.workflow.failed",
  "executionId": "c3a76ef4-bbcc-467a-bc12-f47285a85fae",
  "timestamp": "2026-06-03T17:55:15Z",
  "payload": {
    "errorMessage": "Timeout de 15000ms excedido durante a execução da DAG.",
    "errorCode": "TIMEOUT"
  }
}
```

---

## 3. Garantias de Entrega e Tolerância a Falhas

* **Garantia At-Least-Once:** O `workflow-worker` só enviará o `ACK` da mensagem original de job ao broker após a publicação final do evento de sucesso (`completed`) ou falha controlada (`failed`) e persistência das auditorias.
* **Redundância/Reenfileiramento:** Em falhas físicas abruptas do pod do worker, o RabbitMQ reenfileirará automaticamente a mensagem após a desconexão da sessão AMQP.
