# Legacy Impact: GCP Authentication for Rust Services

> Identificador da feature: `008-google-ai-auth`
> Data: `2026-06-09`

## 1. Tabela de Impacto no Legado

| Arquivo afetado | Componente | Tipo | Severidade | Justificativa |
|-----------------|------------|------|------------|---------------|
| `rust-services/embedding-service/src/main.rs` | `embedding-service` | regra-alterada | MEDIUM | A autenticação com a Vertex AI mudou de chave estática para tokens OAuth2 dinâmicos injetados via estado. |
| `rust-services/shared/src/gcp.rs` | `shared` | componente-novo | LOW | Implementação do novo módulo de suporte para GCP e `GcpAuthenticator`. |
| `rust-services/shared/src/lib.rs` | `shared` | componente-novo | LOW | Exportação do módulo `gcp`. |
| `rust-services/shared/Cargo.toml` | `shared` | delta-de-dados | LOW | Adição de dependências de teste para Tokio. |
| `.env` / `.env.example` | `infrastructure` | delta-de-dados | LOW | Novas variáveis de ambiente para GCP declaradas. |
| `docker-compose.yml` | `infrastructure` | delta-de-dados | LOW | Volume montado e variável passada para o `embedding-service`. |

## 2. Diff Conceitual por Componente

### Componente `embedding-service`
A inicialização do serviço agora requer a presença e validação das credenciais do GCP. O router Axum agora gerencia o estado do autenticador de forma segura e concorrente, injetando-o nos handlers correspondentes. O endpoint `/embeddings` agora recupera o token de acesso sob demanda, lidando de forma resiliente com erros de expiração de token ou credenciais inválidas.

### Componente `shared`
Adição de utilitário estruturado `GcpAuthenticator` que abstrai e centraliza o uso da biblioteca `gcp-auth`, servindo como biblioteca para qualquer microsserviço que necessite interagir de forma segura com recursos do Google Cloud.

## 3. Preservadas

As seguintes regras de negócio 🟢 do `_reversa_sdd/domain.md` permanecem intactas e inalteradas:
- **[DR01] Hierarquia de Papéis**
- **[DR03] Dimensionalidade Parametrizável de Vetores**
- **[DR04] Busca por Similaridade de Cosseno**
- **[DR05] Heartbeat de Ingestão**
- **[DR06] Monitoramento de Microsserviços**
- **[DR07] Restrição de Entrada no Firewall**
- **[DR08] Isolamento de Portas de Banco de Dados**

## 4. Modificadas

Nenhuma regra 🟢 existente no legado foi alterada ou removida. A mudança substitui apenas o mecanismo interno de autenticação técnica sem alterar regras de negócio ou de domínio do legado.
