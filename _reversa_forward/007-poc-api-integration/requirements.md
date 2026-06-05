# Requirements: Integração de PoC do Frontend com Backend Real

> Identificador: `007-poc-api-integration`
> Data: `2026-06-05`
> Pasta da extração reversa: `_reversa_sdd/`
> Confidência: 🟢 CONFIRMADO, 🟡 INFERIDO, 🔴 LACUNA / DÚVIDA

## 1. Resumo executivo

Esta feature realiza a migração do console frontend monolítico mockado da Alfabra Vector para uma arquitetura modular limpa e funcional integrada ao backend real. O objetivo principal é viabilizar o envio de execuções de prompts via API REST, monitorando o processamento assíncrono em tempo real por meio de status polling. Além disso, estruturar a base das camadas de Domínio, Infraestrutura, Componentes e Features para futuras evoluções, habilitando o deploy seguro na Vercel conectado ao ambiente de contêineres local.

## 2. Contexto a partir do legado

A feature baseia-se na estrutura do monorepo e no mapeamento de segurança do controle de acesso (RBAC) e infraestrutura do Caddy:

| Fonte | Trecho relevante | Confidência |
|-------|------------------|-------------|
| `_reversa_sdd/architecture.md#2.-tecnologias-empregadas` | O frontend usa Next.js (14.2.3), React e Tailwind CSS. O backend é baseado em Java 17/21 + Spring Boot (3.2.5). O Caddy gerencia o TLS automático via DuckDNS. | 🟢 CONFIRMADO |
| `_reversa_sdd/domain.md#2.1.-controle-de-acesso-(rbac)` | Definição da hierarquia de papéis `ROLE_ADMIN` e `ROLE_USER` para acesso e auditoria. | 🟢 CONFIRMADO |
| `_reversa_sdd/code-analysis.md#☕-2.-módulo:-java-core-(spring-boot-api)` | Esquema de tabelas do PostgreSQL (users, roles, permissions, documents, chunks, chats, messages, logs) e as configurações de inicialização/banco de dados. | 🟢 CONFIRMADO |

## 3. Personas e cenários de uso

| Persona | Objetivo | Cenário-chave |
|---------|----------|---------------|
| Colaborador / Usuário (`ROLE_USER`) | Interagir de forma fluida com a base de conhecimento através de execuções RAG com retorno em tempo real. | O usuário envia uma dúvida no chat, visualiza a progressão da execução e obtém a resposta sem bloqueio de tela. |
| Administrador (`ROLE_ADMIN`) | Garantir a integridade da conexão do frontend com o cluster Docker e acompanhar o estado do sistema. | O administrador visualiza um indicador verde de conectividade ("Online") no menu lateral confirmando que o backend está operacional. |

## 4. Regras de negócio novas ou alteradas

1. **RN-01 (Bypass de Autenticação para PoC):** O frontend deve emular o controle de sessão de forma local através do `AuthProvider` persistido em `localStorage`, permitindo operações sem barreira até que o backend implemente a segurança de JWT. 🟢
   - Origem no legado: `n/a`
   - Tipo: nova
2. **RN-02 (Polling de Status de Execução):** Após a criação de uma execução, o frontend deve realizar requisições periódicas a cada 2 segundos no endpoint `GET /api/executions/{id}`. O polling só cessa quando o status for final (`COMPLETED` ou `FAILED`). 🟢
   - Origem no legado: `_reversa_sdd/code-analysis.md#☕-2.-módulo:-java-core-(spring-boot-api)`
   - Tipo: nova
3. **RN-03 (Indicador Visual de Health Check):** O frontend deve verificar a conectividade do backend via `GET /actuator/health` a cada 30 segundos, exibindo visualmente se o sistema está online ou offline. 🟢
   - Origem no legado: `_reversa_sdd/domain.md#2.2.-pipeline-rag-e-processamento`
   - Tipo: nova

## 5. Requisitos Funcionais

| ID | Requisito | Prioridade | Critério de aceite | Confidência |
|----|-----------|------------|--------------------|-------------|
| RF-01 | Componentização do monolito `page.tsx` para as pastas limpas (`components/`, `domain/`, `features/`, `infrastructure/`). | Must | O arquivo `page.tsx` original deve conter menos de 100 linhas, apenas importando layouts e páginas modulares. | 🟢 CONFIRMADO |
| RF-02 | Cliente de API unificado utilizando `fetch` nativo com interceptores e tratamento de timeouts e erros HTTP (4xx e 5xx). | Must | O cliente deve ler `NEXT_PUBLIC_BACKEND_URL` e injetar dinamicamente as URLs corretas de forma segura. | 🟢 CONFIRMADO |
| RF-03 | Integração do chat com o endpoint `POST /api/executions` e polling assíncrono `GET /api/executions/{id}`. A tipagem do DTO deve prever os campos: `executionId`, `status`, `prompt`, `output`, `errorMessage`, `tokensConsumed`, `startedAt` e `finishedAt`. | Must | A UI deve exibir o status de execução atual (enviado, em processamento, completado) durante o polling. | 🟢 CONFIRMADO |
| RF-04 | Roteamento do console em subpáginas físicas (`/catalog`, `/knowledge-base`, `/design-system`, `/auth/login`). | Should | Usuários navegando por abas devem ter URLs atualizadas em vez de alteração puramente lógica de estado do React. | 🟢 CONFIRMADO |
| RF-05 | Health check visual no cabeçalho ou barra lateral consultando `GET /actuator/health`. | Must | A UI exibe um indicador verde/vermelho baseado no status do backend. | 🟢 CONFIRMADO |
| RF-06 | Provider de Autenticação (`AuthProvider`) simulando sessão local em `localStorage`. | Should | Ao logar localmente, o frontend guarda a persona e o tenant fictícios prontos para o fluxo JWT futuro. | 🟡 INFERIDO |

## 6. Requisitos Não Funcionais

| Tipo | Requisito | Evidência ou justificativa | Confidência |
|------|-----------|----------------------------|-------------|
| Desempenho | O frontend não deve utilizar a biblioteca Axios, otimizando o bundle size na Vercel com o uso do `fetch` nativo. | Restrição técnica do projeto para maximizar a performance e tempo de carregamento. | 🟢 CONFIRMADO |
| Segurança | O cliente HTTP `apiClient.ts` deve possuir estrutura extensível para inclusão de headers Bearer JWT no futuro. | Garantir evolução arquitetural limpa para quando a autenticação do Spring Boot for habilitada. | 🟡 INFERIDO |
| Escalabilidade | Desacoplamento de modelos da API usando mapeamento DTO <-> Entity nas camadas do domínio. | Evitar que alterações na API quebrem a estrutura interna do frontend. | 🟡 INFERIDO |

## 7. Critérios de Aceitação

```gherkin
Cenário: Enviar prompt no chat e acompanhar execução
  Dado que o usuário está autenticado localmente na tela de Chat
  Quando ele digita "Qual é a política de reembolso da empresa?" e envia
  Então o frontend realiza a requisição POST para "/api/executions"
  E exibe a timeline de progresso no estado inicial
  Quando o backend inicia a execução
  Então o frontend faz polling a cada 2 segundos no endpoint "/api/executions/{id}"
  E ao receber o status "COMPLETED", encerra o polling e renderiza a resposta retornada.

Cenário: Perda de conexão com o backend
  Dado que a API do backend está inacessível
  Quando o timer de verificação de saúde dispara a cada 30 segundos
  Então a requisição "/actuator/health" falha por timeout ou erro
  E o frontend altera o indicador visual no topo para "Desconectado" (vermelho).
```

## 8. Prioridade MoSCoW

| Item | MoSCoW | Justificativa |
|------|--------|---------------|
| RF-01 | Must | Necessário para organizar a arquitetura e remover o monolito complexo de 1109 linhas. |
| RF-02 | Must | Requisito básico para estabelecer comunicação limpa com o backend. |
| RF-03 | Must | Fluxo principal do PoC (chat funcional com dados reais). |
| RF-05 | Must | Essencial para validar a conectividade segura frontend-backend via DuckDNS e HTTPS. |
| RF-04 | Should | Melhora a UX e a estrutura do App Router. |
| RF-06 | Should | Prepara o fluxo de login de forma isolada sem travar o desenvolvimento do PoC. |
| RNF Desempenho | Must | Evita inchaço de dependências no frontend. |
| RNF Segurança | Should | Garante alinhamento futuro com a segurança corporativa. |

## 9. Esclarecimentos

### Sessão 2026-06-05
- **Q:** Qual o formato exato e os campos do payload JSON retornados por `GET /api/executions/{id}` para montarmos a tipagem do DTO de resposta?
  **R:** O endpoint retorna um objeto com `executionId` (UUID), `status` (String: QUEUED, REQUESTED, COMPLETED, FAILED, etc.), `prompt` (String), `output` (String ou null), `errorMessage` (String ou null), `tokensConsumed` (Integer ou null), `startedAt` (ISO-8601 ou null) e `finishedAt` (ISO-8601 ou null).
- **Q:** O backend aceita requisições CORS anônimas com Caddy e HTTPS vindas do domínio Vercel para todos os endpoints do PoC?
  **R:** Sim. Conforme verificado na classe `SecurityConfig.java` do backend Spring Boot, os domínios `https://alfabra-vector.vercel.app` e `http://localhost:3000` estão explicitamente liberados via `setAllowedOrigins`, e todos os endpoints estão liberados anonimamente via `anyRequest().permitAll()`.
- **Q:** Há dados mockados residuais no frontend que devem ser preservados em memória local (ex: catálogo de agentes ou base de conhecimento) até que os CRUDs do backend sejam expostos?
  **R:** Sim. Os dados de `INITIAL_AGENTS` e `INITIAL_DOCS` mapeados no monolito `page.tsx` devem ser mantidos no estado local (ou persistidos localmente) do frontend para renderizar o catálogo de agentes e a base de conhecimento de forma provisória no PoC.

## 10. Lacunas

n/a

## 11. Histórico de alterações

| Data | Alteração | Autor |
|------|-----------|-------|
| 2026-06-05 | Versão inicial gerada por `/reversa-requirements` | reversa |
| 2026-06-05 | Resolução das dúvidas da sessão e integração com as regras de negócio | reversa |
