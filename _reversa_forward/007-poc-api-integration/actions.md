# Actions: Integração de PoC do Frontend com Backend Real

> Identificador: `007-poc-api-integration`
> Data: `2026-06-05`
> Roadmap: `_reversa_forward/007-poc-api-integration/roadmap.md`

## Resumo

| Métrica | Valor |
|---------|-------|
| Total de ações | 16 |
| Paralelizáveis (`[//]`) | 8 |
| Maior cadeia de dependência | 6 |

## Fase 1, Preparação

| ID | Descrição | Dependências | Paralelismo | Arquivo alvo | Confidência | Status |
|----|-----------|--------------|-------------|--------------|-------------|--------|
| T001 | Configurar a tipagem global TypeScript contendo ApiResponse, PaginatedResponse, ErrorResponse e enums do domínio. | - | `[//]` | `frontend/src/types/index.ts` | 🟢 | `[X]` |
| T002 | Criar as interfaces de entidades do domínio representing User, Agent, Document, Conversation, Message, e AgentExecution. | T001 | - | `frontend/src/domain/entities/index.ts` | 🟢 | `[X]` |
| T003 | Criar os DTOs de request/response para os endpoints SubmitExecution e GetExecution. | T001 | `[//]` | `frontend/src/domain/dto/index.ts` | 🟢 | `[X]` |
| T004 | Criar as interfaces abstratas dos repositórios (ports) IExecutionRepository e IDocumentRepository. | T002 | - | `frontend/src/domain/repositories/index.ts` | 🟢 | `[X]` |

## Fase 2, Testes

| ID | Descrição | Dependências | Paralelismo | Arquivo alvo | Confidência | Status |
|----|-----------|--------------|-------------|--------------|-------------|--------|
| T005 | Criar um arquivo de teste de fumaça unitário para garantir que o Next.js lê e expõe a variável de ambiente do backend. | - | `[//]` | `frontend/tests/smoke.test.js` | 🟢 | `[X]` |

## Fase 3, Núcleo

| ID | Descrição | Dependências | Paralelismo | Arquivo alvo | Confidência | Status |
|----|-----------|--------------|-------------|--------------|-------------|--------|
| T006 | Desenvolver o cliente HTTP apiClient utilizando o fetch nativo do Next.js com AbortController para timeout e tratamento de erros. | T003 | - | `frontend/src/infrastructure/api/apiClient.ts` | 🟢 | `[X]` |
| T007 | Criar o adaptador de domínio para mapeamento de payloads DTO de resposta para as entidades internas. | T002, T003 | `[//]` | `frontend/src/infrastructure/adapters/executionAdapter.ts` | 🟢 | `[X]` |
| T008 | Implementar o AuthProvider com contexto reativo simulando dados de sessão no localStorage de forma isolada. | T002 | `[//]` | `frontend/src/providers/AuthProvider.tsx` | 🟡 | `[X]` |
| T009 | Implementar os casos de uso de aplicação SubmitExecutionUseCase e GetExecutionStatusUseCase consumindo o apiClient. | T004, T006, T007 | - | `frontend/src/domain/use-cases/execution.ts` | 🟢 | `[X]` |

## Fase 4, Integração

| ID | Descrição | Dependências | Paralelismo | Arquivo alvo | Confidência | Status |
|----|-----------|--------------|-------------|--------------|-------------|--------|
| T010 | Decompor o monolito page.tsx para extrair os componentes de layout compartilhados Sidebar, Header e Footer. | - | `[//]` | `frontend/src/components/layout/index.ts` | 🟢 | `[X]` |
| T011 | Extrair componentes atômicos (Button, Input, Badge) e formulários (ChatInput, FileUploadArea) do monolito page.tsx. | T010 | - | `frontend/src/components/ui/index.ts` | 🟢 | `[X]` |
| T012 | Criar rotas físicas com Next.js App Router para /catalog, /knowledge-base, /design-system e /auth/login. | T010 | `[//]` | `frontend/src/app/layout.tsx` | 🟢 | `[X]` |
| T013 | Implementar o hook useExecution para orquestrar o envio do prompt de chat e o loop de polling a cada 2 segundos. | T009 | - | `frontend/src/hooks/useExecution.ts` | 🟢 | `[X]` |
| T014 | Conectar a timeline reativa de eventos e o histórico de mensagens do ChatCanvas à chamada real de API através do useExecution. | T011, T013 | - | `frontend/src/features/chat/ChatCanvas.tsx` | 🟢 | `[X]` |
| T015 | Implementar a lógica de health check no cabeçalho Header consumindo actuator/health a cada 30 segundos. | T006, T010 | - | `frontend/src/components/layout/Header.tsx` | 🟢 | `[X]` |

## Fase 5, Polimento

| ID | Descrição | Dependências | Paralelismo | Arquivo alvo | Confidência | Status |
|----|-----------|--------------|-------------|--------------|-------------|--------|
| T016 | Atualizar a documentação de onboarding incluindo detalhes da depuração de conectividade CORS no console. | T014 | `[//]` | `_reversa_forward/007-poc-api-integration/onboarding.md` | 🟢 | `[X]` |

## Notas de execução

Bateria completa de implementação concluída com absoluto sucesso. Todos os componentes do Next.js foram modularizados, as APIs integradas de forma reativa e compiladas sem erros.

## Histórico de alterações

| Data | Alteração | Autor |
|------|-----------|-------|
| 2026-06-05 | Versão inicial gerada por `/reversa-to-do` | reversa |
| 2026-06-05 | Status de todas as ações atualizados para concluídos (`[X]`) após implementação | reversa |
