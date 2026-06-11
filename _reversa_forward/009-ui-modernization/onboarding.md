# Onboarding: Modernização da UI/UX da Plataforma Corporativa Alfabra

> Identificador: `009-ui-modernization`
> Data: `2026-06-11`
> Documento principal: `_reversa_forward/009-ui-modernization/roadmap.md`

Este documento contém o guia passo a passo para desenvolvedores ou testadores validarem as implementações visuais e comportamentais da modernização da interface da plataforma Alfabra Vector.

---

## 1. Preparação do Ambiente

1. Certifique-se de que os pacotes do frontend estejam instalados e execute o servidor de desenvolvimento:
   ```bash
   cd frontend
   npm run dev
   ```
2. Abra seu navegador em `http://localhost:3000`.

---

## 2. Roteiro de Teste e Validação

### Passo 1: Validação de Tipografia e Logotipo (Header)
1. **Tipografia:** Navegue por qualquer página (ex: console de chat ou Design System). Inspecione elementos de texto com as ferramentas de desenvolvedor do navegador (F12) e verifique se a propriedade `font-family` resolve para a fonte `Inter`. A fonte `Orbitron` não deve estar ativa em nenhum local da aplicação.
2. **Logotipo:** Verifique se o logotipo da Alfabra no canto superior esquerdo está de 50% a 70% maior que na versão original, garantindo excelente destaque.

### Passo 2: Teste do Modo Escuro e Transição de Temas
1. No cabeçalho (Header), localize o botão de alternador de tema (Theme Switcher).
2. Clique no botão. O sistema deve aplicar o tema escuro imediatamente:
   * Cor de fundo global deve mudar para `#0F1117` e superfícies para `#151923`.
   * O logotipo da Alfabra deve sofrer uma transição de cores sutil ou ficar branco (aplicando `dark:brightness-0 dark:invert`), tornando-se perfeitamente legível sobre o fundo escuro.
3. Recarregue a página (F5). A interface deve carregar instantaneamente no tema escuro, sem mostrar piscadas (flash/flicker) do tema claro original.
4. Clique novamente no botão para voltar ao tema claro e certifique-se de que a preferência é mantida ao recarregar.

### Passo 3: Validação da Sidebar Retrátil (Esquerda)
1. No painel de módulos operacionais (Sidebar), localize o botão de encolhimento (toggle de colapso).
2. Clique no botão. A Sidebar deve realizar uma transição suave encolhendo sua largura de `256px` para `64px`.
3. Verifique se:
   * Os rótulos de texto de cada módulo são ocultados suavemente.
   * Apenas os ícones de navegação permanecem visíveis.
   * O texto "Confiabilidade: 100%" sumiu completamente da Sidebar em ambos os estados.
   * O canvas de chat RAG central expande-se ocupando o espaço extra.
   * A borda lateral esquerda na cor azul primário (`#22409A`) destaca o item ativo.
4. Clique novamente para expandir.

### Passo 4: Validação da Timeline de Execução Retrátil (Direita)
1. Na tela de chat, observe a timeline de execução de progresso dos agentes no painel direito.
2. Localize o botão de recolher no cabeçalho do painel de progresso.
3. Clique no botão. A timeline deve recolher-se suavemente para a direita até sumir (`width: 0`), e a área de chat central deve se expandir.
4. Clique no botão de gatilho para restaurar o painel ao tamanho padrão.

### Passo 5: Validação da Guia do Design System
1. Navegue para `http://localhost:3000/design-system`.
2. Verifique se o guia exibe os novos tokens de design do tema escuro, fontes e estilos atualizados.
3. Alterne o tema e verifique se a documentação visual do Design System também responde à alternância.
