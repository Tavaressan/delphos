# Frontend, Requisitos

## Visão Geral
O módulo Frontend é a interface gráfica web da plataforma, construída em Next.js com App Router e estilizada com Tailwind CSS. Ele permite que usuários finais façam login, realizem uploads de documentos, vejam o progresso de processamento e utilizem uma interface de chat interativo com o assistente IA.

---

## Responsabilidades
* **Autenticação Visual:** Fornecer telas de login e layouts específicos para autenticação.
* **Envio de Documentos (Ingestão):** Disponibilizar interface intuitiva de upload de arquivos (PDF, TXT, etc.).
* **Interface de Chat:** Oferecer uma área de conversa por chat em tempo real com o assistente RAG.
* **Controle de Acesso Visual:** Ocultar ou desabilitar funcionalidades administrativas (ex: logs de auditoria) com base no papel do usuário.

---

## Regras de Negócio
* **[BR01] Tema Visual Responsivo:** O layout do sistema deve se adaptar automaticamente a temas claro e escuro (`bg-white` / `bg-gray-950`).
  * *Status:* 🟢 CONFIRMADO (extraído de `frontend/src/app/layout.tsx`).
* **[BR02] Autenticação Obrigatória:** Rotas internas (chat, upload) exigem autenticação do usuário. Apenas a tela de login (/auth) deve estar disponível publicamente.
  * *Status:* 🟡 INFERIDO.

---

## Requisitos Funcionais

| ID | Requisito | Prioridade | Critério de Aceite |
|----|-----------|------------|-------------------|
| RF-01 | Interface de Autenticação Centralizada | Must | Tela flexível e centralizada em fundo gradiente/padrão para login. |
| RF-02 | Painel de Conversação (Chat) | Must | Exibir mensagens sequenciais divididas por remetente (User vs Assistente). |
| RF-03 | Upload de Arquivos | Must | Permitir arrastar e soltar ou selecionar arquivos para upload. |
| RF-04 | Exibição de Status de Documentos | Should | Mostrar se o documento está indexado ou processando na listagem. |

---

## Requisitos Não Funcionais

| Tipo | Requisito inferido | Evidência no código | Confiança |
|------|--------------------|---------------------|-----------|
| Usabilidade | Suporte nativo a Dark Mode e acessibilidade visual | `frontend/src/app/layout.tsx:7` | 🟢 |
| Segurança | Centralização de layout para fluxos de autenticação | `frontend/src/app/auth/layout.tsx:4` | 🟢 |

---

## Critérios de Aceitação

```gherkin
Dado que um usuário não autenticado tenta acessar o painel de chat
Quando o roteamento carrega a página
Então ele deve ser redirecionado visualmente para a tela de login (/auth)

Dado que o usuário está na tela de login
Quando digita credenciais válidas e clica em Entrar
Então ele deve ser autenticado e direcionado para a interface principal de chat
```

---

## Prioridade (MoSCoW)

| Requisito | MoSCoW | Justificativa |
|-----------|--------|---------------|
| Interface de login e fluxo de Auth Layout | Must | Ponto de entrada obrigatório para proteger acessos do sistema |
| Componentização de layouts (Root e Auth Layout) | Must | Define a estrutura visual de carregamento de páginas da aplicação |
| Suporte a Dark Mode (Tailwind) | Should | Melhora usabilidade em ambientes de escritório corporativo |

---

## Rastreabilidade de Código

| Arquivo | Função / Classe | Cobertura |
|---------|-----------------|-----------|
| `frontend/src/app/layout.tsx` | `RootLayout` | 🟢 |
| `frontend/src/app/auth/layout.tsx` | `AuthLayout` | 🟢 |
