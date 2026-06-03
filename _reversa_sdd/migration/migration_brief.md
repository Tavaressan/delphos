---
schemaVersion: 1
generatedAt: 2026-05-27T14:12:00-03:00
reversa:
  version: "1.2.43"
kind: migration_brief
producedBy: orchestrator
hash: "sha256:b638faee95d8525b682cd111813b5aef9a83aeec895eae81087a41df99de0012"
---

# Migration Brief

## Objetivo da migração
Consolidar as especificações dos legados LibreChat e MaxKB4j sob as diretrizes arquiteturais e de governança corporativa da **Enterprise Agent Operating Platform**, unificando RAG e execução distribuída em uma infraestrutura moderna, escalável e segura.

## Métricas de sucesso
- **Desacoplamento de Runtime:** Zero dependências diretas de código do CrewAI fora do `RuntimeAdapter`.
- **Performance:** Tempo de processamento e roteamento de mensagens na fila RabbitMQ abaixo de 100ms.
- **Segurança e Auditoria:** Rastreabilidade de 100% de chamadas a ferramentas cognitivas e retrievals gravados em banco.
- **Confiabilidade:** Zero vazamento de memória ou arquivos órfãos devido à natureza efêmera dos workers em Kubernetes.

## Restrições
- **Prazo:** Sem janelas longas de indisponibilidade em produção.
- **Orçamento:** Dimensionamento eficiente de pods através do KEDA no Kubernetes.
- **Técnicas:** Toda persistência de vetor deve utilizar PostgreSQL + pgvector com dimensionalidade de vetores parametrizável e compatível com o modelo de embeddings configurado para cada coleção vetorial, evitando acoplamento a provedores ou modelos específicos. Nenhuma dependência local persistente nos containers de execução.

## Fatores de risco conhecidos
- Latência de orquestração de chamadas multiagente via redes assíncronas.
- Sobrecarga e loops infinitos no runtime cognitivo Python executando ferramentas complexas.

## Stakeholders
| Nome / papel | Responsabilidade na migração |
|---|---|
| Platform Engineering Team | Configurar infraestrutura do RabbitMQ, MinIO, e Kubernetes/KEDA |
| Data Security Officer | Homologar controle RBAC multi-tenant e logs de auditoria |
| Agent Integration Lead | Homologar contratos de pacotes de agentes (`Agent Package`) |

## Stack alvo
- **Linguagem:** Java 17 (coordenação), Rust (workflows/ingestão), Python 3.11 (crew-worker)
- **Framework:** Spring Boot 3.2.5, Axum 0.7, CrewAI (Cognitive Runtime)
- **Banco:** PostgreSQL 16 com pgvector, Redis 7.0 (cache e concorrência com ShedLock)
- **Mensageria:** RabbitMQ
- **Infra:** Kubernetes, KEDA para auto-scaling de workers efêmeros, MinIO/S3 para armazenamento persistente
- **Proxy/Ingress:** Caddy (Reverse Proxy com TLS automático)

## Escopo declarado
- **Incluído:**
  - Gestão de identidades, sessões JWT Stateless e RBAC da plataforma.
  - Orquestrador de Agentes, Assistentes, Skills, MCP Servers, e Sandbox Groovy de três camadas.
  - Pipeline de Ingestão de Documentos e Busca Híbrida do MaxKB4j (vetorial no Postgres, sem MongoDB).
  - Serviços de memória desacoplados (Conversation/Execution/Audit/Vector/Memory Stores).
  - Auditoria obrigatória persistente de conversas, mensagens, execuções de ferramentas e retrievals.
- **Excluído:**
  - Autenticação por MD5 antiga.
  - Dependência local de arquivos em disco de containers.
  - MongoDB para busca textual.
  - Servidores FastAPI síncronos permanentes de apoio.
