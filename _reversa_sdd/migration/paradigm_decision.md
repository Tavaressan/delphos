# Decisão de Paradigma: Event-Driven Agent Platform & Decoupled Runtimes

Este documento formaliza a arquitetura operacional e cognitiva da **Enterprise Agent Operating Platform**, detalhando como os componentes se integram sob princípios de baixo acoplamento, reatividade a eventos e isolamento de runtime.

---

## 1. Princípios de Paradigma

### 1.1. Orquestração de Coordenação vs. Orquestração Cognitiva
Diferencia-se estritamente o papel de controle da plataforma e o papel de geração/raciocínio cognitivo:
- **Camada Spring (Coordenação):** Gerencia o controle transacional, autenticação, multi-tenancy, limites e governança. Não possui qualquer acoplamento com classes de IA ou frameworks cognitivos (ex: CrewAI).
- **Workers (Execução Cognitiva):** São inteiramente desacoplados e reativos. Executam em runtimes cognitivos dedicados, processando mensagens enviadas exclusivamente via Broker de Mensagens (RabbitMQ).

### 1.2. Desacoplamento do Cognitive Runtime (CrewAI)
Para mitigar o risco de *vendor lock-in* em frameworks de agentes que evoluem rapidamente (como CrewAI ou LangGraph), a plataforma adota o padrão de isolamento por adaptadores e interfaces unificadas. O CrewAI é o runtime padrão inicial, mas a arquitetura suportará substituição transparente.

---

## 2. Contrato de Runtime: `AgentRuntime`

Toda execução cognitiva de agentes deve respeitar a abstração de controle definida pelo contrato abaixo (expressado em Kotlin):

```kotlin
package com.enterprise.agent.platform.runtime

import java.util.UUID

interface AgentRuntime {
    /**
     * Submete uma tarefa para processamento assíncrono no runtime cognitivo.
     * Retorna um identificador da execução (handle) para monitoramento do ciclo de vida.
     */
    fun submit(task: AgentTask): ExecutionHandle

    /**
     * Solicita o cancelamento/abortamento de uma execução em andamento.
     */
    fun cancel(executionId: UUID)

    /**
     * Consulta o status atual de processamento de uma execução específica.
     */
    fun status(executionId: UUID): ExecutionStatus
}
```

### Implementações Futuras Suportadas pelo Contrato:
- `CrewAiRuntimeAdapter` (Runtime inicial, Python Workers executando CrewAI).
- `LangGraphRuntimeAdapter` (Para grafos complexos de agentes, Python).
- `RustRuntimeAdapter` (Para execuções locais de alta performance baseadas em WASM/Rust).
- `CustomRuntimeAdapter` (Para integrações proprietárias).

---

## 3. Modelo Operacional: Workers Efêmeros em Kubernetes

A infraestrutura física da plataforma adota o paradigma de computação efêmera e escalabilidade orientada à demanda:
1. **Fronteira Assíncrona:** A camada Spring publica solicitações na fila do RabbitMQ.
2. **Escalonamento por Demanda (KEDA):** O Kubernetes Event-driven Autoscaling (KEDA) monitora a profundidade das filas do RabbitMQ.
3. **Pods Efêmeros:** Quando mensagens chegam na fila `agent.execution.jobs`, o KEDA cria dinamicamente novas réplicas de pods do `crew-worker` para processar os jobs.
4. **Isolamento de Estado:** Os workers não retêm dados locais persistentes em disco. Todo estado de conversação e arquivos de sandbox devem ser gravados nos serviços centrais (`Memory Service` e `MinIO/S3`) para que o Pod possa ser destruído com segurança imediatamente após a conclusão ou falha do ciclo de execução.
