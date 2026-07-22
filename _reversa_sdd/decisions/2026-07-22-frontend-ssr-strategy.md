# Decisão Arquitetural: Estratégia de Renderização do Frontend (SSR vs Client-Only)

## Contexto e Problema
O frontend da aplicação Alfabra-Vector, construído com Next.js (App Router), adotou indiscriminadamente o uso de `'use client'` no topo de todas as rotas da aplicação (ex: `catalog`, `profile`, `settings`, etc.). Isso resultou em perda dos principais benefícios do framework, tais como:
- Ausência de metadados estáticos e dinâmicos (`metadata` e `generateMetadata`) o que afeta negativamente o SEO corporativo e a usabilidade em compartilhamentos de links.
- Falta de *Server Components* e ausência de renderização inicial no servidor (SSR), o que causou atraso na percepção de desempenho (TTFB e LCP) devido à dependência excessiva de `useEffect` no lado cliente para buscar todos os dados iniciais, frequentemente dependentes da hidratação completa da árvore do React.
- Não utilização de estados de carregamento nativos do Next.js (como `loading.tsx`), dependendo de spinners e lógicas imperativas distribuídas por toda a UI.

Havia uma indefinição (lacuna crítica apontada no relatório de confiança) sobre qual deveria ser a abordagem oficial adotada.

## Decisão
Decidiu-se pela adoção de **SSR Seletivo (Componentes de Servidor por Padrão)**.

A estratégia consistirá nas seguintes diretrizes obrigatórias para novas telas ou refatorações:
1. **Rotas (pages.tsx)** devem ser, preferencialmente, Server Components. Toda definição de metadados (`export const metadata`) e a estrutura estática inicial deve ser feita na rota principal.
2. **Separação de Componentes Cliente/Servidor:** A lógica altamente iterativa e de estados dependentes do navegador ou contexto global de autenticação baseada no lado do cliente será movida para componentes "Folha" (ex.: `*Client.tsx`).
3. **Data Fetching:** Se a informação não depender estritamente de tokens isolados no localStorage que não podem ser lidos pelo servidor, a rota pode fazer a busca inicial via `fetch` no servidor, passando esses dados iniciais via `props` para os componentes filhos interagirem e se hidratarem (hydration).
4. **Estados de Carregamento:** Adoção de `loading.tsx` e UI Skeletons de forma progressiva.

## Consequências

**Positivas:**
- Resolução da lacuna de arquitetura listada no relatório de confiança (`confidence-report.md`).
- Melhoria progressiva de LCP e First Contentful Paint.
- Restauração de títulos, descrições e SEO para as páginas da aplicação.
- A divisão clara entre componentes de Servidor e Cliente organiza melhor o escopo de segurança e as fronteiras da rede.

**Negativas / Riscos:**
- Esforço contínuo de refatoração, exigindo quebrar `page.tsx` legadas (como `catalog/page.tsx`) em `page.tsx` + `CatalogClient.tsx`.
- Necessidade de adaptar a forma como a autenticação é tratada para permitir SSR em cenários que exijam dados protegidos de forma isomórfica (ex: cookies vs localStorage).
