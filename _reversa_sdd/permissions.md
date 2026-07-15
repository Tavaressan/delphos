# Matriz de Permissões (RBAC)

> Gerado automaticamente pelo `reversa-detective`

O sistema possui duas entidades de controle primárias detectadas no `java-core` e `frontend`: `Role` e `Permission`. A presença de multilocação (`tenant_id` presente nas Queries e em `UserSession`) denota isolamento severo de dados.

## Papéis (Roles)

| Papel | Escopo | Descrição |
|-------|--------|-----------|
| `ROLE_USER` | Tenant Local | Usuário padrão da plataforma. Pode conversar, fazer upload de documentos no seu tenant e criar tarefas. |
| `ROLE_ADMIN` | Tenant Local / Global | Pode criar e deletar agentes, configurar parâmetros avançados (MCP, LLM Models) e gerir permissões. |

## Matriz (Inferida 🟡)

| Recurso / Funcionalidade | ROLE_USER | ROLE_ADMIN |
|--------------------------|-----------|------------|
| Conversar com Agentes | Ler/Escrever | Ler/Escrever |
| Listar Documentos | Ler | Ler |
| Submeter ZIP de Agente | Negado | Escrever |
| Aprovar ação (HITL) | Escrever | Escrever |
| Acessar Painel MCP | Negado | Ler/Escrever |
