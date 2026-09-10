# Frontend

## Visão Geral
Aplicação Single Page Application (SPA) desenvolvida em Next.js (com suporte ao runtime Deno e Tailwind CSS v4) responsável pela interface do usuário. Permite chat com agentes, gerenciamento do catálogo de agentes e upload de base de conhecimento.

## Responsabilidades
- Prover interface de chat iterativo em tempo real via Server-Sent Events (SSE).
- Gerenciar catálogo de agentes (upload de ZIPs, ativação, desativação).
- Fazer upload de documentos para a Base de Conhecimento RAG.
- Controlar agendamentos (Schedules).
- Gerenciar configurações locais (MCP Servers) e Internacionalização (i18n).

## Regras de Negócio
- Arquivos de Agentes só podem ser submetidos no formato ZIP estruturado. 🟢
- O chat faz fallback para uma API padrão se não houver backend customizado definido. 🟡
- O polling de atualização da Base de Conhecimento roda a cada 3 segundos caso existam documentos nos estados `UPLOADING` ou `PROCESSING`. 🟢

## Requisitos Funcionais

| ID | Requisito | Prioridade | Critério de Aceite |
|----|-----------|-----------|-------------------|
| RF-01 | Enviar mensagens de chat | Must | O streaming SSE deve preencher a resposta progressivamente no canvas. |
| RF-02 | Upload de Agentes | Must | Validação prévia de `.zip` obrigatório (rejeita `.md`). |
| RF-03 | Upload de Documentos KB | Must | Exibir barra de progresso e atualizar a grid. |
| RF-04 | Internacionalização | Should | Suporte pleno a alternância entre `pt-BR` e `en` no painel. |

## Requisitos Não Funcionais

| Tipo | Requisito inferido | Evidência no código | Confiança |
|------|--------------------|---------------------|-----------|
| Performance | Execução nativa no Deno | `next.config.js` / ADR-001 | 🟢 |
| Segurança | CSP (Content Security Policy) no-report | `next.config.js` | 🟢 |
| Usabilidade | Suporte a Viewport Mobile via Playwright | `tests/` E2E gate de mobile | 🟢 |
| Resiliência | API Error Handler unificado encapsulando HTTP status | `apiClient.ts` | 🟢 |

> Inferido a partir do código. Validar com equipe de operações.

## Critérios de Aceitação

```gherkin
Dado que o usuário está na tela de Catálogo
Quando tenta fazer upload de um arquivo `.md` direto
Então a interface exibe erro de validação "Formato inválido, envie um .zip"

Dado que a resposta do agente é longa
Quando o backend inicia a transmissão via SSE
Então a bolha de chat preenche texto sem travar a thread principal da UI
```

## Prioridade (MoSCoW)

| Requisito | MoSCoW | Justificativa |
|-----------|--------|---------------|
| Chat via SSE | Must | Acesso primário da IA pelo usuário |
| Catálogo ZIP | Must | Bloqueio de lixo e erros do usuário |
| Internacionalização (i18n) | Should | Diferencial competitivo, não essencial para funcionar |
| Mobile Viewport | Could | Importante, mas backend e engine IA funcionam independente disso |

> Prioridade inferida por frequência de chamada e posição na cadeia de dependências.

## Rastreabilidade de Código

| Arquivo | Função / Classe | Cobertura |
|---------|-----------------|-----------|
| `frontend/src/app/chat/ChatCanvas.tsx` | `handleSend` / SSE | 🟢 |
| `frontend/src/app/knowledge/KnowledgeBasePage.tsx` | `handleFileSelect` | 🟢 |
| `frontend/src/utils/apiClient.ts` | `ApiError` | 🟢 |
