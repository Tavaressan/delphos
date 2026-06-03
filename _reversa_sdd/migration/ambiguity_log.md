# Dicionário de Decisões e Resoluções de Ambiguidades

Este documento registra as decisões tomadas para consolidar e harmonizar os requisitos e especificações da **Enterprise Agent Operating Platform**, divididas em cinco categorias fundamentais.

---

## 1. Grupo: AUTHORITATIVE (Decisões soberanas da arquitetura-alvo)
- **Criptografia e Autenticação:** Apenas JWT Stateless com BCrypt (MD5 legado e migrações são invalidadas). CAPTCHA em Redis.
- **Banco de Dados Unificado:** PostgreSQL com a extensão `pgvector` é a única fonte de persistência vetorial e relacional. A dimensionalidade dos vetores deverá ser parametrizável e compatível com o modelo de embeddings configurado para cada coleção vetorial, evitando acoplamento a provedores ou modelos específicos. O MongoDB foi removido das especificações.
- **Comunicação por Eventos:** RabbitMQ é o backbone assíncrono oficial. FastAPI permanente foi removido do pipeline.
- **Plataforma Operacional:** Kubernetes com KEDA é a infraestrutura de deployment de workers efêmeros baseados em filas.
- **Armazenamento de Arquivos:** buckets S3 no MinIO (sem dependência de armazenamento físico local nos containers).

## 2. Grupo: KEEP (Funcionalidades funcionais exclusivas mantidas)
- **TOTP / 2FA (LibreChat):** Validação obrigatória de token em fluxos de deleção de conta se habilitada.
- **Exclusividade de Tipo de Favoritos (LibreChat):** Limite estrito de 50 itens de favoritos compostos apenas por um ID de recurso.
- **Contratos de Skills e MCP (LibreChat):** Parsing de diretivas `alwaysApply` e suporte ao Model Context Protocol para conexões.
- **Sandbox Groovy (MaxKB4j):** Isolamento de três camadas (AST, Whitelist e Timeout de 60s) para ferramentas de script.
- **Memória de Longo Prazo (MaxKB4j):** Análise cíclica a cada 10 mensagens dividida nos 4 pilares.

## 3. Grupo: MERGE (Capacidades equivalentes consolidadas)
- **Cadastro e Login:** O fluxo de cadastro de usuários e regras de anti-enumeração de e-mail do LibreChat foram integrados ao modelo de contas relacional.
- **Controle RBAC:** Perfis de acesso padrão `ROLE_USER` e administradores `ROLE_ADMIN` integrados aos esquemas SQL do banco.

## 4. Grupo: ADAPT (Adaptações técnicas necessárias)
- **Armazenamento de Sessões:** A coleção `sessions` do MongoDB (LibreChat) foi adaptada para o controle do NextAuth (Auth.js) utilizando cookies HTTPOnly seguros.
- **Busca Híbrida:** A busca híbrida do MaxKB4j foi portada para executar paralelamente buscas de texto completo (FTS) e similaridade de cosseno (pgvector) no PostgreSQL, removendo o MongoDB.
- **Double-Write de Vetores:** A regra de dupla escrita foi adaptada para escrever em uma única transação SQL as tabelas de metadados relacionais e a tabela `document_chunks`.
- **Desacoplamento de Memória:** O estado conversacional que ficava acoplado no runtime do CrewAI foi adaptado para persistir de forma externa e soberana nos serviços dedicados `Memory Service`, `Conversation Store` e `Execution Store`.

## 5. Grupo: DISCARD (Padrões obsoletos descartados)
- **FastAPI permanente:** Descartado para alinhar o pipeline com a arquitetura reativa a eventos do RabbitMQ.
- **Hashes MD5:** Descartados por motivos de segurança e conformidade corporativa.
- **MongoDB do MaxKB4j:** Descartado para simplificar a stack técnica unificando em PostgreSQL.
- **Armazenamento Local:** Arquivos locais nos containers foram descartados em prol de buckets MinIO.
