# ADR-001: Suporte a Chat Genérico (Agente Opcional)

## Status
Aceito (Retroativo)

## Contexto
Originalmente a arquitetura presumia que toda instrução seria direcionada a um `Agent` específico. No entanto, o histórico de commits (`c0c722c`, `4ad733d`, `bb77ae9`) demonstra um esforço concentrado em tornar o `agentId` opcional no fluxo da API e no Worker. Usuários queriam interagir livremente para testar ou realizar perguntas de propósito geral (sem contexto e restrições de um Persona).

## Decisão
Foi estabelecido que `POST /api/executions` pode receber payloads sem `agentId`. Quando isso ocorre, não será gerado um UUID fake. O campo no banco (JPA) e no RabbitMQ pode ser `null`.
No worker Python (`CrewAiRuntimeAdapter`), se `agent_id` é `null`, o sistema faz um "fallback" para prompts de sistema padrão ou age livremente, não requerendo busca na tabela `agents`.

## Alternativas consideradas
- Criar um Agente "Default" hardcoded no banco para todo Tenant e forçar o envio de seu ID. Rejeitado por demandar seed manual complexo e sujar o banco de dados.
- Bloquear a requisição no backend, exigindo seleção de agente. Rejeitado devido ao caso de uso válido de "chat geral" na UI.

## Consequências
- **Positivo:** A interface do usuário se tornou mais flexível (chat estilo ChatGPT).
- **Negativo:** Lógica extra necessária no RAG: `(d.agent_id = %s OR d.agent_id IS NULL)`. A busca de embeddings de propósito geral precisa competir (em similaridade) com buscas escopadas.
