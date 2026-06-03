# Diagrama C4 — Componentes (Nível 3)

Este diagrama detalha a estrutura interna dos dois principais containers do sistema: **Java Core API** e o pipeline de **Rust Services**.

```mermaid
flowchart TB
    %% Estilos dos elementos do C4
    classDef component fill:#85BBF0,stroke:#6AA8E2,color:#000000,stroke-width:2px;
    classDef container fill:#438DD5,stroke:#3B7BB9,color:#FFFFFF,stroke-width:2px;
    classDef database fill:#1168BD,stroke:#0F5CA6,color:#FFFFFF,stroke-width:2px;

    subgraph CorePlatform ["Container: Java Core (Spring Boot)"]
        subgraph Controllers ["Camada de Controladores (REST Controllers)"]
            authCtrl["AuthController\nGerencia login de usuários, autenticação e tokens JWT."]:::component
            docCtrl["DocumentController\nRecebe uploads de arquivos e gerencia metadados de documentos."]:::component
            chatCtrl["ChatController\nEndpoints para criação de chats, envio de mensagens e histórico."]:::component
            auditCtrl["AuditLogController\nExibe logs de segurança para administradores."]:::component
        end

        subgraph Services ["Camada de Serviços (Business Logic)"]
            securitySvc["SecurityService\nValida papéis (ROLE_ADMIN, ROLE_USER) e permissões por endpoint."]:::component
            docSvc["DocumentService\nSalva o arquivo no MinIO, altera status para UPLOADING e dispara a ingestão."]:::component
            chatSvc["ChatService\nRecupera contexto histórico e envia prompts enriquecidos com RAG."]:::component
            auditSvc["AuditLogService\nIntercepta requisições e salva logs detalhados de auditoria."]:::component
        end

        subgraph Repositories ["Camada de Acesso a Dados (Spring Data JPA)"]
            userRepo["UserRepository\nInterface para tabela users e roles."]:::component
            docRepo["DocumentRepository\nInterface para tabela documents e chunks."]:::component
            chatRepo["ChatRepository\nInterface para tabela chats e mensagens."]:::component
            auditRepo["AuditLogRepository\nInterface para tabela audit_logs."]:::component
        end
    end

    subgraph RustPipeline ["Container: Rust Services (Tokio / Axum)"]
        subgraph IngestionWorker ["ingestion-worker (Rust Daemon)"]
            jobPoller["Job Poller\nVerifica no Postgres novos documentos com status UPLOADING/PROCESSING."]:::component
            svcDispatcher["Service Dispatcher\nChama os microsserviços de parser e embedding e atualiza o status do doc."]:::component
        end
        
        subgraph DocProc ["document-processing (Axum)"]
            parserEngine["File Parser Engine\nProcessa PDFs/TXTs e realiza o chunking de texto."]:::component
        end
        
        subgraph EmbedSvc ["embedding-service (Axum)"]
            embedderEngine["Embedding Engine\nChama APIs de LLM externas para gerar vetores com dimensionalidade parametrizável."]:::component
        end
    end

    %% Bancos de Dados Externos ao Container
    postgres[("Postgres DB / pgvector")]:::database
    minio[("MinIO Object Storage")]:::database

    %% Relações do Core Platform
    authCtrl --> securitySvc
    docCtrl --> docSvc
    chatCtrl --> chatSvc
    auditCtrl --> auditSvc

    securitySvc --> userRepo
    docSvc --> docRepo
    docSvc --> minio
    chatSvc --> chatRepo
    auditSvc --> auditRepo

    userRepo & docRepo & chatRepo & auditRepo --> postgres

    %% Relações do Rust Pipeline
    jobPoller -->|"Polling"| postgres
    jobPoller --> svcDispatcher
    svcDispatcher -->|"HTTP POST"| parserEngine
    svcDispatcher -->|"HTTP POST"| embedderEngine
    svcDispatcher -->|"Grava chunks e atualiza status"| postgres
```

---

## 1. Componentes Internos da Java Core API

* **Controladores (Controllers):** Recebem requisições HTTP do Frontend. O `AuthController` intercepta logins; o `DocumentController` cuida dos uploads; o `ChatController` fornece respostas aos usuários; e o `AuditLogController` expõe dados ao administrador.
* **Serviços (Services):** Camada onde residem as regras de domínio. O `SecurityService` aplica o RBAC. O `DocumentService` inicia a escrita do arquivo bruto no MinIO e do metadado no Postgres. O `ChatService` orquestra a composição do prompt com o contexto recuperado por RAG. O `AuditLogService` é chamado por AOP (Aspect-Oriented Programming) ou filtros para auditar requisições críticas de forma automática.
* **Repositórios (Repositories):** Mapeamento relacional de tabelas de banco de dados via Spring Data JPA para realizar operações de CRUD no PostgreSQL.

---

## 2. Componentes Internos dos Rust Services

* **Job Poller (ingestion-worker):** Um daemon assíncrono Tokio que monitora continuamente no Postgres os documentos que necessitam de processamento.
* **Service Dispatcher (ingestion-worker):** Coordena o pipeline enviando o arquivo temporário para o `document-processing`, recuperando os trechos, enviando ao `embedding-service` para calcular os vetores e inserindo em lote (`batch insert`) os chunks na tabela `document_chunks`.
* **File Parser Engine (document-processing):** Lê os bytes do documento e extrai o texto plano, dividindo-o em trechos lógicos (chunks).
* **Embedding Engine (embedding-service):** Comunica-se com provedores externos via REST para retornar os arrays de floats da dimensão configurada.
