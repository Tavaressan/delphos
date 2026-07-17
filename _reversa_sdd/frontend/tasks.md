# Frontend, Tarefas de Implementação

## Pré-requisitos
- [ ] Tailwind CSS configurado no Next.js (compatível com classes do layout).
- [ ] Node.js v18+ instalado.

---

## Tarefas

- [ ] **T-01: Configuração do Root Layout**
  - Origem no legado: `frontend/src/app/layout.tsx`
  - Critério de pronto: O layout raiz carrega com suporte a HTML5, classes de tema claro/escuro (`bg-white` e `dark:bg-gray-950`) e renderiza os filhos (children) corretamente.
  - Confiança: 🟢 CONFIRMADO
  
- [ ] **T-02: Configuração do Layout de Autenticação**
  - Origem no legado: `frontend/src/app/auth/layout.tsx`
  - Critério de pronto: Componente encapsula subpáginas e centraliza elementos na tela com flexbox (`flex items-center justify-center`) com suporte a background condicional para tema escuro.
  - Confiança: 🟢 CONFIRMADO

---

## Lacunas Pendentes (🔴)
- 🔴 Como é feito o refresh do token de autenticação e a persistência da sessão no client side. -> (Respondido: JWT e RBAC ainda não foram implementados. Reclassificado como 🟢 ausência confirmada)

---

## Tarefas de Teste

- [ ] **TT-01: Teste de carregamento do layout raiz**
  - Validar se a tag `<html>` possui a classe `h-full` e `lang="en"`.
- [ ] **TT-02: Teste de centralização de AuthLayout**
  - Validar em um teste E2E ou Cypress se os formulários dentro de `/auth` estão centralizados verticalmente e horizontalmente.
