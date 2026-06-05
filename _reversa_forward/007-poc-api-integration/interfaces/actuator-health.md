# Interface: API de Monitoramento de Saúde (/actuator/health)

> Identificador da feature: `007-poc-api-integration`
> Data: `2026-06-05`
> Requirements: `_reversa_forward/007-poc-api-integration/requirements.md`

Este documento descreve o contrato HTTP REST fornecido pelo Spring Boot Actuator para verificação de disponibilidade operacional do backend Alfabra Vector.

---

## 1. Consultar Saúde do Sistema (Health Check)

Verifica se o backend e suas conexões críticas de infraestrutura (PostgreSQL, Redis, RabbitMQ) estão de pé e saudáveis.

* **Método:** `GET`
* **Caminho:** `/actuator/health`
* **Autenticação:** Opcional (Padrão público configurado no Spring Security)
* **Headers Esperados:**
  * `Accept: application/json`

### 1.1. Resposta de Sistema Saudável (Response Body - 200 OK)
```json
{
  "status": "UP"
}
```

### 1.2. Resposta de Instabilidade ou Degradação (Response Body - 503 Service Unavailable)
Caso o banco de dados PostgreSQL ou a fila do RabbitMQ estejam inacessíveis, o Actuator retorna status degraded e código HTTP correspondente:
```json
{
  "status": "DOWN"
}
```
* **Comportamento do Frontend:** O frontend deve interpretar qualquer código de resposta diferente de `200 OK` (incluindo falhas de conexão física e timeouts) como indicador de indisponibilidade geral do backend, atualizando o indicador de conectividade para **Offline** (vermelho).
