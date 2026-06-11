# Investigation: Modernização de UI/UX e Comportamento dos Painéis

> Identificador: `009-ui-modernization`
> Data: `2026-06-11`
> Documento principal: `_reversa_forward/009-ui-modernization/roadmap.md`

## 1. Pesquisa de fundo sobre gerenciamento de temas no Next.js (App Router)

### O Problema do Flash de Tema (FOUC)
No Next.js (App Router), as páginas são pré-renderizadas no servidor (SSR/SSG) com HTML estático. Quando o navegador baixa este HTML antes de baixar e executar os scripts do React, ele aplica o tema padrão (normalmente o tema claro). Se o usuário tem o tema escuro salvo no `localStorage`, as classes de tema são aplicadas apenas na hidratação do cliente (hydration), gerando um flash incomodativo de tela branca/clara antes de escurecer (Flicker of Unstyled Content - FOUC).

### Alternativas Avaliadas para Alternância e Persistência do Tema

#### Alternativa 1: Inserção de Script Bloqueante no HTML Head (Escolhida)
* **Como funciona:** Um pequeno script inline síncrono é injetado no `<head>` do `layout.tsx`:
  ```html
  <script dangerouslySetInnerHTML={{ __html: `
    try {
      if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    } catch (_) {}
  ` }} />
  ```
* **Vantagens:** O navegador executa este script de forma síncrona antes de renderizar o corpo da página (`<body>`), garantindo que a classe `dark` esteja aplicada ao elemento `<html>` e eliminando o FOUC. Tem peso nulo em dependências.
* **Desvantagens:** Requer o uso de `dangerouslySetInnerHTML`.

#### Alternativa 2: Biblioteca `next-themes`
* **Como funciona:** Biblioteca pronta que implementa um provedor React (`ThemeProvider`) para injetar scripts e controlar classes e atributos de tema.
* **Vantagens:** Abstrai o script inline e oferece Hooks como `useTheme()`.
* **Desvantagens:** Adiciona complexidade desnecessária e arquivos extras ao bundle do projeto para uma plataforma que requer controle rígido de dependências.

---

## 2. Comportamento e Transição dos Painéis Retráteis (Collapsible Panels)

### Lógica de Colapso
Para manter a UI fluida e de alto desempenho, usaremos estados de controle React e largura dinâmica baseada em Tailwind.

#### Layout de Três Colunas (ChatCanvas):
O layout do `ChatCanvas` será estruturado em um grid flexível:
1. **Sidebar (Esquerda):**
   * Expandida: `w-64`
   * Minimizado (Colapsada): `w-16`
   * Transição: `transition-all duration-300 ease-in-out`
   * Conteúdo: Quando colapsado, oculta os rótulos textuais e botões secundários (`hidden`), mantendo apenas os ícones centrais e o botão de toggle.
2. **Chat Area (Centro):**
   * Ocupa o espaço restante (`flex-1`).
3. **Execution Timeline (Direita):**
   * Expandido: `w-80`
   * Minimizado (Colapsado): `w-0` (oculto) ou largura de cabeçalho vertical. Para melhor legibilidade, usaremos `w-80` quando aberto, e largura zero (`w-0`) com ocultação (`overflow-hidden`) quando colapsado, adicionando um pequeno botão de gatilho flutuante/lateral na área de chat para reabri-lo.

### Uso de Transições do Tailwind
O uso de `transition-[width]` ou `transition-all` combinado com `duration-300` garante que o redesenho dos painéis de layout ocorra com uma animação agradável para o usuário, ao invés de saltos abruptos.

---

## 3. Padrões Aplicados

* **Design Industrial & Monitoramento:** O visual deve priorizar alto contraste, bordas finas (`border-slate-200` / `dark:border-slate-800`), e sombras muito discretas (`shadow-sm`), inspirando-se em ferramentas técnicas (ex. Azure DevOps, Datadog) em vez de interfaces de consumo genéricas.
* **Legibilidade WCAG:** No tema escuro, as cores de texto primárias (`#E5EAF2`) e fundo (`#0F1117`) resultam em uma taxa de contraste superior a 4.5:1, em conformidade com o nível AA da WCAG.
