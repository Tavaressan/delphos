# Frontend

> Template do arquivo `requirements.md`. Foca no QUE a unit faz, não no como.

## Visão Geral
O Frontend é uma Single Page Application construída com Next.js servindo a interface do usuário da plataforma Alfabra Vector. Provê interfaces ricas para chat (com streaming SSE), gerenciamento de agentes, tarefas agendadas (Cron) e aprovação humana (HITL).

## Responsabilidades
- Renderização do chat interativo para interações com Agentes (via SSE).
- Apresentação e captura de comandos na área "ConfirmCard" (Human-in-the-Loop).
- Gerenciamento de painéis administrativos (Integrações MCP, Skills Customizadas, Agentes).
- Visualização de metadados das tarefas em andamento.

## Regras de Negócio
- [Chat Genérico] A UI permite envio de mensagens sem especificar o `agentId` (chat genérico), suportado pelo backend. 🟢
- [Renderização Rica] O chat deve suportar formatação Markdown estrita e streaming SSE em tempo real, renderizando saídas de tools. 🟢
- [Segurança / Acessos] A visualização do Painel MCP e upload de agentes customizados restringe-se a usuários `ROLE_ADMIN` (tratado no backend, e mascarado na UI). 🟡
- [State Management] A arquitetura do código adere ao Clean Architecture na pasta `src/domain/`, onde entidades de negócio UI habitam (ex: `AgentExecution`, `Schedule`). 🟢

## Requisitos Funcionais

| ID | Requisito | Prioridade | Critério de Aceite |
|----|-----------|-----------|-------------------|
| RF-01 | Enviar Mensagens ao LLM | Must | A UI transmite o payload para POST /api/executions e entra em modo leitura via EventSource (SSE). |
| RF-02 | Human in the loop (HITL) | Must | Se status da execução for `WAITING_TOOL`, a UI exibe "ConfirmCard" travando outras ações. |
| RF-03 | Gestão de Agendamento (Cron) | Should | Usuário consegue criar e listar schedules periódicos de acionamento. |
| RF-04 | Upload de Zip do Agente | Must | A UI possui um formulário multipart para submeter o `.zip` da skill customizada. |

## Requisitos Não Funcionais

| Tipo | Requisito inferido | Evidência no código | Confiança |
|------|--------------------|---------------------|-----------|
| Performance | Renderização SSR com Next.js e Streaming | `frontend/package.json` | 🟢 |
| Segurança | Omissão de UI baseada em Role (Inferida na lógica da UI) | `frontend/src/use-cases/` (suposição) | 🟡 |
| Responsividade | Header com altura fixa (h-14) e cores de dark mode | Histórico Git (#113, #102) | 🟢 |

> Inferido a partir do código. Validar com equipe de operações.

## Critérios de Aceitação

```gherkin
Dado um usuário na tela principal do Chat
Quando ele envia uma mensagem sem informar o agent_id
Então o backend recebe a requisição e a UI entra em modo de escuta (Loading/SSE) exibindo a resposta formatada em Markdown

Dado que uma execução em background travou no status WAITING_TOOL
Quando o frontend lê essa atualização
Então o chat apresenta o ConfirmCard bloqueando novos prompts até a decisão
```

## Prioridade (MoSCoW)

| Requisito | MoSCoW | Justificativa |
|-----------|--------|---------------|
| Componentes do Chat (SSE e Markdown) | Must | Caminho crítico e core do produto. |
| Fluxo de Aprovação Humana (HITL) | Must | Regra de negócio mandatória de segurança da API. |
| Painel de Agendamento | Should | Importante para automação, porém secundário em relação à navegação. |
| Edição visual de Tools MCP | Could | Usado raramente apenas por administradores. |

> Prioridade inferida por frequência de chamada e posição na cadeia de dependências.

## Rastreabilidade de Código

| Arquivo | Função / Classe | Cobertura |
|---------|-----------------|-----------|
| `frontend/src/domain/entities/index.ts` | Modelos centrais (AgentExecution) | 🟢 |
| `frontend/src/components/chat/*` | UI do Chat | 🟡 |
| `frontend/package.json` | Dependências (React/Next) | 🟢 |
