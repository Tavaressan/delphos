# Frontend, Design Técnico

> Template do arquivo `design.md`. Foca no COMO a unit é construída, com base no código legado lido.

## Interface

Para o componente do Chat UI (Next.js):

| Símbolo | Assinatura | Retorno | Observação |
|---------|-----------|---------|------------|
| `ChatWidget` | `(agentId?: string)` | `React.ReactNode` | Renderiza SSE stream, se agentId nulo opera em modo genérico. |
| `ConfirmCard` | `(executionId: string, action: string)` | `React.ReactNode` | Renderiza modal HITL travando execução. |

## Fluxo Principal (Chat Streaming SSE)
1. O usuário digita um prompt no `ChatWidget`.
2. A UI faz um HTTP POST para `/api/executions` no backend Java.
3. O backend retorna `200 OK` e um `executionId`.
4. A UI abre uma conexão EventSource (SSE) no backend passando o `executionId`.
5. O `ChatWidget` acumula os bytes e renderiza Markdown em tempo real enquanto o LLM pensa.

## Fluxos Alternativos
- **[HITL Acionado]:** O frontend recebe evento `WAITING_TOOL`. Ele pausa o input de chat, exibe `ConfirmCard` pedindo Yes/No para aprovar.
- **[Timeout de Conexão SSE]:** Ocorrem retries automáticos limitados no browser.

## Dependências
- [Backend Java Core], [API POST /api/executions e SSE]
- [TailwindCSS], [Estilos globais, dark mode, responsividade header]
- [React Markdown], [Renderização rica das mensagens do agente]

## Decisões de Design Identificadas

| Decisão | Evidência no código | Confiança |
|---------|---------------------|-----------|
| Clean Architecture nas entidades da UI (domínio em `src/domain/`) | Estrutura de pastas analisada | 🟢 |
| Chat Genérico Opcional no fallback do React | ADR-001 e commits recentes | 🟢 |

## Estado Interno
Uso de context providers e hooks (`useChat`, `useState`) para manter o payload parcial do SSE antes do término da stream.

## Observabilidade
- A UI pode logar telemetria ou capturar erros em blocos de Error Boundary no Next.js (🟡 inferido).

## Riscos e Lacunas
- 🟢 Autenticação não implementada (prevista no roadmap).
- 🟡 Suposição de que roles são omitidas por claims JWT recebidos no cliente.
