# Roadmap: CI Pipeline Optimization & Security Hardening (Defense in Depth)

> Identificador: `013-ci-security-hardening`
> Data: `2026-06-16`
> Requirements: `_reversa_forward/013-ci-security-hardening/requirements.md`
> Confidência: 🟢 CONFIRMADO, 🟡 INFERIDO, 🔴 LACUNA

## 1. Resumo da abordagem

A abordagem técnica consiste em paralelizar e otimizar o pipeline global de CI no GitHub Actions (`.github/workflows/ci.yml`) com cache agressivo, além de implementar uma estratégia de **Defesa em Profundidade** sem autenticação (postergada para fase futura). Para o isolamento multi-tenant, utilizaremos o cabeçalho HTTP `X-Tenant-ID` como identificador do inquilino. No upload, o Spring Boot utilizará o Apache Tika para inspecionar os bytes mágicos do arquivo e enviará o fluxo para um serviço ClamAV local rodando no Docker Compose. No chat RAG, um interceptor validará se há injeção de prompt calculando o risco com padrões conhecidos. No frontend Next.js, as respostas serão sanitizadas client-side com `DOMPurify` e os cabeçalhos de CSP serão configurados.

## 2. Princípios aplicados

*Nenhum arquivo de princípios `.reversa/principles.md` foi encontrado na estrutura do projeto (n/a).*

## 3. Decisões técnicas

| ID | Decisão | Justificativa | Alternativas descartadas | Confidência |
|----|---------|----------------|--------------------------|-------------|
| **D-01** | **Multi-Tenancy Simulado via Header** | Permite o desenvolvimento rápido e testes de isolamento vetorial sem a complexidade de tokens JWT na fase atual. | JWT Decoders reais; Cookies complexos. | 🟢 CONFIRMADO |
| **D-02** | **Dockerized ClamAV + Apache Tika** | Tika detecta tipos reais em memória de forma leve; ClamAV roda isolado em container Docker via TCP evitando overhead na máquina da API. | ClamAV integrado na imagem da API (pesado); APIs pagas de terceiros. | 🟢 CONFIRMADO |
| **D-03** | **Next.js Cache e Concurrência no CI** | Otimiza o tempo de compilação e reduz o consumo de minutos do GitHub Actions. | Build sequencial sem cache; Manter o pipeline antigo. | 🟢 CONFIRMADO |
| **D-04** | **Regras Regex para Prompt Injection** | Implementação rápida e leve de filtro no backend antes da chamada do Vertex AI, ideal para a fase de MVP de segurança. | Classificador de IA dedicado (Llama Guard, etc.); Sem controle algum. | 🟡 INFERIDO |

## 4. Premissas

*Nenhuma premissa pendente de dúvidas, dado que todas as dúvidas levantadas no requisitos foram respondidas na sessão anterior (n/a).*

## 5. Delta arquitetural

Mapeamento de componentes afetados na arquitetura legada (`_reversa_sdd/architecture.md`):

| Componente | Arquivo de origem no legado | Tipo de mudança | Resumo |
|------------|------------------------------|-----------------|--------|
| **CI/CD Pipeline** | `.github/workflows/ci.yml` | componente-novo | Pipeline poliglota robusto com suporte a Rust, Java (Cucumber), Next.js e Python. |
| **Docker Compose** | `docker-compose.yml` | componente-novo | Adição de serviço do ClamAV daemon (`clamav`) para scan de vírus. |
| **Spring Boot Core API** | `_reversa_sdd/architecture.md#2.-tecnologias-empregadas` | componente-alterado | Implementação do `TenantInterceptor`, `PromptInjectionInterceptor`, validação MIME e integração com ClamAV TCP. |
| **Ingestion / RAG Worker** | `_reversa_sdd/architecture.md#2.-tecnologias-empregadas` | componente-alterado | Filtro de queries vetoriais pgvector e chunks baseados no tenant propagado nas filas. |
| **Frontend Next.js** | `_reversa_sdd/architecture.md#2.-tecnologias-empregadas` | componente-alterado | Envio do cabeçalho `X-Tenant-ID`, sanitização via `DOMPurify` e adição de headers CSP. |

## 6. Delta no modelo de dados

- **Resumo das mudanças:** Adição de coluna `tenant_id` UUID nas tabelas relacionais de documentos, chats e vetores, e criação de política de Row-Level Security (RLS) no PostgreSQL.
- **Detalhe completo em:** `_reversa_forward/013-ci-security-hardening/data-delta.md`

## 7. Delta de contratos externos

| Contrato | Tipo | Arquivo de detalhe |
|----------|------|--------------------|
| `X-Tenant-ID Header` | HTTP | `_reversa_forward/013-ci-security-hardening/interfaces/tenant-header.md` |

## 8. Plano de migração

1. **Migração do Schema SQL:** Criar a migração do Flyway (`V6__add_multi_tenancy_rls.sql`) para adicionar a coluna `tenant_id` UUID nas tabelas e habilitar Row-Level Security no PostgreSQL.
2. **Backfill de Dados Existentes:** Injetar um UUID de tenant padrão (ex: `a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a00`) nos registros órfãos antigos para manter consistência sem perda de dados legados.
3. **Provisionamento do ClamAV:** Atualizar o `docker-compose.yml` local para incluir o container do ClamAV Daemon e assegurar que as portas/redes internas estão corretas.

## 9. Riscos e mitigações

| Risco | Impacto | Probabilidade | Mitigação |
|-------|---------|---------------|-----------|
| Falsos positivos no detector de Prompt Injection barrando prompts legítimos dos usuários. | Médio | Média | Ajuste do threshold dinâmico e logging detalhado de todas as tentativas barradas para calibração fina. |
| Lentidão de upload devido ao escaneamento de vírus em arquivos muito grandes. | Médio | Baixa | Limitar o tamanho máximo de arquivo aceito no Spring Boot (`spring.servlet.multipart.max-file-size`) para no máximo 15MB. |
| Quebra de compatibilidade em queries antigas do pgvector que não filtram por tenant. | Alto | Baixa | Executar varredura estrita e forçar o `TenantInterceptor` a requerer o header em 100% das chamadas da API. |

## 10. Critério de pronto

- [ ] Todas as ações do `actions.md` marcadas `[X]`
- [ ] `regression-watch.md` gerado
- [ ] Pipeline do GitHub Actions finalizado e passando com sucesso em todos os jobs (`develop` branch)
- [ ] Suíte de testes automatizados com validação de escaneamento de arquivos maliciosos e injeções passando no Spring Boot

## 11. Histórico de alterações

| Data | Alteração | Autor |
|------|-----------|-------|
| 2026-06-16 | Versão inicial gerada por `/reversa-plan` | reversa |
