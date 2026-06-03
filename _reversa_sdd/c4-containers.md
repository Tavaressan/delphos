# Diagrama C4 — Containers (Nível 2)

Este diagrama detalha os containers executados no ecossistema da **Alfabra Vector**, as tecnologias utilizadas, suas responsabilidades e a comunicação de rede entre eles.

```mermaid
flowchart TB
    %% Estilos dos elementos do C4
    classDef person fill:#08427B,stroke:#073B6E,color:#FFFFFF,stroke-width:2px;
    classDef container fill:#438DD5,stroke:#3B7BB9,color:#FFFFFF,stroke-width:2px;
    classDef database fill:#1168BD,stroke:#0F5CA6,color:#FFFFFF,stroke-width:2px;
    classDef externalSystem fill:#999999,stroke:#888888,color:#FFFFFF,stroke-width:2px;

    %% Atores
    user["Colaborador Corporativo\n[Persona]\nUsa a interface web."]:::person
    admin["Administrador do Sistema\n[Persona]\nAudita logs e acessos."]:::person

    subgraph Boundaries ["Alfabra Vector (Monorepo Docker Compose)"]
        caddy["Caddy (Reverse Proxy)\n[Container: Caddy/Alpine]\nTermina HTTPS/TLS com DuckDNS e encaminha requisições ao Frontend."]:::container
        
        frontend["Frontend\n[Container: Next.js/Node]\nInterface web moderna construída com App Router e Tailwind CSS."]:::container
        
        core["Java Core API\n[Container: Spring Boot/JVM]\nAPI de negócio, segurança (RBAC), metadados de documentos e chat."]:::container
        
        redis["Redis Cache\n[Container: Redis 7-Alpine]\nCache de sessão de usuários e suporte a transações rápidas."]:::database
        
        minio["MinIO Storage\n[Container: MinIO]\nServidor de armazenamento de objetos compatível com S3 para arquivos brutos."]:::database
        
        anythingllm["AnythingLLM\n[Container: mintplexlabs]\nInterface e motor de RAG alternativo integrado ao mesmo banco."]:::container
        
        postgres["Postgres RAG DB\n[Container: Postgres/pgvector]\nBanco unificado. Armazena metadados e vetores HNSW com dimensionalidade parametrizável."]:::database
        
        subgraph RustServices ["Rust Services Pipeline"]
            worker["Ingestion Worker\n[Container: Rust/Tokio]\nLoop assíncrono em Rust que orquestra a ingestão de novos documentos."]:::container
            
            parser["Document Processing\n[Container: Rust/Axum]\nServiço que extrai texto de documentos físicos."]:::container
            
            embedder["Embedding Service\n[Container: Rust/Axum]\nGera representação vetorial (embeddings) via APIs."]:::container
        end
    end

    %% Provedor LLM Externo
    llm["Provedor de LLM Externo\n[Sistema Externo]\nFornece embeddings e completações de prompt."]:::externalSystem

    %% Fluxos de rede
    user & admin -->|"Acessa via HTTPS (Portas 80/443)"| caddy
    caddy -->|"Proxy reverso (Porta 3000)"| frontend
    frontend -->|"Requisições REST (Porta 8080)"| core
    
    core -->|"Consulta/Escrita"| postgres
    core -->|"Cache / Sessões"| redis
    core -->|"Upload de arquivos (S3 API)"| minio
    core -.->|"API REST de apoio"| anythingllm
    
    %% Rust Pipeline comunicações
    worker -->|"Lê jobs pendentes no banco"| postgres
    worker -->|"Chama parser (Porta 8000)"| parser
    worker -->|"Chama gerador de embeddings (Porta 8000)"| embedder
    worker -->|"Persiste chunks & vetores"| postgres
    
    embedder -.->|"Chama APIs de LLM externas"| llm

    %% Aplicar classes
    class user,admin person;
    class caddy,frontend,core,worker,parser,embedder,anythingllm container;
    class postgres,redis,minio database;
    class llm externalSystem;
```

---

## 1. Descrição dos Containers e Tecnologias

1. **Caddy Proxy:** Único container com portas expostas (`80:80` e `443:443`). Garante TLS automático por DNS Challenge com DuckDNS.
2. **Next.js Frontend:** UI SPA/SSR executando na porta 3000 interna. Comunica-se com o Spring Boot para operações autenticadas.
3. **Java Core (Spring Boot):** Gerencia lógica complexa de negócios, regras de auditoria e RBAC na porta 8080.
4. **Redis:** Usado como repositório de cache e armazenamento temporário para otimização de performance das sessões.
5. **MinIO:** Armazena os arquivos físicos originais (PDFs, TXTs) antes de serem divididos em trechos.
6. **Postgres (`pgvector`):** Persistência principal contendo a tabela de usuários, chats, auditoria e a tabela `document_chunks` com um índice HNSW.
7. **AnythingLLM:** Container alternativo integrado ao Postgres para visualização ou pipelines alternativos de RAG.
8. **Rust Ingestion Pipeline:**
   - **Ingestion Worker:** Loop assíncrono que detecta quando um novo documento muda para `UPLOADING` ou `PROCESSING` e orquestra as tarefas.
   - **Document Processing:** API HTTP interna (Axum, porta 8000) que faz a leitura física do arquivo e divide o texto em parágrafos/blocos.
   - **Embedding Service:** API HTTP interna (Axum, porta 8000) que faz chamadas externas para geração de vetores com dimensionalidade parametrizável de acordo com o modelo configurado.
