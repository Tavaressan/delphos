# Frontend, Design Técnico

## Interface

### Endpoints (APIs consumidas via `apiClient`)
| Método | Caminho | Entrada | Saída | Status codes |
|--------|---------|---------|-------|--------------|
| POST | `/api/chat/stream` | `{ prompt, agentId }` | `Stream (SSE)` | 200, 400 |
| GET | `/api/agents` | - | `Agent[]` | 200 |
| POST | `/api/agents/upload` | `FormData (ZIP)` | `Agent` | 201, 409, 415 |
| POST | `/api/knowledge/upload` | `FormData (PDF, DOCX)`| `Document` | 201, 400 |

### Componentes Chave React
| Símbolo | Assinatura / Props | Retorno | Observação |
|---------|-----------|---------|------------|
| `ChatCanvas` | `(agentId: string, initialConversation?: string)` | `JSX.Element` | Gerencia estado de `useStreamingMessage` |
| `KnowledgeBasePage` | `()` | `JSX.Element` | Grid, ordenação local e polling condicional (3s) |
| `apiClient` | `fetch(url, options)` | `Promise<T>` | Wrapper com ErrorResponse unificado |

## Fluxo Principal
1. **Chat via SSE**: 
   - Usuário digita prompt no `ChatCanvas`. 
   - `handleSend` invoca `useStreamingMessage`.
   - Conexão SSE é aberta contra o backend.
   - Pedaços de string vão preenchendo o balão de resposta incrementalmente sem bloquear o Event Loop (Next.js/Deno).
2. **Upload de KB**: 
   - `handleFileSelect` cria `FormData` e envia arquivo `.pdf`.
   - Lista renderiza novo doc com status `UPLOADING`.
   - Effect dispara `setInterval(3000)` chamando `GET /api/knowledge` repetidamente até todos saírem de `PROCESSING/UPLOADING`.

## Fluxos Alternativos
- **Upload de ZIP Inválido:** Regex `validateAgentZipFileName` rejeita no próprio cliente e cancela o POST.
- **Erro de Conexão no SSE:** A conexão cai ou dá timeout. `ApiError` converte para notificação de perigo (toast) e restabelece botão de re-tentativa.

## Dependências
- **React / Next.js App Router**: Framework base (`layout.tsx`, `page.tsx`, `error.tsx`).
- **Tailwind CSS v4**: Motor de estilização.
- **Lucide Icons**: Pacote inferido pela taxonomia visual.

## Decisões de Design Identificadas

| Decisão | Evidência no código | Confiança |
|---------|---------------------|-----------|
| API Wrapper centralizado que converte falhas HTTP em `ApiError` | `src/utils/apiClient.ts` | 🟢 |
| Deno Runtime para edge render e melhor boot time | `next.config.js` | 🟢 |
| CSP (Content Security Policy) em report-only mode | `next.config.js` | 🟢 |
| Fallback dinâmico para `http://localhost:8000` via `NEXT_PUBLIC_BACKEND_URL` | `apiClient` defaults | 🟢 |

## Estado Interno
- **Sessão de Conversa (`activeConversationId`)**: Inicialmente falhava ao persistir (Issue #233), agora armazenada e amarrada à navegação via query params/contexto global.
- **Ordenação Local (`kbSortField`)**: Mantido em state local `[nome, tamanho, data]` e filtro textual, processado in-memory.

## Observabilidade
O frontend possui error boundaries nativos do Next.js (`error.tsx`, `not-found.tsx`, `global-error.tsx`).

## Riscos e Lacunas
- 🟢 O roteamento do chat mantém histórico utilizando Edge Cache integrado ao Next.js Data Cache, com os dados sendo devidamente persistidos em volumes Docker como backend de storage.
- 🟡 Supõe-se que a internacionalização (i18n) em `hook useI18n` use JSONs estáticos carregados no bundle inicial.
