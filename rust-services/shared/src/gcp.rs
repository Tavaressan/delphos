use gcp_auth::{Token, TokenProvider};
use std::sync::Arc;

#[derive(Clone)]
pub struct GcpAuthenticator {
    provider: Arc<dyn TokenProvider>,
}

impl GcpAuthenticator {
    pub async fn new() -> Result<Self, String> {
        if std::env::var("GOOGLE_APPLICATION_CREDENTIALS").is_err() {
            return Err(
                "A variável de ambiente GOOGLE_APPLICATION_CREDENTIALS não está definida."
                    .to_string(),
            );
        }

        let provider = gcp_auth::provider()
            .await
            .map_err(|e| format!("Falha ao inicializar o gcp-auth: {}", e))?;

        Ok(Self { provider })
    }

    pub async fn get_token(&self, scopes: &[&str]) -> Result<Arc<Token>, String> {
        self.provider.token(scopes).await.map_err(|e| {
            format!(
                "Falha ao obter token GCP para os escopos {:?}: {}",
                scopes, e
            )
        })
    }

    /// Testa conectividade real com o GCP obtendo um token uma vez.
    /// Deve ser chamado no startup para falhar cedo em vez de na primeira requisição.
    pub async fn verify_connectivity(&self) -> Result<(), String> {
        self.get_token(&["https://www.googleapis.com/auth/cloud-platform"])
            .await
            .map(|_| ())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_gcp_authenticator_missing_env() {
        let original_val = std::env::var("GOOGLE_APPLICATION_CREDENTIALS").ok();
        std::env::remove_var("GOOGLE_APPLICATION_CREDENTIALS");

        let auth = GcpAuthenticator::new().await;
        assert!(auth.is_err());
        assert_eq!(
            auth.err().unwrap(),
            "A variável de ambiente GOOGLE_APPLICATION_CREDENTIALS não está definida.".to_string()
        );

        if let Some(val) = original_val {
            std::env::set_var("GOOGLE_APPLICATION_CREDENTIALS", val);
        }
    }
}
