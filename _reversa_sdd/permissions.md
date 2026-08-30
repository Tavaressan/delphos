# Matriz de Permissões e Segurança (RBAC)

## Papéis (Roles)

O sistema conta com dois níveis principais explícitos nos dicionários de dados do `frontend` e `java-core`:
1. `ROLE_USER`: Usuário final padrão (tenant-scoped).
2. `ROLE_ADMIN`: Administrador, geralmente capaz de gerenciar agentes, configurações (ex. MCP Servers) e usuários de seu tenant.

## Isolamento Multitenancy
- 🟢 **CONFIRMADO**: Todas as permissões abaixo só se aplicam aos dados dentro do mesmo `tenantId`. O cruzamento de tenants é estritamente proibido. Qualquer query de leitura/escrita valida o `tenantId` da sessão em injeção automática no Java Core e nos Workers Rust/Python.

## Matriz de Acesso

| Recurso | Ação | ROLE_USER | ROLE_ADMIN | Observação |
|---------|------|-----------|------------|------------|
| **Agentes** | Visualizar Catálogo | 🟢 Sim | 🟢 Sim | Apenas agentes publicados ou próprios |
| | Criar/Upload de ZIP | 🔴 Não | 🟢 Sim |  |
| | Editar Instruções | 🔴 Não | 🟢 Sim |  |
| | Publicar / Desativar | 🔴 Não | 🟢 Sim |  |
| **Execuções/Chats** | Enviar Prompts | 🟢 Sim | 🟢 Sim |  |
| | Cancelar Execução | 🟢 Sim | 🟢 Sim | Apenas suas próprias conversas |
| | Ver Histórico (`Conversation`) | 🟢 Sim | 🟢 Sim | Apenas suas próprias conversas |
| **Base de Conhecimento** | Listar/Ver Docs | 🟢 Sim | 🟢 Sim |  |
| | Fazer Upload de Documentos | 🔴 Não (Inferido) | 🟢 Sim | Apenas admin nutre o conhecimento |
| | Excluir Documento | 🔴 Não | 🟢 Sim | Apaga os chunks do vector DB |
| **Configurações MCP** | Cadastrar Servidor | 🔴 Não | 🟢 Sim |  |
| | Excluir Servidor | 🔴 Não | 🟢 Sim |  |
| **Agendamentos** | Criar Schedule | 🟢 Sim | 🟢 Sim |  |
| | Cancelar Schedule | 🟢 Sim | 🟢 Sim | Usuário pode agendar para si |
| **Auditoria** | Ver `AuditLog` | 🔴 Não | 🟢 Sim | Logs de segurança |

> **Nota de Confiança:** Esta matriz é 🟡 **INFERIDA** a partir do fluxo de controle e da natureza das entidades (Admin cadastra IA, User consome IA). Alguns privilégios podem variar dependendo das anotações `@PreAuthorize` exatas no Spring Boot.
