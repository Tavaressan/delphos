# Núcleo Java, Requisitos

## Visão Geral
O módulo `nucleo-java` é a API principal desenvolvida em Spring Boot, responsável por centralizar regras de negócio, persistir metadados, processar autenticação baseada em JWT com controle de acesso RBAC, gerenciar o histórico de chats e registrar logs de auditoria de conformidade.

---

## Responsabilidades
* **Gerenciamento de Usuários e Perfis:** CRUD de usuários e associação a papéis (`ROLE_ADMIN`, `ROLE_USER`).
* **Segurança e RBAC:** Garantir que endpoints críticos exijam privilégios específicos (ex: `DELETE_DOCUMENTS` ou `VIEW_AUDIT_LOGS`).
* **Controle de Documentos (Metadados):** Registrar documentos enviados, salvar em storage S3 local (MinIO) e gerenciar estados do ciclo de vida.
* **Histórico de Conversas (Chat):** Persistir mensagens e chats criados.
* **Logs de Auditoria:** Gravar de forma transparente ações de segurança críticas.

---

## Regras de Negócio
* **[BR01] Autenticação e RBAC Estrito:** O sistema possui papéis e permissões associadas. Um usuário com `ROLE_USER` só pode ler e enviar documentos. Um usuário com `ROLE_ADMIN` pode remover documentos, ler logs de auditoria e gerenciar usuários.
  * *Status:* 🟢 CONFIRMADO (extraído de `V1__init_schema.sql`).
* **[BR02] Migrações Automatizadas de Banco:** O esquema do PostgreSQL deve ser estruturado de forma consistente e automática utilizando Flyway. A inicialização do banco cria extensões críticas (`vector` e `uuid-ossp`) e popula dados básicos (seed de papéis e permissões).
  * *Status:* 🟢 CONFIRMADO (extraído de `V1__init_schema.sql` e `application.yml`).

---

## Requisitos Funcionais

| ID | Requisito | Prioridade | Critério de Aceite |
|----|-----------|------------|-------------------|
| RF-01 | CRUD e Autenticação de Usuários | Must | Login seguro de usuários contra hash bcrypt armazenado. |
| RF-02 | Armazenamento de Metadados de Documentos | Must | Registrar arquivo com nome, tipo, tamanho e chave de referência no MinIO. |
| RF-03 | Gerenciamento de Chats e Mensagens | Must | Permitir criar sessões de chats e append de mensagens associando-as ao usuário autor. |
| RF-04 | Geração Automática de Logs de Auditoria | Must | Gravar ações sensíveis (login, upload, remoção, queries) com IP e User-Agent. |

---

## Requisitos Não Funcionais

| Tipo | Requisito inferido | Evidência no código | Confiança |
|------|--------------------|---------------------|-----------|
| Performance | Armazenamento e busca por vetores HNSW com dimensionalidade parametrizável | `V1__init_schema.sql:114` | 🟢 |
| Segurança | Migrações seguras e sem alterações em ddl-auto JPA (`validate`) | `application.yml:15` | 🟢 |
| Escalabilidade | Redis configurado para cache distribuído / sessão | `application.yml:27` | 🟢 |

---

## Critérios de Aceitação

```gherkin
Dado que um usuário com ROLE_USER tenta visualizar os logs de auditoria
Quando envia uma requisição HTTP GET para /api/audit-logs
Então o sistema deve bloquear o acesso retornando status HTTP 403 Forbidden

Dado que um arquivo é carregado com sucesso pelo DocumentService
Quando o registro é criado no banco de dados
Então o status do documento deve ser definido inicialmente como 'UPLOADING'
```

---

## Prioridade (MoSCoW)

| Requisito | MoSCoW | Justificativa |
|-----------|--------|---------------|
| Controle de Acesso e RBAC no banco | Must | Requisito crítico de segurança e conformidade corporativa |
| Integração com PostgreSQL/pgvector e Flyway | Must | Estruturação de dados relacionais e vetoriais do RAG |
| Cache Redis para sessões/consultas | Should | Acelera carregamento de metadados e conversas repetitivas |

---

## Rastreabilidade de Código

| Arquivo | Função / Classe | Cobertura |
|---------|-----------------|-----------|
| `java-core/src/main/resources/db/migration/V1__init_schema.sql` | Estrutura de banco e seeds | 🟢 |
| `java-core/src/main/resources/application.yml` | Configurações do Spring Boot | 🟢 |
| `java-core/src/main/java/com/company/core/Application.java` | Classe de inicialização | 🟢 |
