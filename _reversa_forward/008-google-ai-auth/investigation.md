# Investigation: GCP Authentication & Token Management in Rust

> Identificador: `008-google-ai-auth`
> Data: `2026-06-09`

## 1. Pesquisa de Fundo e Contexto

No ecossistema do Google Cloud Platform (GCP), a chamada segura de APIs autenticadas (como a API de predição do Vertex AI) a partir de contêineres e máquinas virtuais exige o uso de tokens de acesso OAuth2. A autenticação baseada em chaves estáticas de API (`x-goog-api-key`) é comumente desencorajada para ambientes de produção corporativos devido à falta de controle granular e rotação automática.

### 1.1. Autenticação usando Conta de Serviço (Service Account)
O padrão da indústria para autenticação servidor-para-servidor é o uso de chaves JSON de Contas de Serviço. O fluxo envolve:
1. Ler o arquivo de chave JSON local.
2. Gerar um JWT (JSON Web Token) assinado localmente com a chave privada.
3. Trocar o JWT assinado por um Access Token temporário do Google OAuth2.
4. Usar o Access Token no cabeçalho `Authorization: Bearer <TOKEN>` nas chamadas subsequentes.

## 2. Alternativas Avaliadas

### Alternativa 1: Hand-rolled JWT generation & OAuth Exchange (Descartada)
- *Abordagem:* Utilizar a crate `jsonwebtoken` para gerar e assinar o JWT localmente e, em seguida, fazer requisições HTTP via `reqwest` para `https://oauth2.googleapis.com/token`.
- *Prós:* Menos dependências externas complexas.
- *Contras:* Exige escrever lógica manual para cache de tokens, expiração de tokens e tratamento de concorrência na renovação (risco de race conditions ou requisições desnecessárias).

### Alternativa 2: Crate `gcp-auth` (Escolhida 🟢)
- *Abordagem:* Integrar a crate `gcp-auth` que já está declarada no workspace dependencies.
- *Prós:* 
  - Abstrai todo o processo de carregamento de credenciais (lê automaticamente `GOOGLE_APPLICATION_CREDENTIALS` ou o metadata server da GCP).
  - Gerencia o cache do token de acesso em memória de forma assíncrona segura.
  - Trata da renovação do token de forma concorrente e segura.
- *Contras:* Nenhuma desvantagem relevante encontrada no cenário atual.

## 3. Padrões Aplicados

Adotaremos o padrão de **Shared State** do Axum para disponibilizar o `AuthenticationManager` de forma global e eficiente. 

### Exemplo de integração no Axum:
```rust
use gcp_auth::AuthenticationManager;
use std::sync::Arc;

struct AppState {
    auth_manager: AuthenticationManager,
}

// Inicialização:
let auth_manager = AuthenticationManager::new().await
    .map_err(|e| format!("Falha ao instanciar GCP AuthManager: {}", e))?;
let state = Arc::new(AppState { auth_manager });

// Configuração de rotas:
let app = Router::new()
    .route("/embeddings", post(handle_embeddings))
    .with_state(state);
```

### Exemplo de recuperação de token no handler:
```rust
async fn handle_embeddings(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<EmbeddingsRequest>,
) -> impl IntoResponse {
    let token = match state.auth_manager.get_token(&["https://www.googleapis.com/auth/cloud-platform"]).await {
        Ok(t) => t,
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, format!("Falha de autenticação GCP: {}", e)).into_response()
    };
    
    // Usar token.as_str() no cabeçalho Authorization
}
```

## 4. Referências Externas
- Documentação do Google Cloud sobre Autenticação: https://cloud.google.com/docs/authentication
- Crate `gcp-auth` no crates.io: https://crates.io/crates/gcp-auth
