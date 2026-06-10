use gcp_auth::{AuthenticationManager, Token};
use std::sync::Arc;

#[derive(Clone)]
pub struct GcpAuthenticator {
    manager: Arc<AuthenticationManager>,
}

impl GcpAuthenticator {
    /// Inicializa o gerenciador de autenticação do GCP.
    /// Retorna um erro caso as credenciais não possam ser carregadas.
    pub async fn new() -> Result<Self, String> {
        // Verifica se a variável de ambiente está definida para melhorar a mensagem de erro
        if std::env::var("GOOGLE_APPLICATION_CREDENTIALS").is_err() {
            return Err("A variável de ambiente GOOGLE_APPLICATION_CREDENTIALS não está definida.".to_string());
        }

        let manager = AuthenticationManager::new()
            .await
            .map_err(|e| format!("Falha ao inicializar o gcp-auth: {}", e))?;

        Ok(Self {
            manager: Arc::new(manager),
        })
    }

    /// Obtém um token de acesso OAuth2 para o escopo fornecido.
    pub async fn get_token(&self, scopes: &[&str]) -> Result<Token, String> {
        self.manager
            .get_token(scopes)
            .await
            .map_err(|e| format!("Falha ao obter token GCP para os escopos {:?}: {}", scopes, e))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_gcp_authenticator_missing_env() {
        // Remove a variável temporariamente para o teste
        let original_val = std::env::var("GOOGLE_APPLICATION_CREDENTIALS").ok();
        std::env::remove_var("GOOGLE_APPLICATION_CREDENTIALS");

        let auth = GcpAuthenticator::new().await;
        assert!(auth.is_err());
        assert_eq!(
            auth.err().unwrap(),
            "A variável de ambiente GOOGLE_APPLICATION_CREDENTIALS não está definida.".to_string()
        );

        // Restaura a variável
        if let Some(val) = original_val {
            std::env::set_var("GOOGLE_APPLICATION_CREDENTIALS", val);
        }
    }
}
