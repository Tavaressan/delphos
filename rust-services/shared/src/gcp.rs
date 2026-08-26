use gcp_auth::{Token, TokenProvider};
use std::sync::Arc;

#[derive(Clone)]
pub struct GcpAuthenticator {
    provider: Arc<dyn TokenProvider>,
}

impl GcpAuthenticator {
    pub async fn new() -> Result<Self, String> {
        let path = std::env::var("GOOGLE_APPLICATION_CREDENTIALS").map_err(|_| {
            "A variável de ambiente GOOGLE_APPLICATION_CREDENTIALS não está definida."
                .to_string()
        })?;

        // Issue #358/#389: o docker-compose.yml monta
        // `${ADC_PATH:-/dev/null}:/gcloud/adc.json:ro` para não abortar o `docker compose up`
        // quando ADC_PATH não está configurado. Isso deixa GOOGLE_APPLICATION_CREDENTIALS
        // sempre definida, mesmo sem credencial real — apontando para /dev/null (um character
        // device, não um arquivo regular). Sem esta checagem, o serviço concluiria que há
        // credencial e tentaria autenticar contra /dev/null, falhando em runtime em vez de
        // degradar de forma limpa para o próximo provider da cadeia (AI Studio/Ollama).
        // Espelha o hardening equivalente em crew-worker (os.path.isfile() and getsize() > 0).
        if !Self::is_valid_credentials_file(&path) {
            return Err(format!(
                "GOOGLE_APPLICATION_CREDENTIALS aponta para \"{}\", que não é um arquivo \
                 regular não vazio (ex.: /dev/null, montado quando ADC_PATH não está \
                 configurado). Tratando como credencial ausente.",
                path
            ));
        }

        let provider = gcp_auth::provider()
            .await
            .map_err(|e| format!("Falha ao inicializar o gcp-auth: {}", e))?;

        Ok(Self { provider })
    }

    /// Um path só conta como credencial válida se for um arquivo regular (não um character
    /// device como /dev/null, nem um diretório) e não vazio.
    fn is_valid_credentials_file(path: &str) -> bool {
        std::fs::metadata(path)
            .map(|meta| meta.is_file() && meta.len() > 0)
            .unwrap_or(false)
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

    #[tokio::test]
    async fn test_gcp_authenticator_rejects_dev_null() {
        // Reproduz o mount `${ADC_PATH:-/dev/null}:/gcloud/adc.json:ro` do docker-compose
        // quando ADC_PATH não está configurado.
        let original_val = std::env::var("GOOGLE_APPLICATION_CREDENTIALS").ok();
        std::env::set_var("GOOGLE_APPLICATION_CREDENTIALS", "/dev/null");

        let auth = GcpAuthenticator::new().await;
        assert!(auth.is_err());
        let err = auth.err().unwrap();
        assert!(
            err.contains("não é um arquivo regular não vazio"),
            "mensagem inesperada: {}",
            err
        );

        if let Some(val) = original_val {
            std::env::set_var("GOOGLE_APPLICATION_CREDENTIALS", val);
        } else {
            std::env::remove_var("GOOGLE_APPLICATION_CREDENTIALS");
        }
    }

    #[tokio::test]
    async fn test_gcp_authenticator_rejects_nonexistent_path() {
        let original_val = std::env::var("GOOGLE_APPLICATION_CREDENTIALS").ok();
        std::env::set_var(
            "GOOGLE_APPLICATION_CREDENTIALS",
            "/caminho/que/nao/existe/adc.json",
        );

        let auth = GcpAuthenticator::new().await;
        assert!(auth.is_err());

        if let Some(val) = original_val {
            std::env::set_var("GOOGLE_APPLICATION_CREDENTIALS", val);
        } else {
            std::env::remove_var("GOOGLE_APPLICATION_CREDENTIALS");
        }
    }

    #[tokio::test]
    async fn test_gcp_authenticator_rejects_empty_file() {
        let original_val = std::env::var("GOOGLE_APPLICATION_CREDENTIALS").ok();
        let path = std::env::temp_dir().join(format!(
            "alfabra-gcp-test-empty-{}.json",
            std::process::id()
        ));
        std::fs::write(&path, b"").unwrap();
        std::env::set_var("GOOGLE_APPLICATION_CREDENTIALS", path.to_str().unwrap());

        let auth = GcpAuthenticator::new().await;
        assert!(auth.is_err());
        let err = auth.err().unwrap();
        assert!(
            err.contains("não é um arquivo regular não vazio"),
            "mensagem inesperada: {}",
            err
        );

        std::fs::remove_file(&path).ok();
        if let Some(val) = original_val {
            std::env::set_var("GOOGLE_APPLICATION_CREDENTIALS", val);
        } else {
            std::env::remove_var("GOOGLE_APPLICATION_CREDENTIALS");
        }
    }

    #[test]
    fn test_is_valid_credentials_file_accepts_regular_nonempty_file() {
        let path = std::env::temp_dir().join(format!(
            "alfabra-gcp-test-valid-{}.json",
            std::process::id()
        ));
        std::fs::write(&path, b"{\"type\": \"service_account\"}").unwrap();

        assert!(GcpAuthenticator::is_valid_credentials_file(
            path.to_str().unwrap()
        ));

        std::fs::remove_file(&path).ok();
    }

    #[test]
    fn test_is_valid_credentials_file_rejects_dev_null() {
        assert!(!GcpAuthenticator::is_valid_credentials_file("/dev/null"));
    }

    #[test]
    fn test_is_valid_credentials_file_rejects_missing_path() {
        assert!(!GcpAuthenticator::is_valid_credentials_file(
            "/caminho/que/nao/existe/adc.json"
        ));
    }
}
