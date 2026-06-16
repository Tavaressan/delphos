# Impacto no Legado: Upload de Documentos para RAG e Chat com Agentes

> Identificador: `012-rag-upload-agent-chat`
> Data: `2026-06-16`

## Tabela de Impacto

| Arquivo afetado | Componente | Tipo | Severidade | Justificativa |
|---|---|---|---|---|
| `java-core/src/main/resources/db/migration/V5__add_agents_and_rag_isolation.sql` | PostgreSQL Schema | `delta-de-dados` | MEDIUM | Adiciona tabela `agents` e colunas `agent_id` em `documents` e `conversations`. |
| `java-core/src/main/java/com/company/core/domain/entities/Agent.java` | Core Domain (Entities) | `componente-novo` | MEDIUM | Representa a entidade do agente de IA com suas instruções do sistema e caminho do ZIP. |
| `java-core/src/main/java/com/company/core/domain/repositories/AgentRepository.java` | Core Domain (Repositories) | `componente-novo` | MEDIUM | Fornece persistência e busca de agentes por tenant. |
| `java-core/src/main/java/com/company/core/domain/entities/Document.java` | Core Domain (Entities) | `regra-alterada` | MEDIUM | Associa documentos ao ID de um agente específico. |
| `java-core/src/main/java/com/company/core/domain/entities/Conversation.java` | Core Domain (Entities) | `regra-alterada` | MEDIUM | Associa conversas ao ID de um agente específico. |
| `java-core/src/main/java/com/company/core/interfaces/rest/AgentController.java` | REST Controllers | `componente-novo` | HIGH | Endpoints `/api/admin/agents` (POST) e `/api/agents` (GET) expostos. |
| `java-core/src/main/java/com/company/core/interfaces/rest/DocumentController.java` | REST Controllers | `componente-novo` | HIGH | Endpoints `/api/documents/upload` (POST) e `/api/documents` (GET) expostos. |
| `java-core/src/main/java/com/company/core/interfaces/rest/ChatController.java` | REST Controllers | `componente-novo` | HIGH | Endpoints `/api/chats` (POST/GET) e `/api/chats/{id}/messages` (GET) expostos. |
| `rust-services/rag-worker/src/rabbitmq.rs` | RAG Worker (Rust) | `regra-alterada` | HIGH | Modifica busca por similaridade vetorial para filtrar por `agent_id` e recupera `system_instructions` da tabela `agents`. |
| `java-core/src/main/java/com/company/core/application/AuditService.java` | Audit Logs | `componente-novo` | MEDIUM | Orquestra gravação de auditorias de agentes, chat e uploads no banco de dados. |

## Diff Conceitual por Componente

* **Orquestrador Central Relacional (Spring Boot):**
  * Desenvolvidos novos controllers e serviços para expor e manipular entidades `Agent`, `Document` e `Conversation` de forma integrada.
  * Atualização do esquema do banco de dados relacional via Flyway migration de forma retrocompatível, adicionando chave estrangeira opcional `agent_id` a chats/conversas e documentos.
  * Autenticação e requisições continuam mapeadas sem impactos colaterais, mas agora registram logs de auditoria estruturados na tabela `audit_logs`.

* **Pipeline RAG (Rust):**
  * O RAG Worker agora resolve dinamicamente o `agent_id` e o associa ao prompt do LLM usando as instruções de sistema salvas no banco de dados do respectivo agente.
  * Busca vetorial estendida para suportar joins de tabelas relacionais filtrando por `d.agent_id = ? OR d.agent_id IS NULL`.

## Preservadas

As seguintes regras de domínio do `_reversa_sdd/domain.md` permanecem inalteradas e válidas no sistema:

* **[DR01] Hierarquia de Papéis:** Mantido controle RBAC onde a criação de agentes exige privilégios de administrador (simulado e validado via endpoint `/admin/agents`), enquanto upload comum de documentos é livre para colaboradores comuns.
* **[DR03] Dimensionalidade Parametrizável de Vetores:** Mantida compatibilidade com modelo de embeddings parametrizado.
* **[DR04] Busca por Similaridade de Cosseno:** Mantida a distância cosseno HNSW para RAG.
* **[DR07] Restrição de Entrada no Firewall:** Sem modificações.
* **[DR08] Isolamento de Portas de Banco de Dados:** Sem modificações.

## Modificadas

A seguinte regra de domínio foi estendida/modificada com a evolução:

* **[DR02] Isolamento de Conversas:** Enriquecido para incluir o isolamento lógico por agente (`agent_id`), isolando não somente a nível de tenant/user mas restringindo as buscas RAG unicamente aos trechos do respectivo agente.
