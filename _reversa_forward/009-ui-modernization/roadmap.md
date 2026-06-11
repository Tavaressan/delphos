# Roadmap: Modernização da UI/UX da Plataforma Corporativa Alfabra

> Identificador: `009-ui-modernization`
> Data: `2026-06-11`
> Requirements: `_reversa_forward/009-ui-modernization/requirements.md`
> Confidência: 🟢 CONFIRMADO, 🟡 INFERIDO, 🔴 LACUNA

## 1. Resumo da abordagem

Esta especificação aborda a modernização da interface da plataforma Alfabra Vector, aplicando novos padrões visuais e melhorando a flexibilidade de tela do console RAG. A tipografia global Orbitron (sci-fi) será substituída pela fonte Inter (sans-serif) para dar um ar corporativo e limpo. No cabeçalho (Header), será adicionado um Theme Switcher para alternar entre tema claro e tema escuro (fundo `#0F1117`, superfície `#151923`), persistindo a preferência do operador no `localStorage` e aplicando um script de bloqueio para prevenir piscadas (FOUC). O logotipo da Alfabra será ampliado em 50-70% no cabeçalho e receberá filtros do Tailwind (`dark:brightness-0 dark:invert`) para contraste no tema escuro. O menu Sidebar terá a decoração supérflua de "Confiabilidade: 100%" removida. Por fim, ambos os painéis laterais (Sidebar à esquerda e Execution Timeline à direita) serão convertidos em componentes retráteis (collapsible), com transições fluidas no Tailwind controladas por estados do React.

## 2. Princípios aplicados

Não há arquivo de princípios ativo em `.reversa/principles.md`. A feature segue os princípios implícitos de design limpo, legibilidade otimizada, densidade de informações em telas operacionais e facilidade de manutenção no Next.js/Tailwind.

## 3. Decisões técnicas

| ID | Decisão | Justificativa | Alternativas descartadas | Confidência |
|----|---------|----------------|--------------------------|-------------|
| **D-01** | Uso do Tailwind CSS nativo para Dark Mode (`class` strategy) | Permite alternar e estender estilos de forma declarativa e simples usando prefixos `dark:` nos componentes. | Injeção manual de variáveis CSS ou styled-components que aumentariam a complexidade técnica. | 🟢 |
| **D-02** | Script síncrono inline de prevenção de flash (FOUC) no `layout.tsx` | Next.js realiza Server-Side Rendering (SSR). Injetar um pequeno script inline síncrono que lê o `localStorage` no `<head>` garante que o tema correto seja aplicado antes da primeira pintura (first paint). | Confiar puramente na hidratação do React (causa FOUC) ou instalar a biblioteca pesada `next-themes`. | 🟢 |
| **D-03** | Controle de painéis retráteis via estado React + transições Tailwind | Utilizar estados locais (`isSidebarCollapsed`, `isTimelineCollapsed`) e classes de transição (`transition-all duration-300 ease-in-out`) para encolhimento de largura de forma nativa e fluida. | Bibliotecas de terceiros como `react-resizable` ou CSS grids fixos (difíceis de animar de forma robusta). | 🟢 |
| **D-04** | Filtro de brilho e inversão na imagem do logo (`LogoMarca_Alfabra.png`) no tema escuro | Reutiliza o arquivo de imagem legado no cabeçalho aplicando `dark:brightness-0 dark:invert` para torná-lo branco com contraste perfeito. | Solicitar nova imagem com cores invertidas ou vetorizar manualmente como SVG. | 🟢 |

## 4. Premissas

Nenhuma premissa sob dúvida ativa foi adotada, dado que todos os pontos do requirements foram esclarecidos.

## 5. Delta arquitetural

| Componente | Arquivo de origem no legado | Tipo de mudança | Resumo |
|------------|------------------------------|-----------------|--------|
| `layout.tsx` | `frontend/src/app/layout.tsx` | regra-alterada | Configuração do font-family do Inter como padrão do body, remoção da fonte Orbitron, e inclusão do script síncrono de tema no `<head>`. |
| `globals.css` | `frontend/src/styles/globals.css` | regra-alterada | Definição das variáveis de cores globais do tema escuro corporativo e classes utilitárias de transição dos painéis. |
| `Header` | `frontend/src/components/layout/Header.tsx` | regra-alterada | Redimensionamento da logomarca da Alfabra (+60% de tamanho), adição do Theme Switcher e aplicação do botão dinâmico de tema. |
| `Sidebar` | `frontend/src/components/layout/Sidebar.tsx` | regra-alterada | Remoção do texto "Confiabilidade: 100%", adição do botão e lógica para colapsar/expandir (com largura dinâmica). |
| `ChatCanvas` | `frontend/src/features/chat/ChatCanvas.tsx` | regra-alterada | Integração do painel direito (Execution Timeline) retrátil com lógica de controle local de largura e botão para recolher. |
| `design-system` | `frontend/src/app/design-system/page.tsx` | regra-alterada | Atualização da página do guia do Design System para demonstrar os novos tokens e comportamento de tema escuro e componentes atualizados. |

## 6. Delta no modelo de dados

- Resumo das mudanças: Não há alterações no modelo de dados persistido no banco de dados (PostgreSQL/pgvector). A única persistência ocorre no lado do cliente (client-side) gravando a chave `theme` (`light` / `dark`) no `localStorage` do navegador.
- Detalhe completo em: `_reversa_forward/009-ui-modernization/data-delta.md`

## 7. Delta de contratos externos

Nenhum contrato externo (APIs, mensageria ou serviços externos) é afetado por esta feature. O escopo é 100% contido na camada de frontend.

## 8. Plano de migração

Nenhuma migração de dados é necessária para esta feature.

## 9. Riscos e mitigações

| Risco | Impacto | Probabilidade | Mitigação |
|-------|---------|---------------|-----------|
| Flash de tema incorreto (FOUC) durante carregamento SSR | médio | média | Implementação de script sútil inline inserido diretamente no `<head>` do HTML. |
| Quebra de layout ou corte de texto na Sidebar minimizada | médio | baixa | Oculte rótulos de texto e elementos secundários na Sidebar quando ela estiver no estado minimizado, mantendo visíveis apenas os ícones centrais. |
| Perda de sincronismo do estado dos painéis entre abas | baixo | baixa | Sincronizar o tema em tempo real ouvindo o evento `storage` da window, para que seletores em abas diferentes mudem de forma sincronizada. |

## 10. Critério de pronto

- [ ] Todas as ações do `actions.md` marcadas `[X]`
- [ ] `regression-watch.md` gerado
- [ ] O tema escuro persiste ao recarregar a página sem causar FOUC (flash de tema claro)
- [ ] Os dois painéis (Sidebar esquerda e Timeline direita) colapsam e expandem de forma fluida, recalculando o espaço do chat principal
- [ ] O logotipo da Alfabra permanece legível em ambos os temas

## 11. Histórico de alterações

| Data | Alteração | Autor |
|------|-----------|-------|
| 2026-06-11 | Versão inicial gerada por `/reversa-plan` | reversa |
