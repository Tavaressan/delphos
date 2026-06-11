# Requirements: Modernização da UI/UX da Plataforma Corporativa Alfabra

> Identificador: `009-ui-modernization`
> Data: `2026-06-10`
> Pasta da extração reversa: `_reversa_sdd/`
> Confidência: 🟢 CONFIRMADO, 🟡 INFERIDO, 🔴 LACUNA / DÚVIDA

## 1. Resumo executivo

Esta especificação define o refactoring da interface gráfica (frontend) da plataforma Alfabra Vector para estabelecer uma experiência visual moderna e de nível empresarial, com estética industrial e de monitoramento técnico (similar a sistemas ABB, Siemens, Datadog ou Atlassian). A modernização foca na substituição da tipografia Orbitron (sci-fi) pela fonte Inter, na ampliação e destaque do logotipo da Alfabra, na eliminação de adornos puramente estéticos sem funcionalidade no menu, no redesenho de cards/elementos de layout com bordas suaves e sombras discretas, na centralização dos tokens de design e na implementação de um modo escuro (dark theme) persistente com paleta corporativa específica.

## 2. Contexto a partir do legado

As decisões e restrições desta especificação ancoram-se nos artefatos da extração reversa do sistema legado:

| Fonte | Trecho relevante | Confidência |
|-------|------------------|-------------|
| `_reversa_sdd/architecture.md#2. Tecnologias Empregadas` | Confirma o uso do Next.js (14.2.3) e Tailwind CSS na camada de frontend. | 🟢 CONFIRMADO |
| `_reversa_sdd/code-analysis.md#3.1. Módulo: frontend (Next.js & TypeScript)` | Identifica o uso de Tailwind CSS, Framer Motion para animações e a estilização inicial com suporte nativo a temas claros/escuros no corpo principal da página (`bg-white dark:bg-gray-950`). | 🟢 CONFIRMADO |
| `_reversa_sdd/domain.md#1.1. Core e Negócio` | Descreve as permissões e papéis como `ROLE_ADMIN` e `ROLE_USER`, que são exibidos na interface gráfica no cabeçalho do perfil do usuário. | 🟢 CONFIRMADO |
| `_reversa_sdd/inventory.md#3. Pontos de Entrada da Aplicação` | Aponta `frontend/src/app/layout.tsx` como layout principal e `frontend/src/styles/globals.css` como o arquivo global de estilização. | 🟢 CONFIRMADO |

## 3. Personas e cenários de uso

| Persona | Objetivo | Cenário-chave |
|---------|----------|---------------|
| **Operador Industrial (Engenheiro de Sistemas)** | Monitorar a execução de prompts de agentes em tempo real e consultar o RAG com alta densidade de informação sem distrações visuais. | Acompanhar o progresso na timeline de execução com fontes legíveis e painéis limpos durante uma atividade de auditoria de manutenção. |
| **Administrador de TI (Corporate Admin)** | Gerenciar o acesso à plataforma e as bases de conhecimento em uma interface estável que passe confiança e robustez corporativa. | Navegar pelo menu lateral e alternar entre os temas claro/escuro de acordo com as condições de iluminação da sala de controle. |

## 4. Regras de negócio novas ou alteradas

1. **RN-01: Substituição Estrita de Tipografia** 🟢
   - Origem no legado: `_reversa_sdd/code-analysis.md#3.1` (estilo global de fontes)
   - Tipo: alterada
   - Descrição: A fonte Orbitron deve ser completamente removida de todas as chamadas CSS e componentes. Toda a aplicação deve utilizar exclusivamente a fonte Inter (ou fallbacks sans-serif do sistema). Títulos de páginas usarão peso SemiBold/Bold, cabeçalhos de seção peso Medium e corpo de conteúdo peso Regular.

2. **RN-02: Preservação e Redimensionamento da Logomarca** 🟢
   - Origem no legado: `_reversa_sdd/code-analysis.md#3.1` (`Header.tsx` e assets)
   - Tipo: alterada
   - Descrição: O logotipo PNG original da Alfabra (`LogoMarca_Alfabra.png`) deve ser mantido, porém seu tamanho em tela na barra de navegação superior (Header) deve ser aumentado em uma faixa de 50% a 70% em relação ao tamanho legado. No tema escuro, deve-se aplicar o filtro de contraste/inversão no CSS (ex: `dark:brightness-0 dark:invert`) para garantir a legibilidade.

3. **RN-03: Tema Escuro Nativo e Persistente** 🟢
   - Origem no legado: `_reversa_sdd/code-analysis.md#3.1` (Tailwind classes de layout)
   - Tipo: nova
   - Descrição: A plataforma deve suportar um modo escuro (Dark Theme) completo que utiliza a paleta industrial especificada. A preferência de tema do usuário deve ser armazenada localmente (localStorage) e carregada automaticamente nas sessões subsequentes sem gerar flicker visual na inicialização.

4. **RN-04: Eliminação de Elementos Decorativos Sem Função** 🟢
   - Origem no legado: `_reversa_sdd/code-analysis.md#3.1` (`Sidebar.tsx`)
   - Tipo: alterada
   - Descrição: Todos os elementos de design decorativos sem propósito operacional (como o indicador de "Confiabilidade: 100%" do rodapé do Sidebar) devem ser removidos para maximizar a seriedade profissional e a densidade de informação útil.

5. **RN-05: Centralização Visual via Design Tokens** 🟢
   - Origem no legado: `_reversa_sdd/code-analysis.md#3.1` (`globals.css` e tokens customizados)
   - Tipo: nova
   - Descrição: Todos os componentes devem consumir cores, espaçamentos e bordas a partir de tokens de design centralizados (seja via variáveis CSS globais ou constantes TypeScript), eliminando valores de estilização inline ou cores estáticas hardcoded no código.

## 5. Requisitos Funcionais

| ID | Requisito | Prioridade | Critério de aceite | Confidência |
|----|-----------|------------|--------------------|-------------|
| **RF-01** | Alternador de Tema (Theme Switcher) | Must | Um botão deve ser inserido no Header (top nav) permitindo a alternância instantânea entre os modos Claro e Escuro. | 🟢 CONFIRMADO |
| **RF-02** | Persistência do Tema | Must | A escolha do tema deve ser gravada no `localStorage` do navegador e restabelecida no carregamento da página. | 🟢 CONFIRMADO |
| **RF-03** | Menu Lateral Aprimorado (Sidebar Actives) | Must | Os itens de menu ativos devem possuir uma borda lateral esquerda na cor azul primário (`#22409A`), melhor espaçamento e destaque visual nítido. | 🟢 CONFIRMADO |
| **RF-04** | Redesenho de Cards (Card Refresh) | Must | Substituir o visual dos cards por bordas com raio de 8px, bordas finas com contraste adequado e sombras discretas (`shadow-sm` ou similar), evitando sombras pesadas. | 🟢 CONFIRMADO |
| **RF-05** | Alternativa da Página de Tokens | Should | A página de Guia do Design System (`/design-system`) deve ser atualizada para demonstrar as novas paletas de cores do tema escuro, fontes e os botões redesenhados. | 🟡 INFERIDO |
| **RF-06** | Painéis Laterais Retráteis (Collapsible Side Panels) | Must | Tanto o painel lateral esquerdo (Sidebar/Módulos Operacionais) quanto o painel lateral direito (Progresso de Execução/Timeline) devem possuir botões visuais para recolher/minimizar, maximizando a área de chat/RAG central quando desejado. | 🟢 CONFIRMADO |

## 6. Requisitos Não Funcionais

| Tipo | Requisito | Evidência ou justificativa | Confidência |
|------|-----------|----------------------------|-------------|
| **Desempenho** | Prevenção de Flash de Tema Incorreto (FOUC) | A alternância do tema na renderização inicial (SSG/SSR) deve ocorrer sem piscar o tema oposto antes de aplicar a preferência salva. | 🟡 INFERIDO |
| **Acessibilidade** | Contraste de Texto no Tema Escuro | As cores de texto (`#E5EAF2` para primário e `#A3AFBF` para secundário) sobre o fundo de superfície (`#151923`) devem respeitar as diretrizes WCAG de contraste mínimo para facilitar a legibilidade operacional. | 🟢 CONFIRMADO |
| **Arquitetura** | Centralização dos Tokens no CSS / JS | Todos os mapeamentos de cores informados devem ser reflected de forma limpa em variáveis CSS `:root` e `/` ou classes utilitárias no Tailwind, facilitando manutenção. | 🟢 CONFIRMADO |

## 7. Critérios de Aceitação

```gherkin
Cenário: Alternância de tema para o modo escuro
  Dado que o usuário está na tela principal do console RAG no modo claro
  Quando o usuário clica no seletor de tema no cabeçalho
  Então a interface muda imediatamente para o modo escuro aplicando as cores definidas (Fundo: #0F1117, Superfície: #151923)
  E a chave de preferência "theme: dark" é registrada no localStorage do navegador

Cenário: Persistência do tema escuro após recarregamento
  Dado que o usuário ativou o modo escuro em uma sessão anterior
  Quando o usuário recarrega a página ou inicia uma nova aba
  Então a plataforma renderiza diretamente no modo escuro
  E não ocorre flash visível do tema claro anterior na inicialização

Cenário: Remoção da decoração de confiabilidade
  Dado que o usuário visualiza o menu lateral esquerdo (Sidebar)
  Quando a barra lateral é renderizada
  Então o texto decorativo "Confiabilidade: 100%" não está visível no rodapé do menu
```

## 8. Prioridade MoSCoW

| Item | MoSCoW | Justificativa |
|------|--------|---------------|
| **RF-01 (Theme Switcher)** | Must | Necessário para viabilizar a alternância física dos modos visuais requisitados pelo cliente. |
| **RF-02 (Persistência)** | Must | Garante que operadores não precisem reconfigurar o tema a cada carregamento de página. |
| **RN-01 (Remove Orbitron & Use Inter)** | Must | Objetivo direto de melhorar a legibilidade e conferir o aspecto corporativo técnico esperado. |
| **RN-02 (Logo Prominence)** | Must | Essencial para a valorização e consolidação da identidade visual da Alfabra no Header. |
| **RN-04 (Sidebar Cleaning)** | Must | Exigência específica para limpar o painel lateral de adornos supérfluos. |
| **RF-05 (Design System Update)** | Should | Desejável para manter a documentação visual viva e alinhada com as modificações de front. |

## 9. Esclarecimentos

### Sessão 2026-06-11

- **Q:** A logomarca existente da Alfabra (`LogoMarca_Alfabra.png`) possui fundo transparente e boa legibilidade em fundo escuro (`#0F1117`) ou deve-se prever uma versão com contorno/filtro invertido para contraste no tema escuro?
  **R:** Seguir a recomendação de aplicar filtro de contraste/inversão no CSS (como `dark:brightness-0 dark:invert` no Tailwind) para o tema escuro, garantindo legibilidade sem necessitar de novas imagens.
- **Q:** O painel de observabilidade direito (Execution Timeline) deve possuir controle de minimizar/recolher para ganho de espaço de tela ou deve manter-se fixo no layout de três colunas padrão?
  **R:** Sim, e ambos os painéis laterais (tanto o esquerdo de módulos operacionais quanto o direito de progresso de execução) devem ser recolhíveis/minimizáveis para maximizar a área útil do chat/RAG.

## 10. Lacunas

Nenhuma lacuna ou dúvida pendente nesta versão.

## 11. Histórico de alterações

| Data | Alteração | Autor |
|------|-----------|-------|
| 2026-06-10 | Versão inicial gerada por `/reversa-requirements` | reversa |
| 2026-06-11 | Esclarecimento de dúvidas sobre a logomarca e painéis laterais retráteis via `/reversa-clarify` | reversa |
