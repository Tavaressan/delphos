# Decisão de Modernização de Interface (Screens Mode)

Este documento especifica a estratégia de modernização de interface da **Enterprise Agent Operating Platform**, convertendo as interações clássicas de LibreChat e MaxKB4j em uma interface do usuário Next.js corporativa unificada, segura e responsiva.

---

## 1. Modo de Tradução: Híbrido Modernizado

A plataforma adota o modo de modernização **Híbrido**. As funcionalidades consagradas de conversação de LibreChat e a gestão de bases de conhecimento do MaxKB4j serão fundidas em uma estrutura visual limpa que prioriza a governança dos agentes e o monitoramento em tempo real de chamadas de ferramentas.

### Regras Gerais de UI/UX (Next.js & Tailwind CSS)
- **Tema:** Dark mode por padrão, com suporte a contraste adaptativo e harmonia de cores suaves.
- **Tipografia:** Fonte do sistema moderna (Inter/Outfit) substituindo fontes genéricas do navegador.
- **Micro-animações:** Efeitos suaves de *hover* e transição de estados de carregamento (skeletons para mensagens de chat em progresso).
- **Segurança de Componentes:** Formulários protegidos contra duplos cliques (botão de envio desabilitado durante a execução de tarefas dos agentes) e tratamento correto de erros HTTP com overlays modais elegantes.

---

## 2. Padrão de Estado de Componentes (4 Estados Estritos)

Qualquer componente de visualização interativa (ex: caixa de chat, lista de agentes, cards de upload) deve implementar de forma explícita quatro estados de renderização para garantir consistência visual:

1. **Idle (Inativo / Pronto):** O estado padrão de aguardo de ação do usuário, mostrando dados estáveis e botões acionáveis de forma nítida.
2. **Loading (Carregando):** Ativado imediatamente quando a requisição é enviada. Mensagens parciais ou listagens exibem animações do tipo *Skeleton Screen*. O botão correspondente de envio exibe um ícone rotativo (spinner) e impede novos cliques.
3. **Error (Erro):** Mostrado se a requisição falhar (ex: estouro de limite de tokens, timeout de worker). Apresenta um banner explicativo ou modal contendo o código de erro e um botão para "Tentar Novamente".
4. **Success (Sucesso):** Confirmação visual rápida e sutil de conclusão (ex: upload de arquivo concluído, agente criado com sucesso) que retorna ao estado Idle após alguns segundos.
