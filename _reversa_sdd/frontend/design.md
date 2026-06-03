# Frontend, Design Técnico

## Interface

### Estrutura de Rotas e Layouts (Next.js)

* **`/` (Painel/Dashboard):** Exibe a listagem de arquivos enviados e a caixa de chat com a inteligência artificial.
* **`/auth` (Autenticação):** Layout para telas de Login e Recuperação de Senha.

| Layout / Rota | Arquivo Físico | Componente / Função | Observação |
|---|---|---|---|
| Layout Raiz | `frontend/src/app/layout.tsx` | `RootLayout` | Controla classes de tema (`h-full bg-white dark:bg-gray-950`) e idioma (`lang="en"`). |
| Layout de Auth | `frontend/src/app/auth/layout.tsx` | `AuthLayout` | Centraliza os formulários de login na tela (`min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900`). |

---

## Fluxo Principal

### 1. Inicialização de Páginas e Tema
1. O navegador carrega a rota raiz.
2. O `RootLayout` (`frontend/src/app/layout.tsx`) é resolvido, injetando as variáveis de tema escuro/claro e configurando as fontes padrão.
3. Se o usuário tentar acessar rotas de autenticação `/auth/*`, o `AuthLayout` (`frontend/src/app/auth/layout.tsx`) encapsula os formulários aplicando a centralização flexbox.

---

## Dependências
* **Tailwind CSS:** Utilizado para estilização de modo escuro (`dark:bg-gray-950`, `dark:bg-gray-900`, `dark:text-gray-100`).
* **React / Next.js Framework:** Gerencia o ciclo de vida dos componentes e a renderização do lado do servidor (SSR) ou estática (SSG).

---

## Decisões de Design Identificadas

| Next.js App Router | Estrutura de arquivos em `frontend/src/app/` | 🟢 CONFIRMADO |
| Layouts Aninhados | Layout de login isolado em `frontend/src/app/auth/layout.tsx` | 🟢 CONFIRMADO |
| Suporte Nativo a Tema Escuro | Classes Tailwind `dark:bg-gray-*` nas tags de layout | 🟢 CONFIRMADO |
| Estratégia de Sessão e Auth | Auth.js com cookies HTTPOnly seguros | 🟢 CONFIRMADO (Confirmado pelo usuário) |

---

## Estrutura de Autenticação e Estado (Frontend Authentication)

O gerenciamento de sessões, credenciais e estados segue diretivas rígidas de segurança corporativa:

* **Estratégia de Sessão:** Auth.js (NextAuth.js) integrado via cookies HTTPOnly seguros (`access_token` e `refresh_token`), evitando armazenamento de JWT em `localStorage` ou variáveis de estado expostas em JS global.
* **Políticas dos Cookies:**
  * `HttpOnly=true` (inacessível via client JavaScript/XSS).
  * `Secure=true` (transmitido unicamente via HTTPS em produção).
  * `SameSite=Strict` (proteção CSRF).
* **Gerenciamento de Estado:**
  * **Sessão/Auth:** Auth.js (cookies seguros).
  * **Contexto de Usuário:** React Context API (dados derivados de sessão de leitura rápida).
  * **Estado de UI:** Zustand (opcional, restrito apenas a elementos visuais como menus, temas e filtros temporários de UI).
* **Fluxo de Refresh:** Renovação automática em middleware interceptor que detecta a expiração e atualiza os cookies por meio da chamada à API de backend `/auth/refresh`.

---

## Riscos e Lacunas
*(Nenhuma lacuna crítica pendente neste módulo)*
