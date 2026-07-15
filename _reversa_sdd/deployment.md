# Deployment e Topologia de Infraestrutura

> Gerado automaticamente pelo `reversa-architect`

## Ambiente de Desenvolvimento (Docker Compose)
Toda a pilha orquestrada via `docker-compose.yml` raiz.
* Monta os serviços `java-core`, `crew-worker`, `rag-worker` consumindo redes internas (`backend-tier`, `db-tier`).
* A porta 5432 exposta permite gestão direta do Postgres localmente.
* A porta 5672 exposta requer o `setup_firewall.sh` no Linux/Host para impedir acesso desautorizado.

## Ambiente de Produção (Kubernetes)
(Baseado na existência da pasta `infrastructure/kubernetes`)
* **Ingress**: Substitui o Caddy dev pelo NGINX Ingress Controller.
* **Secrets**: Chaves do GCP (`GOOGLE_APPLICATION_CREDENTIALS` ou `VERTEX_AI_API_KEY`) injetadas via K8s Secrets.
* **Scaling**: Workers Python e Rust (sendo sem estado após consumo Rabbit) escalam horizontalmente baseado no backlog da fila (KEDA).

## Diagrama Físico (Produção)

```mermaid
graph TD
    subgraph GCP Cloud
        Vertex[Vertex AI / Gemini]
    end

    subgraph Kubernetes Cluster
        Ingress[Ingress Controller]
        UI[Pod: Frontend Next.js]
        API[Pod: Java Spring]
        WorkerP[Pod: Python CrewAI]
        WorkerR[Pod: Rust Tokio]
        
        Ingress --> UI
        Ingress --> API
    end

    subgraph Managed Services / Stateful
        RDS[(Cloud SQL Postgres + pgvector)]
        MQ[(Cloud AMQP / RabbitMQ)]
    end

    API --> RDS
    API --> MQ
    WorkerP --> MQ
    WorkerP --> RDS
    WorkerR --> MQ
    WorkerR --> RDS
    WorkerP --> Vertex
    WorkerR --> Vertex
```
