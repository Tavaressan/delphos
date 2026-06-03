# Matriz de Permissões (RBAC)

Documento gerado pelo agente **Detective** para mapear os perfis de acesso, permissões e restrições de segurança do sistema.

---

## 1. Papéis de Usuário (Roles)

O sistema utiliza um modelo de Controle de Acesso Baseado em Papéis (RBAC) definido nas tabelas `roles`, `permissions`, `user_roles` e `role_permissions`:

1. **`ROLE_USER`:** Papel atribuído aos colaboradores padrão da organização. Permite a utilização das funcionalidades principais de consulta RAG e ingestão de documentos.
2. **`ROLE_ADMIN`:** Papel atribuído aos administradores do sistema. Permite acesso a painéis de auditoria, controle completo de usuários e administração dos documentos da plataforma.

---

## 2. Tabela de Permissões Granulares

| Permissão | Código Técnico | Descrição |
|-----------|----------------|-----------|
| **Visualizar Documentos** | `READ_DOCUMENTS` | Permite buscar trechos, listar documentos e utilizá-los no contexto das conversas (RAG). |
| **Indexar Documentos** | `WRITE_DOCUMENTS` | Permite realizar o upload de novos arquivos e iniciar o pipeline de extração de texto e geração de embeddings. |
| **Excluir Documentos** | `DELETE_DOCUMENTS` | Permite remover documentos fisicamente e apagar seus respectivos chunks do banco vetorial. |
| **Auditar Sistema** | `VIEW_AUDIT_LOGS` | Permite visualizar as ações executadas no sistema através da listagem e análise do log de auditoria. |
| **Gerenciar Usuários** | `MANAGE_USERS` | Permite criar, atualizar dados, resetar senhas ou banir/desativar usuários da plataforma. |

---

## 3. Matriz de Permissões (Roles vs Permissions)

A tabela abaixo cruza os papéis mapeados no banco com as respectivas permissões associadas:

| Código Técnico da Permissão | `ROLE_USER` | `ROLE_ADMIN` | Origem da Associação (Seed SQL) | Status de Confiança |
|-----------------------------|:-----------:|:------------:|----------------------------------|---------------------|
| `READ_DOCUMENTS` | ✅ | ✅ | `V1__init_schema.sql:130-131` | 🟢 CONFIRMADO |
| `WRITE_DOCUMENTS` | ✅ | ✅ | `V1__init_schema.sql:132-133` | 🟢 CONFIRMADO |
| `DELETE_DOCUMENTS` | ❌ | ✅ | `V1__init_schema.sql:134` | 🟢 CONFIRMADO |
| `VIEW_AUDIT_LOGS` | ❌ | ✅ | `V1__init_schema.sql:135` | 🟢 CONFIRMADO |
| `MANAGE_USERS` | ❌ | ✅ | `V1__init_schema.sql:136` | 🟢 CONFIRMADO |

---

## 4. Restrições e Lógicas Adicionais de Segurança

### 4.1. Isolamento de Dados Corporativos (Intranet)
* **Acesso Web Restrito:** Conforme as regras de firewall (`setup_firewall.sh`), o tráfego HTTP/HTTPS (portas 80/443) é restrito ao bloco IP da Intranet (`CORP_WHITELIST_RANGE`), impedindo acesso direto a partir da internet pública, a menos que o tráfego passe pela VPN/Rede corporativa.
* **Segurança Docker:** Os microsserviços do backend (Spring Boot), banco de dados (Postgres) e cache (Redis) operam exclusivamente dentro da rede interna de containers Docker, não expondo portas ao host externo.
* *Status:* 🟢 CONFIRMADO (extraído de `setup_firewall.sh` e `Caddyfile`).

### 4.2. Log de Auditoria Obrigatório
* **Rastreamento de Operações críticas:** A tabela `audit_logs` registra sistemicamente todas as ações importantes feitas por usuários autenticados (ex: `LOGIN`, `UPLOAD_DOCUMENT`, `QUERY_RAG`), capturando o IP de origem, o User-Agent do navegador e detalhes dinâmicos (JSONB).
* *Status:* 🟢 CONFIRMADO (extraído da estrutura da tabela `audit_logs` em `V1__init_schema.sql`).
