# Fluxograma de Controle: rust-services 🟢 **CONFIRMADO**

Este fluxograma ilustra o controle de execução em paralelo de dois fluxos principais de microsserviços em Rust: os servidores HTTP (Axum) e o processo em background (Ingestion Worker).

```mermaid
flowchart TD
    subgraph Servidores HTTP (document-processing & embedding-service)
        StartHTTP([Início main.rs]) --> InitAxum[Instanciar Router Axum]
        InitAxum --> MapHealthz[Mapear Rota GET /healthz]
        MapHealthz --> BindPort[Vincular TcpListener 0.0.0.0:8000]
        BindPort --> Serve[axum::serve]
        Serve --> ListenLoop{Recebeu Request?}
        
        ListenLoop -->|Sim| RouteRequest{Caminho}
        RouteRequest -->|/healthz| ResponseOK[Retornar 'OK' 200] --> ListenLoop
        RouteRequest -->|Outro| ResponseNotFound[Retornar 404] --> ListenLoop
    end

    subgraph Daemon Ingestão (ingestion-worker)
        StartWorker([Início main.rs]) --> WorkerLog[Print 'Ingestion Worker starting...']
        WorkerLog --> WorkerLoop[Loop de Ingestão]
        WorkerLoop --> Sleep[tokio::time::sleep 60 segundos]
        Sleep --> Heartbeat[Print 'Ingestion Worker heartbeat']
        Heartbeat --> WorkerLoop
    end
```
