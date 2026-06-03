# Especificação Arquitetural Geral

Este documento apresenta a síntese arquitetural da **Alfabra Vector** elaborada pelo agente **Architect**, integrando as análises estruturais e de dados das etapas anteriores.

---

## 1. Visão Geral do Sistema

A plataforma é estruturada como um **Monorepo** com suporte a conteinerização Docker Compose. Ela foi desenhada para atuar como um sistema corporativo de busca semântica e recuperação de informações estruturadas (RAG) em documentos privados de forma segura, com auditoria detalhada de conformidade.

A arquitetura adota um modelo híbrido:
1. **Orquestrador Central Relacional:** Desenvolvido em Java/Spring Boot (`java-core`), gerenciando usuários, chats, metadados relacionais e o controle RBAC.
2. **Pipeline Vetorial de Alta Performance:** Desenvolvido em Rust (`rust-services`), operando de forma assíncrona para extração de texto de documentos pesados e cálculo/persistência de embeddings com dimensionalidade parametrizável.

---

## 2. Tecnologias Empregadas

* **Frontend:** Next.js (14.2.3) com React e Tailwind CSS.
* **Core API:** Java 17 + Spring Boot (3.2.5), Flyway (gerenciamento de migração SQL), JPA/Hibernate.
* **Serviços de Processamento:** Rust + Axum (0.7) + Tokio (runtime assíncrono).
* **Banco de Dados:** PostgreSQL estendido com `pgvector` para buscas vetoriais integradas.
* **Cache & Sessão:** Redis (7.0).
* **Armazenamento de Arquivos:** MinIO (serviço S3 on-premise local).
* **Gateway & TLS:** Caddy (Reverse Proxy com DNS Challenge).
* **Segurança do Host VM:** UFW (Uncomplicated Firewall).

---

## 3. Padrões de Integração e Comunicação

* **Interface Web para API Central:** Comunicação baseada em rotas HTTP REST com autenticação Stateless (JWT) enviada via cabeçalho HTTP.
* **Comunicação interna do Pipeline de Ingestão:**
  * O Ingestion Worker realiza consultas frequentes (polling) no banco PostgreSQL para identificar registros em `UPLOADING` ou `PROCESSING`.
  * O processamento e vetorização ocorrem via chamadas HTTP REST internas do Ingestion Worker aos microsserviços `document-processing` e `embedding-service` na porta 8000.
  * O Ingestion Worker grava diretamente os resultados (chunks e vetores de embedding) no PostgreSQL via inserção em lote.

---

## 4. Dívidas Técnicas Identificadas

1. **Ausência de Testes Automatizados:** O Scout e o Arqueólogo detectaram 0 (zero) arquivos de testes unitários ou de integração nos microsserviços em Rust, e pouca ou nenhuma cobertura no Spring Boot.
   - *Criticidade:* Alta (Risco de regressão e quebras silenciosas no processamento vetorial).
   - *Status:* 🟢 CONFIRMADO.
2. **Heartbeat Simplista do Ingestion Worker:** O worker executa um loop de `sleep(60)` para dar o heartbeat. Não há tratamento de concorrência ou verificação de travamento se um documento falhar no meio do processamento (podendo deixar documentos travados indefinidamente no estado `PROCESSING`).
   - *Criticidade:* Média.
   - *Status:* 🟢 CONFIRMADO (Identificado em `ingestion-worker/src/main.rs`).
3. **Dependência Crítica de API LLM Externa sem Fallback:** O microsserviço de embedding não possui lógicas de retry exponencial ou fallback para outros provedores de nuvem. Se a API externa cair, a fila inteira de ingestão falha.
   - *Criticidade:* Alta.
   - *Status:* 🟡 INFERIDO.
