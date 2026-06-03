# Glossário e Regras de Domínio

Documento gerado pelo agente **Detective** para consolidar a terminologia e as regras de negócio implícitas identificadas no projeto legado.

---

## 1. Glossário de Termos

### 1.1. Core e Negócio
* **Usuário (User):** Indivíduo cadastrado na plataforma com credenciais (`username`, `email`, `password_hash`). Possui um status operacional (ex: `ACTIVE`) e papéis que definem seu nível de acesso.
* **Papel (Role):** Agrupamento lógico de permissões que padroniza o controle de acesso de categorias de usuários (ex: `ROLE_ADMIN` para administradores, `ROLE_USER` para colaboradores comuns).
* **Permissão (Permission):** Ação granular autorizada no sistema (ex: `READ_DOCUMENTS`, `WRITE_DOCUMENTS`).
* **Log de Auditoria (Audit Log):** Registro imutável de eventos e ações de segurança executadas pelos usuários (ex: logins, uploads, consultas ao RAG). Armazena IP, User-Agent e metadados adicionais em formato estruturado (JSONB).

### 1.2. RAG e Processamento de Documentos
* **Documento (Document):** Arquivo digital (PDF, DOCX, TXT, etc.) enviado à plataforma. Possui metadados como tamanho, tipo e um ciclo de estados de processamento.
* **Trecho de Documento (Document Chunk):** Fragmento menor de texto extraído de um documento para otimizar a recuperação de informações pelo modelo de IA.
* **Vetor de Embedding (Embedding Vector):** Vetor numérico com dimensionalidade parametrizável que representa semanticamente o conteúdo de um trecho (chunk), permitindo buscas por similaridade matemática.
* **Banco de Dados Relacional e Vetorial:** Banco unificado (PostgreSQL) estendido com a extensão `pgvector` para persistência tanto de metadados relacionais quanto de vetores de alta dimensão.
* **Conversa (Chat):** Sessão de chat criada por um usuário para interagir com o assistente baseado no contexto dos documentos indexados.
* **Mensagem de Conversa (Chat Message):** Mensagem enviada ou recebida em um chat, associada a um papel de autor (`USER`, `ASSISTANT`, `SYSTEM`).

### 1.3. Infraestrutura e Serviços
* **Ingestion Worker:** Serviço assíncrono em Rust que processa de forma independente as filas de ingestão de documentos e geração de chunks.
* **Document Processing Service:** Microsserviço em Rust especializado na extração de texto de arquivos brutos.
* **Embedding Service:** Microsserviço em Rust dedicado a fazer interface com APIs de LLM/Embeddings para gerar os vetores com dimensionalidade parametrizável.
* **Caddy:** Servidor web e proxy reverso que atua como ponto de entrada HTTPS único, gerenciando TLS automático integrado ao DuckDNS.
* **UFW (Uncomplicated Firewall):** Firewall de host configurado para limitar o acesso a portas críticas (SSH e HTTP/HTTPS) via regras de whitelist corporativa.

---

## 2. Regras de Domínio

### 2.1. Controle de Acesso (RBAC)
* **[DR01] Hierarquia de Papéis:** O sistema deve implementar controle de acesso estrito com dois papéis fundamentais:
  * **ROLE_ADMIN:** Possui acesso total e irrestrito (leitura/escrita/exclusão de documentos, visualização de logs de auditoria e gerenciamento de usuários).
  * **ROLE_USER:** Restrito a ler (`READ_DOCUMENTS`) e enviar/indexar documentos (`WRITE_DOCUMENTS`).
  * *Status:* 🟢 CONFIRMADO (extraído de `V1__init_schema.sql` e `modules.json`).
* **[DR02] Isolamento de Conversas:** Embora não explícito em `role_permissions`, as tabelas indicam que um `chat` pertence a um `user_id` específico, inferindo que um usuário comum não pode visualizar ou interagir com chats de outros usuários.
  * *Status:* 🟡 INFERIDO.

### 2.2. Pipeline RAG e Processamento
* **[DR03] Dimensionalidade Parametrizável de Vetores:** Todos os chunks de documentos gerados no sistema devem possuir embeddings com dimensionalidade parametrizável e compatível com o modelo de embeddings configurado para a coleção, evitando acoplamento a provedores ou modelos específicos.
  * *Status:* 🟢 CONFIRMADO (atualizado de `V1__init_schema.sql` para suportar `embedding vector(DIMENSION)` parametrizável).
* **[DR04] Busca por Similaridade de Cosseno:** A recuperação de trechos relevantes para alimentar o contexto do LLM deve utilizar a distância de cosseno (`vector_cosine_ops`), acelerada por índices HNSW.
  * *Status:* 🟢 CONFIRMADO (extraído de `V1__init_schema.sql` - `CREATE INDEX idx_chunks_embedding ON document_chunks USING hnsw (embedding vector_cosine_ops)`).
* **[DR05] Heartbeat de Ingestão:** O worker de ingestão deve enviar um sinal de vida ("heartbeat") ao console/sistema de monitoramento a cada 60 segundos de forma assíncrona.
  * *Status:* 🟢 CONFIRMADO (extraído de `ingestion-worker/src/main.rs`).
* **[DR06] Monitoramento de Microsserviços:** Os microsserviços de apoio (`document-processing` e `embedding-service`) devem obrigatoriamente responder com "OK" em chamadas HTTP GET para o endpoint `/healthz` na porta 8000.
  * *Status:* 🟢 CONFIRMADO (extraído de `main.rs` de ambos os serviços).

### 2.3. Segurança de Infraestrutura
* **[DR07] Restrição de Entrada no Firewall:** Apenas requisições vindas dos blocos de IP configurados em `CORP_WHITELIST_RANGE` (para HTTP/HTTPS) e `INFRA_IP_RANGE` (para SSH na porta 22) devem ser aceitas no host.
  * *Status:* 🟢 CONFIRMADO (extraído de `setup_firewall.sh`).
* **[DR08] Isolamento de Portas de Banco de Dados:** Nenhuma porta de banco de dados (PostgreSQL/pgvector) ou cache (Redis) deve ser exposta diretamente para o host ou redes externas, devendo ser acessíveis unicamente através da rede interna do Docker.
  * *Status:* 🟢 CONFIRMADO (extraído de `setup_firewall.sh` e `docker-compose.yml`).
