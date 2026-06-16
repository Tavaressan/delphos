# Legacy Impact Report: CI Pipeline Optimization & Security Hardening (Defense in Depth)

> Identificador: `013-ci-security-hardening`
> Data: `2026-06-16`

## 1. Tabela de Impactos no Legado

| Arquivo afetado | Componente | Tipo | Severidade | Justificativa |
|-----------------|------------|------|------------|---------------|
| `.github/workflows/ci.yml` | CI/CD Pipeline | `componente-novo` | MEDIUM | Atualização global do pipeline CI para suportar paralelização e cache poliglota. |
| `docker-compose.yml` | docker-compose | `componente-novo` | MEDIUM | Adição de container dedicado para o ClamAV daemon. |
| `java-core/src/main/resources/db/migration/V6__add_multi_tenancy_rls.sql` | Banco de Dados | `delta-de-dados` | HIGH | Inclusão de colunas `tenant_id` e habilitação do PostgreSQL Row Level Security (RLS). |
| `java-core/src/main/java/com/company/core/infrastructure/security/TenantInterceptor.java` | Spring Boot API | `regra-nova` | HIGH | Implementação de interceptador para extrair e validar o tenant ID via cabeçalho HTTP `X-Tenant-ID`. |
| `java-core/src/main/java/com/company/core/infrastructure/security/PromptInjectionInterceptor.java` | Spring Boot API | `regra-nova` | HIGH | Interceptador de chat com análise de risco contra Prompt Injection. |
| `java-core/src/main/java/com/company/core/infrastructure/security/FileUploadValidator.java` | Spring Boot API | `regra-nova` | HIGH | Validador de uploads por magic bytes (Apache Tika). |
| `java-core/src/main/java/com/company/core/infrastructure/security/ClamAvService.java` | Spring Boot API | `regra-nova` | HIGH | Serviço de escaneamento de malware integrado ao ClamAV local via TCP. |
| `frontend/src/lib/api-client.ts` | Frontend Client | `regra-nova` | MEDIUM | Injeção do header de tenant em chamadas HTTP. |
| `frontend/next.config.js` | Frontend Next.js | `regra-nova` | MEDIUM | Adição de cabeçalhos Content Security Policy (CSP) contra XSS. |

---

## 2. Diff Conceitual por Componente

### 2.1. CI/CD Pipeline
- **Antes:** Job Rust sem lints ou testes executados, job Java sem JUnit/Cucumber executados e com bypass silencioso de erros, job Frontend sem lints/testes e sem cache para `.next/cache`.
- **Depois:** Execução paralela robusta com cache persistente para pacotes Rust, Gradle dependencies, Next.js e pip virtualenv, com regras de cancelamento automático no push de novos commits.

### 2.2. Banco de Dados & Multi-Tenancy
- **Antes:** Sem restrição física ou isolamento lógico estruturado no banco de dados.
- **Depois:** Isolamento rígido a nível de PostgreSQL utilizando RLS, impedindo qualquer acesso cruzado de inquilinos mesmo em queries que esquecerem o parâmetro de filtro.

### 2.3. Pipeline RAG & Upload de Arquivos
- **Antes:** Upload direto ao MinIO sem scanner de vírus ou checagem de tipos binários reais (MIME).
- **Depois:** Validação estrita por magic bytes via Apache Tika e scan via ClamAV antes de salvar os arquivos ou gerar embeddings.

---

## 3. Regras de Domínio Preservadas

*   **[DR01] Hierarquia de Papéis:** O controle baseado em papéis (`ROLE_ADMIN` e `ROLE_USER`) permanece inalterado no banco. 🟢
*   **[DR04] Busca por Similaridade de Cosseno:** A busca semântica continua utilizando o HNSW index com a distância de cosseno. 🟢
*   **[DR07] Restrição de Entrada no Firewall:** Whitelists de IPs no Caddy e UFW permanecem intactas no host. 🟢

---

## 4. Regras de Domínio Modificadas

*   **[DR03] Processamento de Documentos:** A ingestão de documentos agora integra validação obrigatória por magic bytes e verificação de vírus via ClamAV Daemon antes do processamento e indexação. 🟢
*   **[DR02] Isolamento de Conversas:** O isolamento que antes era apenas conceitual/inferido por `user_id` passa a ser garantido fisicamente por `tenant_id` em documentos, chunks e chats usando RLS no PostgreSQL. 🟢
