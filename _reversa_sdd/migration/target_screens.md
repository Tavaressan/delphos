# Especificação de Interface: Telas Modernizadas (Next.js)

Este documento especifica o comportamento, layout e os fluxos de navegação das principais telas da **Enterprise Agent Operating Platform** desenvolvidas em Next.js.

---

## 1. Tela: Login Unificado e Segurança
- **Objetivo:** Autenticar os usuários de forma segura.
- **Componentes Visuais:**
  - Formulário centralizado de login (`username` e `password`).
  - **CAPTCHA Visual:** Campo de validação integrado e persistido de forma temporária no Redis, obrigatório para mitigar ataques de força bruta.
  - **TOTP / MFA Verification:** Se a conta possuir a flag `twoFactorEnabled: true` herdada do LibreChat, exibe imediatamente um campo numérico de 6 dígitos solicitando o token autenticador antes de emitir o cookie de sessão JWT HTTPOnly.

---

## 2. Tela: Catálogo de Agentes e Governança
- **Objetivo:** Listar e permitir a gerência de agentes homologados para uso corporativo.
- **Componentes Visuais:**
  - **Lista de Agentes:** Visualização em formato Grid, com cartões exibindo nome do agente, versão (SemVer) e tags funcionais.
  - **Filtro por Tenant:** Exibe apenas agentes disponíveis para a organização logada do usuário.
  - **Painel de Publicação (ROLE_ADMIN):** Interface de revisão para que administradores aprovem ou rejeitem novos Agent Packages enviados via manifestos `manifest.yaml` (ciclo `IN_REVIEW` → `PUBLISHED`).

---

## 3. Tela: Console de Conversação e Monitoramento de Execuções
- **Objetivo:** Interface principal de chat interativo com suporte multiagente e monitoramento em tempo real do processamento de tarefas.
- **Componentes Visuais:**
  - **Chat Canvas:** Fluxo clássico de mensagens com suporte a renderização Markdown e blocos de código com destaque de sintaxe.
  - **Memory Sidebar:** Painel lateral que exibe em tempo real a extração dos 4 pilares da Memória de Longo Prazo da conversa (Preferências, Contexto, Regras e Metas) obtida de forma desacoplada dos workers.
  - **Execution Drawer (Timeline de Execução):** Uma gaveta colapsável que detalha os eventos assíncronos do RabbitMQ à medida que o agente cognitivo executa a tarefa:
    - *Timeline:* [REQUESTED] → [QUEUED] → [STARTED] → [THINKING] → [TOOL_RUNNING] → [COMPLETED].
    - Exibe os trechos de documentos exatos recuperados do banco PostgreSQL vetorial (`retrieval_event`) e os payloads das ferramentas disparadas (`tool_call`).

---

## 4. Tela: Gerenciador de Bases de Conhecimento e Upload
- **Objetivo:** Indexar novos documentos para o RAG.
- **Componentes Visuais:**
  - Área de *Drag-and-Drop* para upload de arquivos.
  - Validador em tempo real do tamanho e quantidade de arquivos baseados nos limites físicos da Base de Conhecimento (`KnowledgeEntity`), bloqueando localmente payloads inválidos antes do envio físico ao S3/MinIO.
  - Tabela com status do ciclo de indexação dos parágrafos dos documentos no PostgreSQL vetorial.
