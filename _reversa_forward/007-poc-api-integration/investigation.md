# Technical Investigation: Clean Architecture e HTTP Clients no Next.js

> Identificador da feature: `007-poc-api-integration`
> Data: `2026-06-05`
> Requirements: `_reversa_forward/007-poc-api-integration/requirements.md`

## 1. Pesquisa de Base

Esta investigação visa estabelecer as melhores práticas de implementação de clientes de API e de decomposição arquitetural no Next.js 14 App Router de acordo com as restrições e o ecossistema existente.

### 1.1. AbortController e Timeout Nativo com Fetch
Como não usaremos Axios, o suporte a timeouts em requisições de rede utilizando `fetch` requer a criação manual de sinais de cancelamento (`AbortController`). O fluxo típico é instanciar o controller, vincular o `signal` à requisição fetch e registrar um temporizador (`setTimeout`) que executa `controller.abort()` caso o limite seja atingido.
```typescript
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

try {
  const response = await fetch(url, { signal: controller.signal });
  // processamento
} finally {
  clearTimeout(timeoutId);
}
```

### 1.2. Estrutura Clean Architecture no Frontend
Desacoplar a lógica técnica da interface do usuário é um pilar da Clean Architecture. O mapeamento adotará as seguintes divisões físicas:
1. **Domain (Entities / DTOs / Repositories / Use Cases):** Contém puramente regras de negócios e interfaces de tipos. Não conhece detalhes de chamadas HTTP.
2. **Infrastructure (API Client / Adapters):** Implementa os repositórios reais e realiza a comunicação HTTP. Os adapters convertem o JSON retornado pela API (DTO) para o formato interno do aplicativo (Entity).
3. **Features (State / Layouts / Componentes de Negócio):** Contém layouts e páginas específicas de cada contexto (Ex.: Chat, Documentos) integrados por meio de hooks específicos (Ex.: `useChat`).
4. **Components (Atômicos / Formulários / Compartilhados):** Blocos puros de interface (botões, inputs, tabelas) sem estado de negócio acoplado.

---

## 2. Alternativas Avaliadas e Decisões

### 2.1. Axios vs Fetch Nativo
* **Axios (Descartado):**
  * *Prós:* Timeouts, interceptors e manipulação de erros simplificados de forma pronta.
  * *Contras:* Adiciona peso ao bundle JavaScript final e não integra nativamente com a engine de caching/deduplicação automática de requisições GET do Next.js 14.
* **Fetch Nativo (Escolhido):**
  * *Prós:* Sem peso extra de bundle, melhor integração com SSR (Server Side Rendering) do Next.js e compatibilidade imediata com a plataforma Vercel.
  * *Contras:* Requer codificação manual de interceptors de headers e controle de timeout.

### 2.2. Polling vs Server-Sent Events (SSE) / WebSockets para Timeline
* **SSE/WebSockets (Descartados para o PoC):**
  * *Prós:* Baixa latência e comunicação real-time otimizada.
  * *Contras:* Exige complexidade de infraestrutura no backend Spring Boot (gerenciamento de conexões abertas, persistência de canais e concorrência com RabbitMQ).
* **Polling HTTP (Escolhido):**
  * *Prós:* Extremamente simples de codificar e implementar. O endpoint `GET /api/executions/{id}` do Spring Boot já está exposto e retorna o estado atualizado.
  * *Contras:* Latência máxima de até 2 segundos entre a atualização do status no backend e a renderização no frontend. Aceitável para escopo de PoC.

---

## 3. Padrões Aplicáveis

- **Adapter Pattern:** Isolamento de payloads da API do backend Spring Boot em DTOs, convertendo-os para estruturas de domínio robustas. Isso impede que eventuais refatorações nas colunas do banco PostgreSQL ou chaves JSON quebrem as telas do frontend.
- **Hook-based Integration:** Isolar as lógicas de polling e controle de estado do chat dentro do hook `useExecution`, mantendo o componente UI (`ChatCanvas`) livre de código de rede e puramente focado em estilização e interações.
