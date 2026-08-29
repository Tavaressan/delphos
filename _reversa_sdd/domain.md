# Domínio e Regras de Negócio

## Glossário

- **Agent (Agente):** Uma entidade autônoma baseada em IA, configurada a partir de um pacote ZIP contendo instruções (prompt `.md`), custom tools (scripts `.py`) e documentos de conhecimento (Knowledge Base).
- **Tenant:** Entidade organizacional que isola os dados. Agentes, Documentos e Execuções pertencem a um Tenant.
- **AgentExecution (Execução):** Uma instância de execução de um agente em resposta a uma solicitação (prompt) de um usuário, processada via RabbitMQ de forma assíncrona.
- **RAG (Retrieval-Augmented Generation):** Técnica de injetar chunks de documentos relevantes no contexto do LLM para responder a perguntas, mediado por embeddings e buscas vetoriais no `pgvector`.
- **Custom Tool:** Um script Python customizado anexado ao agente para dar habilidades específicas. Roda num sandbox seguro.
- **Chunk:** Pedaço de texto de um documento que foi segmentado, vetorizado e salvo no PostgreSQL com suporte nativo a overlap.

## Regras de Domínio (Business Rules)

### 1. Regras de Construção e Validação de Agente
- 🟢 **CONFIRMADO:** O upload do pacote do Agente deve ser estritamente em formato `.zip`. Submissão de arquivos `.md` avulsos ou fora da estrutura raiz é bloqueada (Issue #110).
- 🟢 **CONFIRMADO:** O tamanho descompactado máximo do pacote ZIP do Agente é de 20MB.
- 🟢 **CONFIRMADO:** Nomes de arquivos contidos no ZIP são sanitizados rigorosamente para prevenir Path Traversal (`../`).
- 🟢 **CONFIRMADO:** Ferramentas customizadas (tools) passam por um regex validatório `TOOL_NAME_PATTERN`.
- 🟢 **CONFIRMADO:** Documentos PDF contendo JavaScript embutido (risco de XSS) ou com Magic Bytes inválidos são rejeitados no processamento.

### 2. Regras de Execução de Custom Tools (Sandbox)
- 🟢 **CONFIRMADO:** Scripts Python acionados pelos agentes executam num ambiente de sandbox local (subprocesso `python3 -I`) via `executor_core.py`.
- 🟢 **CONFIRMADO:** O sandbox desabilita variáveis de ambiente e possui restrição rigorosa de timeout e cota máxima de caracteres de saída (`MAX_OUTPUT_CHARS`).
- 🟢 **CONFIRMADO:** Antes da execução, uma análise AST proíbe imports maliciosos e *dunder methods* (métodos mágicos do Python).

### 3. Regras de Resiliência de IA (Fallbacks)
- 🟢 **CONFIRMADO:** Há um padrão de Fallback LLM (`FallbackLLM`) que tenta rotear a inferência primeiramente para o Google AI Studio e recai silenciosamente para o Vertex AI no GCP em caso de falha da API.
- 🟡 **INFERIDO:** O LLM padrão de Embedding foi migrado de `text-embedding-004` para `gemini-embedding-001` (Feature/Issue #296).

### 4. Regras de Resiliência da Fila e Processamento Assíncrono
- 🟢 **CONFIRMADO:** Envio de mensagens para filas RabbitMQ (como eventos de `document.ingestion.jobs`) só é efetivado caso o commit na transação do banco (JPA) tenha sucesso (`TransactionSynchronizationManager`).
- 🟢 **CONFIRMADO:** Documentos estagnados em `PROCESSING` por falha crítica são recuperados por um *heartbeat reaper* nativo no Rust e enviados à DLQ em caso de erro contínuo.
- 🟢 **CONFIRMADO:** Trabalhadores (Python/CrewAI) sofrem *auto-restart* intencional se erros críticos acumularem (`StackDepthExceededError` cruzando o `POISON_THRESHOLD`) para limpar a memória vazada (Issue #391).
- 🟢 **CONFIRMADO:** A substituição de chunks numa re-indexação ocorre numa transação atômica que apaga chunks velhos antes de inserir novos.

### 5. Regras de Multi-Tenancy (Isolamento)
- 🟢 **CONFIRMADO:** Operações de leitura (Retrieval) e de Ingestão injetam e validam compulsoriamente o UUID do `tenant_id` para não misturar documentos ou vetores de tenants diferentes.

### 6. Regras de Interface e Auditoria
- 🟡 **INFERIDO:** Logs de auditoria (`AuditLog`) guardam informações de endereço IP e `User-Agent` de quem faz alterações sensíveis (como `CREATE_AGENT`), segregados por tenant.
- 🟢 **CONFIRMADO:** Operações de agendamento (`Schedule`) executam o agente com um `prompt` definido na cadência dada por `cronExpression`.
