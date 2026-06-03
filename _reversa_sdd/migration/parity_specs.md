# Especificações de Paridade Funcional

Este documento estabelece as regras e parâmetros de teste exigidos para validar a paridade de funcionalidades e a integridade da **Enterprise Agent Operating Platform** em comparação com os comportamentos mapeados nos legados.

---

## 1. Critérios de Paridade no Processamento de Tarefas

Toda execução executada pelos workers em Kubernetes deve respeitar as seguintes garantias de paridade:

### 1.1. Confiabilidade e Tempo Limite (Timeout)
- A execução de uma tarefa que envolva múltiplos agentes cognitivos (CrewAI) não pode ultrapassar o limite absoluto configurado no `manifest.yaml` (máximo **45 segundos**).
- Caso o runtime demore mais que o configurado, a tarefa deve ser abortada imediatamente, gravando o status `TIMEOUT` na tabela `agent_executions` e emitindo erro para o usuário.

### 1.2. Conformidade do Fluxo de Mensageria (RabbitMQ)
- A entrega de mensagens de tarefas deve seguir a semântica `at-least-once`.
- O processamento duplicado de mensagens devido a reentregas da fila deve ser evitado pelo validador de idempotência de transações (`execution_id` único no Postgres).

---

## 2. Auditoria e Rastreabilidade Obrigatória

O sistema de testes deve verificar se todas as seguintes informações são persistidas com sucesso ao final de qualquer job cognitivo:
- O identificador do agente e modelo de LLM consumidos.
- O prompt final enviado ao modelo cognitivo.
- O payload JSON completo das ferramentas disparadas (`tool_call`) e a resposta gerada.
- Os trechos exatos de texto de documentos recuperados do pgvector e as notas de similaridade de cosseno.

---

## 3. Matriz de Cobertura de Paridade

| Área de Funcionalidade | Cenário de Teste / Parâmetro de Aceitação | Origem da Regra | Status de Validação |
|---|---|---|---|
| **Segurança** | Autenticação rejeitada para hashes MD5. Login liberado apenas sob BCrypt com 2FA ativo se configurado. | MaxKB4j / LibreChat | 🟢 MANDATÓRIO |
| **Busca Híbrida** | Resultados combinados (vetores pgvector e texto FTS) ordenados por score decrescente com desempate por soma acumulada. | MaxKB4j | 🟢 MANDATÓRIO |
| **Sandbox Groovy** | Script contendo comandos reflexivos (ex: `.class`) ou demorando mais de 60s deve ser rejeitado com `SecurityException`. | MaxKB4j | 🟢 MANDATÓRIO |
| **Favoritos** | Tentativas de adicionar mais de 50 favoritos ou itens com campos mistos (ex: `agentId` e `model` juntos) devem ser rejeitados pela API. | LibreChat | 🟢 MANDATÓRIO |
