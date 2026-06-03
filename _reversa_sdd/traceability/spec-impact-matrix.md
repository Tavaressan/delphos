# Matriz de Impacto de Especificações (Spec Impact Matrix)

Este documento rastreia e resume a cadeia de dependências e os impactos em cascata caso ocorram falhas ou alterações em componentes específicos do sistema.

---

## 1. Matriz de Dependência e Impacto

| Componente | Depende Diretamente De | Se Alterado/Falhar, Impacta | Tipo de Impacto | Criticidade |
|------------|------------------------|-----------------------------|-----------------|-------------|
| **Caddy** | `frontend` | *(Atores Externos)* | Bloqueio total de conexões externas e corporativas (HTTPS/TLS) | Alta |
| **Frontend** | `core` | `caddy` | Falhas na UI, incapacidade de login, chat ou uploads | Alta |
| **Java Core (Spring Boot)** | `postgres`, `redis`, `minio` | `frontend` | Parada total da lógica de negócio, autenticação JWT, logs e chats | Crítica |
| **Postgres (pgvector)** | *(Nenhum)* | `core`, `ingestion-worker`, `anythingllm` | Indisponibilidade completa do estado da aplicação, sessões e busca semântica | Crítica |
| **Redis** | *(Nenhum)* | `core` | Queda de performance e erros em rotas que dependem de cache/sessões | Média |
| **MinIO** | *(Nenhum)* | `core`, `ingestion-worker` | Falha geral de escrita e leitura física dos documentos brutos enviados | Alta |
| **Ingestion Worker (Rust)** | `postgres`, `document-processing`, `embedding-service` | `postgres` (chunks) | Interrupção da vetorização. Documentos ficam travados nos estados iniciais | Alta |
| **Document Processing (Rust)** | *(Nenhum)* | `ingestion-worker` | Erros na extração física de texto. Documentos marcam status como `FAILED` | Alta |
| **Embedding Service (Rust)** | *(Apis Externas)* | `ingestion-worker` | Impossibilidade de gerar vetores semânticos. Documentos marcam `FAILED` | Alta |

---

## 2. Análise de Cascata de Modificações (Impacto em Casos Comuns)

### 2.1. Alteração no Provedor de Embedding (ex: Mudar de OpenAI para Gemini)
* **Componente de Entrada:** `embedding-service` (Rust)
* **Componentes Impactados em Cascata:**
  * **`document_chunks` (Postgres):** Como a dimensionalidade é parametrizável e compatível com o modelo configurado, a alteração exige apenas a configuração correspondente no modelo de embeddings da coleção e a reconstrução do índice HNSW.
  * **`chat_messages` / `chats` (Java Core):** O serviço Java precisará passar a usar o mesmo modelo e dimensões para converter as queries de busca do usuário em vetores coerentes para cosseno.
* **Complexidade da Alteração:** Alta (Alteração de esquema vetorial e código).

### 2.2. Alteração no Mecanismo de Armazenamento de Documentos (ex: Mover de MinIO para AWS S3)
* **Componente de Entrada:** `core` (Java) e `ingestion-worker` (Rust)
* **Componentes Impactados em Cascata:**
  * **`documents.file_path` (Postgres):** As URLs ou chaves de arquivo precisam ser atualizadas ou migradas no banco.
  * **Variáveis de Ambiente:** Alteração de endpoints de conexão S3 em arquivos de configuração e Docker Compose.
* **Complexidade da Alteração:** Média.

### 2.3. Adição de um Novo Papel de Usuário (ex: `ROLE_AUDITOR`)
* **Componente de Entrada:** `postgres` (Tabelas `roles` e `role_permissions`)
* **Componentes Impactados em Cascata:**
  * **`core` (Java Security):** O Spring Security precisará reconhecer o novo papel em suas anotações `@PreAuthorize`.
  * **`frontend` (Next.js):** Lógica condicional de renderização de abas no dashboard.
* **Complexidade da Alteração:** Baixa.
