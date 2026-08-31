# Frontend, Tarefas de Implementação

## Pré-requisitos
- [ ] API (Java Core Gateway) disponível e respondendo rotas HTTP e SSE
- [ ] Runtime configurado com Next.js v14+ e Deno
- [ ] Arquivos de tradução i18n providenciados

## Tarefas

- [ ] T-01, Estruturar layout compartilhado e componentes de navegação lateral.
  - Origem no legado: `frontend/src/app/layout.tsx` (Issue #239)
  - Critério de pronto: Componentes roteiam corretamente; layout se adapta bem no viewport mobile.
  - Confiança: 🟢

- [ ] T-02, Implementar wrapper de requisições base `apiClient`.
  - Origem no legado: `frontend/src/utils/apiClient.ts`
  - Critério de pronto: Chamadas usam `NEXT_PUBLIC_BACKEND_URL` fallback, capturam HTTP não-200 e lançam `ApiError`.
  - Confiança: 🟢

- [ ] T-03, Criar tela de Chat com Server-Sent Events (SSE).
  - Origem no legado: `frontend/src/app/chat/ChatCanvas.tsx`
  - Critério de pronto: Usuário escreve prompt, e o retorno pinga no cliente aos poucos sem lock da UI. Histórico usa o context `activeConversationId`.
  - Confiança: 🟢

- [ ] T-04, Criar página da Base de Conhecimento RAG.
  - Origem no legado: `frontend/src/app/knowledge/KnowledgeBasePage.tsx`
  - Critério de pronto: Grid suporta upload local, e polla a API `GET /api/knowledge` a cada 3s automaticamente até docs deixarem o status PROCESSING.
  - Confiança: 🟢

- [ ] T-05, Módulo de upload do agente (Catálogo).
  - Origem no legado: Componentes de Catálogo
  - Critério de pronto: Formulário recusa arquivos `.md` e `.py` soltos, só permitindo ZIP com limite de 20MB antes de chamar a API.
  - Confiança: 🟢

## Tarefas de Teste

- [ ] TT-01, Teste Playwright para UX Mobile de todos os layouts.
- [ ] TT-02, Teste garantindo que erro HTTP 409 (Conflito no ZIP) exibe toast vermelho amigável ao usuário.
- [ ] TT-03, Mocar streaming SSE local para garantir preenchimento de palavras no balão de chat sem quebra de HTML.

## Ordem Sugerida
1. T-02 (`apiClient`) -> base para tudo.
2. T-01 (Layout) -> shell estrutural da SPA.
3. T-03, T-04, T-05 -> desenvolvimento das features em paralelo (Chat, KB, Catálogo).

## Lacunas Pendentes (🔴)
- Estratégia de cache do Data Cache do Next.js precisa de revisão antes da refatoração para garantir não exibir conversas defasadas (staleness).
