# ADR 002: Mitigação de Poison Pills no Worker Python (StackDepthExceededError)

## Contexto e Problema
O worker Python rodando os Agentes (`crew-worker`) processa os loops de reflexão e acionamento de ferramentas. Casos anômalos no prompt/RAG geravam recursão profunda do modelo (`StackDepthExceededError`), levando a estado envenenado na memória do worker CrewAI (Issue #391). Se a exceção fosse apenas engolida, o próximo job na mesma thread herdaria resquícios e falharia imediatamente.

## Decisão
Foi decidido implementar um limite limite (Poison Threshold) monitorado no worker. Quando esse threshold é excedido, o worker realiza um encerramento duro (`os._exit(1)`) de si mesmo intencionalmente, deixando que a política de reinício do Docker ou do orchestrator (como Kubernetes/ECS) levante um container limpo. Além disso, as execuções foram isoladas via `contextvars.Context` no loop principal.

## Alternativas consideradas
- **Reinstanciar o Agente por Job:** Custo altíssimo de warmup do framework CrewAI e latência inviável a cada requisição.
- **Engolir o Erro (Swallow):** Provou-se ineficaz pois vazava estado para a próxima run.
- **Multiprocessing Nativo do Python:** Maior complexidade de IPC (Inter-process Communication) apenas para segurar um erro esporádico de IA.

## Consequências
- 🟢 **Positivo:** A integridade do estado da aplicação é mantida. Jobs subsequentes têm um ambiente 100% estéril garantido pela VM Docker.
- 🔴 **Negativo:** Ligeira lentidão no processamento da fila de RabbitMQ no exato momento em que um envenenamento ocorre (devido ao cold start do container).
