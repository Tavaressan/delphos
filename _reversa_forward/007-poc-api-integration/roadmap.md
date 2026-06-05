# Roadmap: Integração de PoC do Frontend com Backend Real

> Identificador: `007-poc-api-integration`
> Data: `2026-06-05`
> Requirements: `_reversa_forward/007-poc-api-integration/requirements.md`
> Confidência: 🟢 CONFIRMADO, 🟡 INFERIDO, 🔴 LACUNA

## 1. Resumo da abordagem

A abordagem técnica consiste em reestruturar o monolito mockado `frontend/src/app/page.tsx` de 1109 linhas nas camadas limpas de Clean Architecture já scaffoldadas no projeto (`components/`, `domain/`, `features/`, `infrastructure/`). 
Será implementado um cliente HTTP centralizado (`apiClient.ts`) com `fetch` nativo para ler a variável de ambiente `NEXT_PUBLIC_BACKEND_URL`. A integração funcional do PoC focará no envio do prompt de chat para o endpoint do backend Java `POST /api/executions` e polling periódico assíncrono de status em `GET /api/executions/{id}` a cada 2 segundos. A tela de chat monitorará o processamento em tempo real através de uma timeline de status, finalizando ao receber `COMPLETED` ou `FAILED`. O monitoramento de conectividade do backend será feito no indicador do cabeçalho via consultas a `/actuator/health`.

## 2. Princípios aplicados

n/a (nenhum arquivo `.reversa/principles.md` definido no projeto)

## 3. Decisões técnicas

| ID | Decisão | Justificativa | Alternativas descartadas | Confidência |
|----|---------|----------------|--------------------------|-------------|
| D-01 | Usar `fetch` nativo no Next.js | Mantém o bundle size leve e permite caching nativo do Next.js sem inchar com bibliotecas extras. | Axios (descartado pelo tamanho de dependência extra). | 🟢 CONFIRMADO |
| D-02 | Polling periódico de 2 segundos para execuções | Mecanismo robusto e simples para obter o resultado do processamento assíncrono para o PoC sem a complexidade de gerenciar WebSockets/SSE. | SSE e WebSockets (descartados para simplificar o backend no PoC). | 🟢 CONFIRMADO |
| D-03 | Mantenimento de mocks em memória local para Documentos e Agentes | O backend ainda não possui endpoints CRUD para indexação de documentos e cadastro de agentes nesta fase do projeto. | Integração direta com MinIO/PostgreSQL sem passar pelo backend (inviável por questões de segurança e escopo). | 🟢 CONFIRMADO |

## 4. Premissas

n/a (todas as dúvidas levantadas na etapa de Requisitos foram sanadas por meio de análise direta do código-fonte do backend).

## 5. Delta arquitetural

| Componente | Arquivo de origem no legado | Tipo de mudança | Resumo |
|------------|------------------------------|-----------------|--------|
| `page.tsx` | `frontend/src/app/page.tsx` | regra-alterada | Decomposição do monolito de 1109 linhas nas pastas modulares correspondentes. |
| `apiClient.ts` | `n/a` | componente-novo | Cliente HTTP unificado utilizando o `fetch` nativo. |
| Rotas físicas do App Router | `n/a` | contrato-novo | Criação de rotas dedicadas para `/catalog`, `/knowledge-base`, `/design-system` e `/auth/login` com layout estruturado compartilhado. |

## 6. Delta no modelo de dados

- Resumo das mudanças: Adição de tipagem TypeScript estrita no frontend representando as entidades relacionais (User, Agent, Document, Conversation, Message, AgentExecution) baseadas nas tabelas do PostgreSQL e nos payloads JSON do Spring Boot.
- Detalhe completo em: `_reversa_forward/007-poc-api-integration/data-delta.md`

## 7. Delta de contratos externos

| Contrato | Tipo | Arquivo de detalhe |
|----------|------|--------------------|
| `/api/executions` | HTTP | `_reversa_forward/007-poc-api-integration/interfaces/api-executions.md` |
| `/actuator/health` | HTTP | `_reversa_forward/007-poc-api-integration/interfaces/actuator-health.md` |

## 8. Plano de migração

n/a (projeto greenfield/PoC de frontend sem necessidade de migração de persistência de dados no cliente).

## 9. Riscos e mitigações

| Risco | Impacto | Probabilidade | Mitigação |
|-------|---------|---------------|-----------|
| Instabilidade do endpoint de backend público DuckDNS | alto | média | Implementar tratamento robusto de timeouts (via `AbortController`) no `apiClient.ts` e aviso offline visual para o usuário. |
| Polling repetitivo sobrecarregar o container do Spring Boot | médio | baixo | Limitar o número máximo de requisições de polling consecutivos por execução (ex: máximo 60 tentativas / 2 minutos) antes de marcar como timeout. |

## 10. Critério de pronto

- [ ] Todas as ações do `actions.md` marcadas `[X]`
- [ ] `regression-watch.md` gerado
- [ ] Construção e build local do frontend Next.js concluídos sem erros de tipagem strict do TypeScript.

## 11. Histórico de alterações

| Data | Alteração | Autor |
|------|-----------|-------|
| 2026-06-05 | Versão inicial gerada por `/reversa-plan` | reversa |
