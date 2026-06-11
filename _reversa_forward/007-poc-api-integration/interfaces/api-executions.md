# Interface: API de Execuções de Agentes (/api/executions)

> Identificador da feature: `007-poc-api-integration`
> Data: `2026-06-05`
> Requirements: `_reversa_forward/007-poc-api-integration/requirements.md`

Este documento descreve os contratos de integração HTTP expostos pelo endpoint `/api/executions` do Spring Boot para gerenciar o ciclo de vida assíncrono das tarefas de RAG e agentes.

---

## 1. Criar Nova Execução (Submit Execution)

Submete um novo prompt de usuário para ser processado no pipeline assíncrono.

* **Método:** `POST`
* **Caminho:** `/api/executions`
* **Autenticação:** Opcional (PermitAll no PoC)
* **Headers Esperados:**
  * `Content-Type: application/json`

### 1.1. Corpo da Requisição (Request Body)
```json
{
  "prompt": "Qual a periodicidade de manutenção dos cabos de tração?",
  "tenantId": "d3b07384-d113-4ec2-a5d6-c8a7b6cf9110"
}
```
* **Campos:**
  * `prompt` (String, Obrigatório): Texto digitado pelo usuário.
  * `tenantId` (String UUID, Opcional): ID do inquilino para segmentação de dados. Caso não fornecido, o backend gerará um UUID aleatório temporário.

### 1.2. Resposta de Sucesso (Response Body - 200 OK)
```json
{
  "executionId": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
  "conversationId": "f1e2d3c4-b5a6-7988-9766-554433221100",
  "status": "QUEUED",
  "prompt": "Qual a periodicidade de manutenção dos cabos de tração?",
  "tenantId": "d3b07384-d113-4ec2-a5d6-c8a7b6cf9110"
}
```

### 1.3. Resposta de Erro (500 Internal Server Error)
```json
{
  "error": "Mensagem detalhada do erro ocorrido no processamento interno"
}
```

---

## 2. Consultar Detalhes da Execução (Get Execution Status)

Consulta o estado atualizado e o resultado final da execução cognitiva.

* **Método:** `GET`
* **Caminho:** `/api/executions/{id}`
* **Parâmetro de Path:**
  * `id` (UUID, Obrigatório): Identificador único da execução retornado na submissão.

### 2.1. Resposta de Sucesso (Response Body - 200 OK)
```json
{
  "executionId": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
  "status": "COMPLETED",
  "prompt": "Qual a periodicidade de manutenção dos cabos de tração?",
  "output": "De acordo com a norma técnica, elevadores industriais exigem checagem a cada 30 dias operacionais...",
  "errorMessage": null,
  "tokensConsumed": 340,
  "startedAt": "2026-06-05T18:00:00Z",
  "finishedAt": "2026-06-05T18:00:15Z"
}
```
* **Status Possíveis (`status`):**
  * `REQUESTED`: Execução recebida pelo controller.
  * `QUEUED`: Tarefa enfileirada no RabbitMQ.
  * `THINKING`: Worker de RAG consumiu a tarefa e iniciou processamento.
  * `TOOL_RUNNING`: O agente está executando buscas no pgvector ou banco de dados.
  * `COMPLETED`: Sucesso. O resultado está presente no campo `output`.
  * `FAILED`: Erro. O motivo está detalhado em `errorMessage`.

### 2.2. Resposta de Não Encontrado (404 Not Found)
Retorna corpo vazio caso o UUID fornecido não exista nas tabelas do banco de dados.
