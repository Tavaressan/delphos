# Actions: GCP Authentication for Rust Services

> Identificador: `008-google-ai-auth`
> Data: `2026-06-09`
> Roadmap: `_reversa_forward/008-google-ai-auth/roadmap.md`

## Resumo

| Métrica | Valor |
|---------|-------|
| Total de ações | 13 |
| Paralelizáveis (`[//]`) | 5 |
| Maior cadeia de dependência | 9 |

## Fase 1, Preparação

| ID | Descrição | Dependências | Paralelismo | Arquivo alvo | Confidência | Status |
|----|-----------|--------------|-------------|--------------|-------------|--------|
| T001 | Atualizar o arquivo `.env.example` incluindo as novas variáveis `GOOGLE_APPLICATION_CREDENTIALS` (com path de exemplo), `GCP_PROJECT_ID` e `GCP_LOCATION`. | - | `[//]` | `.env.example` | 🟢 | `[X]` |
| T002 | Atualizar o arquivo `.env` local definindo o path da chave privada JSON em `GOOGLE_APPLICATION_CREDENTIALS` e definindo `EMBEDDING_PROVIDER=real`. | - | `[//]` | `.env` | 🟢 | `[X]` |
| T003 | Atualizar o `docker-compose.yml` para montar o arquivo JSON de credenciais como volume no container do `embedding-service` e repassar as variáveis de ambiente necessárias. | T002 | - | `docker-compose.yml` | 🟢 | `[X]` |

## Fase 2, Testes

| ID | Descrição | Dependências | Paralelismo | Arquivo alvo | Confidência | Status |
|----|-----------|--------------|-------------|--------------|-------------|--------|
| T004 | Escrever testes unitários em `rust-services/shared` para validar o comportamento de carregamento de credenciais e tratamento de erro de chaves inválidas/ausentes. | T003 | `[//]` | `rust-services/shared/src/tests.rs` | 🟢 | `[X]` |
| T005 | Criar testes de integração para o endpoint `/embeddings` no `embedding-service` simulando respostas de erro de autenticação e validações do token. | T004 | - | `rust-services/embedding-service/src/main.rs` | 🟡 | `[X]` |

## Fase 3, Núcleo

| ID | Descrição | Dependências | Paralelismo | Arquivo alvo | Confidência | Status |
|----|-----------|--------------|-------------|--------------|-------------|--------|
| T006 | Criar o módulo `gcp` em `shared` para encapsular a inicialização e o gerenciamento de tokens OAuth2 do GCP usando a crate `gcp-auth`. | T003 | `[//]` | `rust-services/shared/src/gcp.rs` | 🟢 | `[X]` |
| T007 | Exportar o módulo `gcp` recém-criado em `rust-services/shared/src/lib.rs` para permitir importação pelos demais serviços do monorepo. | T006 | - | `rust-services/shared/src/lib.rs` | 🟢 | `[X]` |

## Fase 4, Integração

| ID | Descrição | Dependências | Paralelismo | Arquivo alvo | Confidência | Status |
|----|-----------|--------------|-------------|--------------|-------------|--------|
| T008 | Definir a struct de estado `AppState` contendo o `AuthenticationManager` no `embedding-service` e injetar o estado na inicialização do Axum router. | T007 | - | `rust-services/embedding-service/src/main.rs` | 🟢 | `[X]` |
| T009 | Atualizar a assinatura e o corpo do handler `handle_embeddings` no `embedding-service` para receber o estado do Axum e requisitar o token de acesso OAuth2 dinamicamente. | T008 | - | `rust-services/embedding-service/src/main.rs` | 🟢 | `[X]` |
| T010 | Integrar o Bearer token gerado no cabeçalho de autenticação do cliente HTTP reqwest para chamadas à API da Vertex AI, removendo dependência de chaves de API estáticas. | T009 | - | `rust-services/embedding-service/src/main.rs` | 🟢 | `[X]` |

## Fase 5, Polimento

| ID | Descrição | Dependências | Paralelismo | Arquivo alvo | Confidência | Status |
|----|-----------|--------------|-------------|--------------|-------------|--------|
| T011 | Implementar o retorno de erros descritivos HTTP 500 no handler caso ocorra alguma falha na geração ou validação do token do GCP. | T010 | - | `rust-services/embedding-service/src/main.rs` | 🟢 | `[X]` |
| T012 | Adicionar logging estruturado via tracing na obtenção e renovação automática de tokens de acesso (omitindo segredos). | T010 | - | `rust-services/embedding-service/src/main.rs` | 🟢 | `[X]` |
| T013 | Atualizar a documentação de onboarding da feature refletindo qualquer comportamento adicional de debug e comandos úteis para testes locais. | T011 | `[//]` | `_reversa_forward/008-google-ai-auth/onboarding.md` | 🟢 | `[X]` |

## Notas de execução

Todas as ações da feature foram concluídas com sucesso. O autenticador dinâmico do GCP foi desenvolvido e testado com sucesso tanto localmente quanto na suíte de testes automáticos.

## Histórico de alterações

| Data | Alteração | Autor |
|------|-----------|-------|
| 2026-06-09 | Versão inicial gerada por `/reversa-to-do` | reversa |
| 2026-06-09 | Atualização de status de todas as ações para concluído (`[X]`) após a codificação | reversa |
