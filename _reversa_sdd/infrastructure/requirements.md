# Infrastructure

> Template do arquivo `requirements.md`. Foca no QUE a unit faz, não no como.

## Visão Geral
Pasta que condensa a topologia e scripts operacionais do Alfabra Vector, ditando como Frontend, Backend, Workers e Banco se falam nos ambientes Docker e Kubernetes.

## Responsabilidades
- Provisionar banco PostgreSQL populado com extensões vetoriais ativadas.
- Orquestrar o Caddy como Reverse Proxy para TLS Offloading.
- Configurar rotas internas seguras para RabbitMQ e microserviços.

## Regras de Negócio
- N/A para Infraestrutura.

## Requisitos Funcionais

| ID | Requisito | Prioridade | Critério de Aceite |
|----|-----------|-----------|-------------------|
| RF-01 | Script de Firewall | Must | Travar portas não essenciais (RabbitMQ) fora do pool local. |
| RF-02 | Ingress Caddy | Must | Redirecionamento 443 -> /api (Backend) e /* (NextJS). |

## Requisitos Não Funcionais

| Tipo | Requisito inferido | Evidência no código | Confiança |
|------|--------------------|---------------------|-----------|
| Portabilidade | Uso estrito de Docker Compose para dev matching Prod (K8s) | `docker-compose.yml` e pastas | 🟢 |

## Rastreabilidade de Código

| Arquivo | Função / Classe | Cobertura |
|---------|-----------------|-----------|
| `infrastructure/setup_firewall.sh` | Bash Shell | 🟢 |
| `infrastructure/caddy/Caddyfile` | Router | 🟢 |
