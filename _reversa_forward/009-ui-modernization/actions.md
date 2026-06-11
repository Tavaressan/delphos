# Actions: Modernização da UI/UX da Plataforma Corporativa Alfabra

> Identificador: `009-ui-modernization`
> Data: `2026-06-11`
> Roadmap: `_reversa_forward/009-ui-modernization/roadmap.md`

## Resumo

| Métrica | Valor |
|---------|-------|
| Total de ações | 12 |
| Paralelizáveis (`[//]`) | 6 |
| Maior cadeia de dependência | 6 |

## Fase 1, Preparação

| ID | Descrição | Dependências | Paralelismo | Arquivo alvo | Confidência | Status |
|----|-----------|--------------|-------------|--------------|-------------|--------|
| T001 | Habilitar a estratégia de classe para Dark Mode no arquivo de configuração do Tailwind CSS. | - | `[//]` | `frontend/tailwind.config.js` | 🟢 | `[X]` |
| T002 | Adicionar a fonte Inter como padrão no layout principal da aplicação. | - | `[//]` | `frontend/src/app/layout.tsx` | 🟢 | `[X]` |
| T003 | Definir as variáveis de cor para os temas claro e escuro e configurar o scrollbar customizado. | - | `[//]` | `frontend/src/styles/globals.css` | 🟢 | `[X]` |

## Fase 2, Testes

| ID | Descrição | Dependências | Paralelismo | Arquivo alvo | Confidência | Status |
|----|-----------|--------------|-------------|--------------|-------------|--------|
| T004 | Escrever teste unitário básico para validar a alternância da classe `dark` no elemento raiz da aplicação. | T001, T002, T003 | `[//]` | `frontend/tests/unit.test.ts` | 🟢 | `[X]` |

## Fase 3, Núcleo

| ID | Descrição | Dependências | Paralelismo | Arquivo alvo | Confidência | Status |
|----|-----------|--------------|-------------|--------------|-------------|--------|
| T005 | Implementar o botão do Theme Switcher no cabeçalho e aplicar filtros CSS para contraste do logotipo da Alfabra em modo escuro. | T003 | - | `frontend/src/components/layout/Header.tsx` | 🟢 | `[X]` |
| T006 | Adicionar o script síncrono inline no `<head>` para carregar a preferência de tema do `localStorage` e prevenir piscadas (FOUC). | T005 | - | `frontend/src/app/layout.tsx` | 🟢 | `[X]` |
| T007 | Implementar o comportamento retrátil (collapsible) no menu lateral, removendo o indicador "Confiabilidade: 100%" do rodapé. | T003 | - | `frontend/src/components/layout/Sidebar.tsx` | 🟢 | `[X]` |
| T008 | Implementar a timeline de execução retrátil (collapsible) no painel direito da tela de chat. | T003 | - | `frontend/src/features/chat/ChatCanvas.tsx` | 🟢 | `[X]` |

## Fase 4, Integração

| ID | Descrição | Dependências | Paralelismo | Arquivo alvo | Confidência | Status |
|----|-----------|--------------|-------------|--------------|-------------|--------|
| T009 | Integrar os estados dos dois painéis retráteis para garantir o redimensionamento dinâmico e fluido do chat central de RAG. | T007, T008 | - | `frontend/src/features/chat/ChatCanvas.tsx` | 🟢 | `[X]` |
| T010 | Atualizar o guia do Design System para exibir as paletas de cores do tema escuro, tipografia e demonstração dos novos botões. | T005, T006, T009 | - | `frontend/src/app/design-system/page.tsx` | 🟢 | `[X]` |

## Fase 5, Polimento

| ID | Descrição | Dependências | Paralelismo | Arquivo alvo | Confidência | Status |
|----|-----------|--------------|-------------|--------------|-------------|--------|
| T011 | Aplicar transições suaves de cor e bordas para transição de tema na página do console de RAG e cards. | T010 | `[//]` | `frontend/src/styles/globals.css` | 🟢 | `[X]` |
| T012 | Validar o fluxo de onboarding completo localmente e garantir que todos os testes estejam passando. | T011 | `[//]` | `_reversa_forward/009-ui-modernization/onboarding.md` | 🟢 | `[X]` |

## Notas de execução

<!--
Reservado para /reversa-coding registrar avisos ou observações que surgiram durante a execução.
Não use isso para corrigir ações, edits manuais ficam fora desse arquivo, vão direto no código.
-->

## Histórico de alterações

| Data | Alteração | Autor |
|------|-----------|-------|
| 2026-06-11 | Versão inicial gerada por `/reversa-to-do` | reversa |
