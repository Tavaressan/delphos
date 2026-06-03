# Fluxograma de Controle: infrastructure 🟢 **CONFIRMADO**

Este fluxograma ilustra o fluxo de roteamento de rede externa e provisionamento de DNS e segurança orquestrado pelo proxy reverso Caddy e as configurações de host.

```mermaid
flowchart TD
    Request([Requisição HTTPS Externa]) --> CaddyProxy{Caddy Reverse Proxy}
    
    subgraph Caddy TLS & Routing
        CaddyProxy --> CheckTLS{Certificado SSL Ativo?}
        CheckTLS -->|Não| DNSChallenge[Acionar DuckDNS API Challenge]
        DNSChallenge --> Propagate[Aguardar propagação 60s]
        Propagate --> AcquireCert[Gerar Certificado via Let's Encrypt]
        AcquireCert --> RouteForward
        
        CheckTLS -->|Sim| RouteForward[Encaminhar tráfego pelo proxy]
        RouteForward --> ForwardRule[reverse_proxy frontend:3000]
    end
    
    ForwardRule --> NextJS[Container Next.js Frontend]
    
    subgraph Postgres Init
        PostgresContainer[Start Postgres Container] --> RunInitSQL[Executar init.sql]
        RunInitSQL --> EnableVector[Instalar EXTENSION vector]
        EnableVector --> EnableUUID[Instalar EXTENSION uuid-ossp]
    end
```
