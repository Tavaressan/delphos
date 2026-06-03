# Kubernetes Deployments & KEDA ScaledObjects

Este diretório contém os manifestos de implantação para a plataforma no ambiente Kubernetes, bem como as configurações do KEDA (Kubernetes Event-driven Autoscaling) para auto-scaling baseado nas filas do RabbitMQ.

## Conteúdo Esperado
- `deployment-core.yaml`: Manifesto de deploy para o gateway de coordenação Spring Boot.
- `deployment-workers-rust.yaml`: Manifestos para os workers Rust (`ingestion-worker`, `rag-worker`, `workflow-worker`).
- `deployment-crew-worker.yaml`: Manifesto para os workers cognitivos Python.
- `keda-scaledobjects.yaml`: Definição de escala baseada nas filas do RabbitMQ.
