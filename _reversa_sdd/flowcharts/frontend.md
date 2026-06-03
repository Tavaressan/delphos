# Fluxograma de Controle: frontend 🟢 **CONFIRMADO**

Este fluxograma ilustra a hierarquia estrutural e o fluxo de renderização das rotas no Next.js App Router para o esqueleto do módulo `frontend`.

```mermaid
flowchart TD
    Start([Inicialização da Rota]) --> RouteCheck{Tipo de Rota}
    
    RouteCheck -->|Rota Geral / Privada| RootLayout[Carregar src/app/layout.tsx]
    RouteCheck -->|Rota de Autenticação /auth/*| AuthLayout[Carregar src/app/auth/layout.tsx]
    
    RootLayout --> BodyRender[Renderizar tag body & Configurar Tema Claro/Escuro]
    BodyRender --> InjectChildren[Injetar Páginas filhas {children}]
    
    AuthLayout --> FlexBoxContainer[Alinhar ao centro da tela com Flexbox]
    FlexBoxContainer --> InjectAuthPages[Injetar Formulários de Autenticação {children}]
    InjectAuthPages --> RootLayout
    
    InjectChildren --> End([Página Renderizada])
```
