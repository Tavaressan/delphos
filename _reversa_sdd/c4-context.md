# Diagrama C4 — Contexto (Nível 1)

Este diagrama apresenta o escopo da plataforma **Alfabra Vector** no nível de contexto do usuário, definindo seus limites corporativos, as personas envolvidas e os sistemas externos integrados.

```mermaid
flowchart TB
    %% Estilos dos elementos do C4
    classDef person fill:#08427B,stroke:#073B6E,color:#FFFFFF,stroke-width:2px;
    classDef system fill:#1168BD,stroke:#0F5CA6,color:#FFFFFF,stroke-width:2px;
    classDef externalSystem fill:#999999,stroke:#888888,color:#FFFFFF,stroke-width:2px;
    classDef boundary fill:none,stroke:#CCCCCC,stroke-dasharray: 5 5;

    subgraph CorporateNetwork ["Rede Corporativa / Intranet"]
        user["Colaborador Corporativo (ROLE_USER)\n[Persona]\nUsa a plataforma para consultar informações e fazer upload de documentos."]:::person
        admin["Administrador do Sistema (ROLE_ADMIN)\n[Persona]\nGerencia usuários, permissões, acessos e monitora logs de auditoria."]:::person
        
        system["Alfabra Vector\n[Sistema de Software]\nPlataforma de inteligência artificial corporativa com recuperação de documentos (RAG) e auditoria."]:::system
    end

    subgraph PublicInternet ["Internet Pública"]
        llm["Provedor de LLM Externo\n[Sistema Externo]\nFornece APIs para geração de embeddings (com dimensionalidade parametrizável) e respostas do modelo de linguagem (ex: OpenAI, Gemini)."]:::externalSystem
        duckdns["DuckDNS (Serviço de DNS)\n[Sistema Externo]\nResolve o domínio e valida o desafio DNS para emissão automática de TLS/HTTPS."]:::externalSystem
    end

    %% Relacionamentos
    user -->|"Faz perguntas e envia arquivos via HTTPS"| system
    admin -->|"Gerencia usuários e visualiza logs de auditoria via HTTPS"| system
    
    system -.->|"Envia dados de texto e solicita embeddings / chat completions (HTTPS/API REST)"| llm
    system -.->|"Valida desafio de propriedade DNS (Porta 53)"| duckdns

    %% Aplicação de classes
    class user,admin person;
    class system system;
    class llm,duckdns externalSystem;
```

---

## 1. Personas e Atores

1. **Colaborador Corporativo (`ROLE_USER`):** Usuários do ecossistema corporativo autorizados a fazer upload de arquivos e interagir com o agente RAG no chat para responder dúvidas de domínio.
2. **Administrador (`ROLE_ADMIN`):** Usuários internos de TI ou segurança que necessitam auditar operações por questões de conformidade (via painel de logs de auditoria) e gerenciar perfis de acesso dos usuários.

---

## 2. Sistemas Externos e Integrações

1. **Provedor de LLM/Embeddings:** Responsável por calcular vetores de dimensionalidade parametrizável baseados nos trechos dos documentos e completar prompts de conversa gerando respostas coerentes.
2. **DuckDNS:** Utilizado no processo de setup do Caddy para provar propriedade de domínio sob a infraestrutura e obter certificados TLS da Let's Encrypt de forma automática.
