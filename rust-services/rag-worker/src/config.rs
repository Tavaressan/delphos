use std::env;

#[derive(Clone, Debug)]
pub struct Config {
    pub rabbitmq_url: String,
    pub database_url: String,
    pub embedding_service_url: String,
    pub gcp_project_id: String,
    pub gcp_location: String,
    pub gcp_chat_model_id: String,
}

impl Config {
    pub fn from_env() -> Result<Self, String> {
        let rabbitmq_url = env::var("RABBITMQ_URL")
            .unwrap_or_else(|_| "amqp://guest:guest@rabbitmq:5672".to_string());

        let database_url = env::var("DATABASE_URL")
            .unwrap_or_else(|_| "postgresql://postgres:postgres@postgres:5432/rag_db".to_string());

        let embedding_service_url = env::var("EMBEDDING_SERVICE_URL")
            .unwrap_or_else(|_| "http://embedding-service:8000/embeddings".to_string());

        let gcp_project_id = env::var("GCP_PROJECT_ID")
            .unwrap_or_else(|_| "alfabra-platform".to_string());

        let gcp_location = env::var("GCP_LOCATION")
            .unwrap_or_else(|_| "us-central1".to_string());

        let gcp_chat_model_id = env::var("GCP_CHAT_MODEL_ID")
            .unwrap_or_else(|_| "gemini-2.5-flash".to_string());

        Ok(Config {
            rabbitmq_url,
            database_url,
            embedding_service_url,
            gcp_project_id,
            gcp_location,
            gcp_chat_model_id,
        })
    }
}
