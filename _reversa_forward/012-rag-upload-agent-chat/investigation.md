# Technical Investigation: Ingestão de Documentos e Chat com Agentes

Este documento detalha as pesquisas técnicas, alternativas avaliadas e padrões aplicáveis para a implementação do upload de documentos e chat com agentes personalizados.

---

## 1. Pesquisa de Fundo e Integrações

### 1.1. Processamento e Descompactação de ZIP no Backend Java
Para o provisionamento de agentes via ZIP contendo arquivos Markdown (`.md`) e outros arquivos de suporte, a API Central (`java-core`) utilizará a biblioteca nativa `java.util.zip` para extração em memória (streaming). 
*   **Validação estrutural rápida:** A leitura do cabeçalho do ZIP é feita sequencialmente via `ZipInputStream` para evitar ataques de *Zip Bomb* (limitando a descompactação a no máximo 20MB de tamanho total de arquivos).
*   **Identificação do Markdown:** O backend deve encontrar pelo menos um arquivo `.md` na raiz do arquivo para armazenar as instruções de comportamento do agente.

### 1.2. Upload para MinIO e Ingestão Assíncrona no Rust
*   Os arquivos de suporte do agente (PDF, DOCX, TXT, etc.) extraídos do ZIP são armazenados no MinIO no bucket `agents-data`.
*   Para cada arquivo, é inserido um registro na tabela `documents` do PostgreSQL com o status `PROCESSING` e o `agent_id` correspondente.
*   O microsserviço de Rust `ingestion-worker` detecta as novas linhas, realiza chamadas HTTP locais na porta 8000 para `document-processing` (extração de texto) e `embedding-service` (geração de vetores de embeddings) e grava os chunks resultantes na tabela `document_chunks`.

### 1.3. Busca Semântica Isolada no PostgreSQL (`pgvector`)
Para garantir o isolamento RAG de cada agente (RN-03), a pesquisa vetorial por similaridade de cosseno com índice HNSW deve filtrar os trechos pelo `agent_id`:
```sql
SELECT dc.id, dc.content, (dc.embedding <=> :user_query_vector) AS distance
FROM document_chunks dc
INNER JOIN documents d ON dc.document_id = d.id
WHERE d.agent_id = :agent_id
ORDER BY dc.embedding <=> :user_query_vector ASC
LIMIT :limit_val;
```
Se for uma conversa geral da organização (sem agente ativo), a query deve filtrar apenas documentos onde `d.agent_id IS NULL`.

---

## 2. Alternativas Avaliadas

### Alternativa A: Armazenar markdowns de regras no MinIO e ler sob demanda
*   *Descrição:* O backend do chat leria o arquivo markdown correspondente ao agente do MinIO a cada mensagem.
*   *Prós:* Mantém o banco relacional sem novos campos de texto volumosos.
*   *Contras:* Requer uma requisição de rede extra ao MinIO para cada mensagem de chat enviada pelo usuário, aumentando a latência do chat.
*   *Veredito:* **Descartada**. Salvar as instruções na tabela relacional `agents` como texto puro otimiza drasticamente as chamadas de chat.

### Alternativa B: Realizar todo o processamento do ZIP no microsserviço Rust
*   *Descrição:* O frontend enviaria o ZIP diretamente ao microsserviço Rust para descompactação, validação e persistência.
*   *Prós:* Aproveita a alta performance de I/O do Rust.
*   *Contras:* Quebra a arquitetura fundamentada do monorepo (`java-core` como orquestrador relacional e RBAC central). O Rust não gerencia sessões de chats ou tabelas de usuários.
*   *Veredito:* **Descartada**. O Spring Boot (`java-core`) atua como gateway de validação e escrita relacional, mantendo o Rust focado puramente em CPU-bound tasks (chunks e vetores).

---

## 3. Padrões Aplicáveis

*   **RESTful API Errors:** Retornar mensagens de erro HTTP 400 estruturadas no padrão RFC 7807 (Problem Details for HTTP APIs).
*   **HNSW (Hierarchical Navigable Small World):** Utilizar busca vetorial aproximada no pgvector acelerada por índices HNSW para garantir latência de busca abaixo de 100ms.
*   **Streaming de LLM:** Assegurar que as mensagens de chat com o agente possam ser retornadas em formato de Server-Sent Events (SSE) a partir do backend Next.js/Java Core.
