# Regras de Negócio e Glossário de Domínio

> Gerado automaticamente pelo `reversa-detective`

## Glossário

* **Agente (Agent):** Uma persona cognitiva instanciada através do LLM com um *Role*, *Goal* e *Backstory* definidos.
* **Execução (AgentExecution):** Representa o ciclo de vida de uma instrução dada a um Agente. Pode ser acompanhada e auditada.
* **Conversa (Conversation):** O agrupador lógico de várias Execuções e Mensagens entre o Usuário e o Agente.
* **Tenant (TenantId):** Contexto multilocatário da plataforma (cada cliente/organização tem seu próprio `tenant_id` que isola a base de dados vetorial).
* **Chunk:** Um fragmento de texto (com embedding vetorizado) extraído de um `Document`.

## Regras de Negócio Implícitas (Extraídas do Código e Logs)

1. **Agente Opcional no Chat:** As requisições de execução (`POST /api/executions`) podem ocorrer sem informar um `agentId` específico. Neste caso, o sistema realiza uma conversa livre ou "chat genérico" acionando fallbacks padronizados no Crew-Worker. (🟢 CONFIRMADO)
2. **Segurança de Skills (Sandbox AST):** Quando um usuário faz upload de um Agente empacotado em ZIP, quaisquer scripts e `custom tools` em Python (pasta `tools/`) devem passar por uma validação restrita usando parser de AST (`sandboxed_script_tool`), não sendo executados caso invoquem bibliotecas proibidas. (🟢 CONFIRMADO)
3. **Pausa e HITL (Human-in-the-Loop):** Há fluxos de interface (`ConfirmCard HITL`) onde a máquina para de executar o workflow, requerendo autorização ou confirmação visual do usuário no frontend. (🟡 INFERIDO)
4. **Isolamento de Base de Conhecimento:** A query vetorial para o pgvector no `rag-worker` *sempre* inclui `tenant_id` como filtro hardcoded. Se `agent_id` for informado, traz documentos deste agente + documentos públicos (onde `agent_id IS NULL`). (🟢 CONFIRMADO)
