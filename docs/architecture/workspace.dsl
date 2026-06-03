workspace "Alfabra Vector" "Plataforma Enterprise Corporativa com IA e RAG" {

    model {

        user = person "Colaborador" "Usuário interno da plataforma corporativa"
        admin = person "Administrador" "Responsável pela gestão da plataforma"

        enterpriseRag = softwareSystem "Alfabra Vector" "Plataforma corporativa com IA e arquitetura RAG" {

            frontend = container "Frontend Next.js" "Interface web corporativa moderna" "Next.js 15 + React + TypeScript"
            anythingllm = container "AnythingLLM" "Engine RAG desacoplada" "AnythingLLM"
            postgres = container "PostgreSQL + pgvector" "Persistência relacional e vetorial" "PostgreSQL"
            redis = container "Redis" "Cache, sessões e otimizações" "Redis"
            minio = container "MinIO / S3" "Armazenamento de documentos" "Object Storage"
            nginx = container "Nginx Reverse Proxy" "Proxy reverso HTTPS e roteamento" "Nginx"
            rustDocumentProcessing = container "Rust Document Processing" "Processamento de documentos" "Rust"
            rustEmbeddingService = container "Rust Embedding Service" "Pipeline de embeddings" "Rust"
            rustIngestionWorker = container "Rust Ingestion Worker" "Workers assíncronos de ingestão" "Rust"
            monitoring = container "Monitoring Stack" "Observabilidade futura" "Prometheus + Grafana + OpenTelemetry"

            javaCore = container "Java Core API" "Core de negócio e orquestração RAG" "Java 21 + Spring Boot" {

                authController = component "Auth Controller" "Endpoints de autenticação" "Spring REST Controller"
                chatController = component "Chat Controller" "Endpoints de chat IA" "Spring REST Controller"
                documentController = component "Document Controller" "Endpoints de upload e documentos" "Spring REST Controller"
                adminController = component "Admin Controller" "Endpoints administrativos" "Spring REST Controller"

                authUseCases = component "Authentication Use Cases" "Casos de uso de autenticação" "Application Layer"
                ragUseCases = component "RAG Orchestration Use Cases" "Orquestração RAG" "Application Layer"
                documentUseCases = component "Document Use Cases" "Casos de uso documentais" "Application Layer"
                auditUseCases = component "Audit Use Cases" "Casos de uso de auditoria" "Application Layer"
                userUseCases = component "User Management Use Cases" "Gestão de usuários" "Application Layer"

                domainLayer = component "Domain Layer" "Entidades e regras de negócio" "Pure Java Domain"

                authInfrastructure = component "Auth Infrastructure" "JWT e Spring Security" "Infrastructure Layer"
                persistenceInfrastructure = component "Persistence Infrastructure" "JPA, Repositories e ORM" "Infrastructure Layer"
                ragInfrastructure = component "RAG Infrastructure" "Integração AnythingLLM e Vertex AI" "Infrastructure Layer"
                storageInfrastructure = component "Storage Infrastructure" "Integração MinIO/S3" "Infrastructure Layer"
                loggingInfrastructure = component "Logging Infrastructure" "Logs e auditoria" "Infrastructure Layer"

                authController -> authUseCases "Executa"
                chatController -> ragUseCases "Executa"
                documentController -> documentUseCases "Executa"
                adminController -> userUseCases "Executa"
                adminController -> auditUseCases "Executa"

                authUseCases -> domainLayer "Aplica regras"
                ragUseCases -> domainLayer "Aplica regras"
                documentUseCases -> domainLayer "Aplica regras"
                auditUseCases -> domainLayer "Aplica regras"
                userUseCases -> domainLayer "Aplica regras"

                authUseCases -> authInfrastructure "Usa"
                ragUseCases -> ragInfrastructure "Usa"
                documentUseCases -> storageInfrastructure "Usa"
                auditUseCases -> loggingInfrastructure "Usa"
                userUseCases -> persistenceInfrastructure "Usa"

                persistenceInfrastructure -> postgres "Persiste dados"
                authInfrastructure -> redis "Sessões e cache"
                ragInfrastructure -> anythingllm "Consulta RAG"
                storageInfrastructure -> minio "Armazena documentos"
                loggingInfrastructure -> postgres "Registra auditoria"
            }
        }

        vertexAI = softwareSystem "Vertex AI / Gemini 2.5 Pro" "LLM e embeddings"

        user -> frontend "Utiliza via navegador"
        admin -> frontend "Administra plataforma"

        frontend -> nginx "HTTPS"
        nginx -> frontend "Entrega frontend"
        nginx -> javaCore "Proxy API REST"

        frontend -> javaCore "Consome APIs REST"

        javaCore -> postgres "Lê e escreve dados"
        javaCore -> redis "Cache e sessões"
        javaCore -> anythingllm "Orquestra RAG"
        javaCore -> minio "Gerencia uploads"
        javaCore -> monitoring "Envia métricas e logs"

        anythingllm -> vertexAI "LLM e embeddings"
        anythingllm -> postgres "Busca vetorial"

        rustDocumentProcessing -> minio "Lê documentos"
        rustDocumentProcessing -> rustEmbeddingService "Envia chunks"

        rustEmbeddingService -> postgres "Salva embeddings"
        rustEmbeddingService -> vertexAI "Gera embeddings"

        rustIngestionWorker -> rustDocumentProcessing "Executa pipelines"
        rustIngestionWorker -> monitoring "Envia métricas"

        frontend -> minio "Upload indireto"
        
        # Mapeamento do Ambiente de Desenvolvimento no Model
        deploymentEnvironment "development" {
            deploymentNode "Developer Machine" "Ubuntu Server" "Docker" {
                deploymentNode "Docker Compose" "Ambiente Local" "Container Runtime" {
                    containerInstance nginx
                    containerInstance frontend
                    containerInstance javaCore
                    containerInstance anythingllm
                    containerInstance postgres
                    containerInstance redis
                    containerInstance minio
                    containerInstance rustDocumentProcessing
                    containerInstance rustEmbeddingService
                    containerInstance rustIngestionWorker
                }
            }
        }

        # Mapeamento do Ambiente de Produção no Model
        deploymentEnvironment "production" {
            deploymentNode "Production Server" "Ubuntu Server" "Linux" {
                deploymentNode "Reverse Proxy Layer" "HTTPS Gateway" "Nginx" {
                    containerInstance nginx
                }
                deploymentNode "Application Layer" "Core Services" "Docker" {
                    containerInstance frontend
                    containerInstance javaCore
                    containerInstance anythingllm
                }
                deploymentNode "Processing Layer" "Async Processing" "Docker" {
                    containerInstance rustDocumentProcessing
                    containerInstance rustEmbeddingService
                    containerInstance rustIngestionWorker
                }
                deploymentNode "Data Layer" "Persistence" "Docker" {
                    containerInstance postgres
                    containerInstance redis
                    containerInstance minio
                }
                deploymentNode "Observability Layer" "Monitoring" "Docker" {
                    containerInstance monitoring
                }
            }
        }
    }

    views {

        systemContext enterpriseRag "system-context" {
            include *
            autolayout lr
        }

        container enterpriseRag "containers" {
            include *
            autolayout lr
        }

        component javaCore "java-core-components" {
            include *
            autolayout tb
        }

        dynamic enterpriseRag "rag-upload-flow" {
            title "Fluxo de Upload e Indexação"

            user -> frontend "Envia documento"
            frontend -> javaCore "Upload"
            javaCore -> minio "Armazena arquivo"
            rustIngestionWorker -> rustDocumentProcessing "Inicia pipeline"
            rustDocumentProcessing -> rustEmbeddingService "Chunking"
            rustEmbeddingService -> vertexAI "Gera embeddings"
            rustEmbeddingService -> postgres "Armazena embeddings"
        }

        dynamic enterpriseRag "rag-query-flow" {
            title "Fluxo de Consulta RAG"

            user -> frontend "Realiza pergunta"
            frontend -> javaCore "Consulta IA"
            javaCore -> anythingllm "Orquestra RAG"
            anythingllm -> postgres "Busca vetorial"
            anythingllm -> vertexAI "Geração contextualizada"
            javaCore -> anythingllm "Resposta contextualizada"
            javaCore -> frontend "Streaming/resposta"
        }

        deployment * "development" "development-deployment" {
            title "Implantação de Desenvolvimento - Ambiente Local"
            include *
            autolayout lr
        }

        deployment * "production" "production-deployment" {
            title "Implantação de Produção - Infraestrutura"
            include *
            autolayout tb
        }

        styles {

            element "Person" {
                background "#08427b"
                color "#ffffff"
                shape person
                fontSize 22
            }

            element "Software System" {
                background "#1168bd"
                color "#ffffff"
                fontSize 20
            }

            element "Container" {
                background "#438dd5"
                color "#ffffff"
                fontSize 18
            }

            element "Component" {
                background "#85bbf0"
                color "#000000"
                fontSize 16
            }

            element "Database" {
                shape cylinder
            }

            relationship "Relationship" {
                thickness 2
                color "#707070"
                routing direct
                fontSize 14
            }
        }

        themes default
    }

    configuration {
        scope softwaresystem
    }
}
