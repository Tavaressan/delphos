# Frontend, Tarefas de Implementação

> Template do arquivo `tasks.md`. Foca em uma sequência de tarefas executáveis para reimplementar a unit a partir do legado, com rastreabilidade ao código original.

## Pré-requisitos
- [ ] Backend Java Core operante na API `/api/executions` (SSE).
- [ ] Variáveis de ambiente configuradas no `frontend/next.config.js`.

## Tarefas

- [ ] T-01, Mapear Entidades Clean Architecture (AgentExecution, Schedule, etc)
  - Origem no legado: `frontend/src/domain/entities/index.ts`
  - Critério de pronto: Interfaces/Classes refletindo UUID, status SSE e atributos.
  - Confiança: 🟢

- [ ] T-02, Implementar ChatWidget e Client SSE
  - Origem no legado: `frontend/src/components/chat/*`
  - Critério de pronto: EventSource recebendo chunks formatados via React Markdown. Fallback pra agentId nulo (Chat genérico).
  - Confiança: 🟡

- [ ] T-03, Implementar ConfirmCard (Human In The Loop)
  - Origem no legado: Commits recentes do painel `ConfirmCard` e `Tool Renderers` ricos.
  - Critério de pronto: Escuta `WAITING_TOOL`, bloqueia o prompt e exibe botão "Autorizar"/"Negar" que bate no endpoint de resposta da tool.
  - Confiança: 🟢

- [ ] T-04, Telas Administrativas (Agendamento, Agentes, MCP)
  - Origem no legado: Commits `#134` (Agendamento Cron), `#155` (Painel MCP), `#106` (Ocultar desativados).
  - Critério de pronto: CRUD de agentes customizados, envio de ZIP (multipart) e gestão de MCP visível só para `ROLE_ADMIN`.
  - Confiança: 🟢

## Tarefas de Teste

- [ ] TT-01, Teste do happy path do chat (SSE recebendo payload válido e renderizando).
- [ ] TT-02, Teste mockando status `WAITING_TOOL` e validando travamento do input de chat.
- [ ] TT-03, Teste de permissão: rota MCP falha ou omite menu se usuário for ROLE_USER.

## Ordem Sugerida
1. Entidades de Domínio (T-01) - Define contratos.
2. ChatWidget (T-02 e T-03) - Core do fluxo da UI.
3. Telas Administrativas (T-04) - Funcionalidades anexas de suporte.

## Lacunas Pendentes (🔴)
Falta confirmar os provedores de Autenticação na UI (NextAuth.js?) e se o `Role` fica no token ou sessão do servidor Next (App Router).
