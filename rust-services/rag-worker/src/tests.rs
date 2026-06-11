#[cfg(test)]
mod tests {
    use crate::config::Config;
    use std::env;
    use std::sync::Mutex;

    static ENV_MUTEX: Mutex<()> = Mutex::new(());

    #[test]
    fn test_config_defaults() {
        let _guard = ENV_MUTEX.lock().unwrap();
        // Clear variables to check default values
        let old_rabbitmq = env::var("RABBITMQ_URL").ok();
        let old_database = env::var("DATABASE_URL").ok();
        let old_embedding = env::var("EMBEDDING_SERVICE_URL").ok();
        let old_project = env::var("GCP_PROJECT_ID").ok();
        let old_location = env::var("GCP_LOCATION").ok();
        let old_chat_model = env::var("GCP_CHAT_MODEL_ID").ok();

        env::remove_var("RABBITMQ_URL");
        env::remove_var("DATABASE_URL");
        env::remove_var("EMBEDDING_SERVICE_URL");
        env::remove_var("GCP_PROJECT_ID");
        env::remove_var("GCP_LOCATION");
        env::remove_var("GCP_CHAT_MODEL_ID");

        let config = Config::from_env();
        assert!(config.is_ok());
        let cfg = config.unwrap();
        assert_eq!(cfg.rabbitmq_url, "amqp://guest:guest@rabbitmq:5672");
        assert_eq!(cfg.database_url, "postgresql://postgres:postgres@postgres:5432/rag_db");
        assert_eq!(cfg.embedding_service_url, "http://embedding-service:8000/embeddings");
        assert_eq!(cfg.gcp_project_id, "alfabra-platform");
        assert_eq!(cfg.gcp_location, "us-central1");
        assert_eq!(cfg.gcp_chat_model_id, "gemini-2.5-flash");

        // Restore variables
        if let Some(val) = old_rabbitmq { env::set_var("RABBITMQ_URL", val); }
        if let Some(val) = old_database { env::set_var("DATABASE_URL", val); }
        if let Some(val) = old_embedding { env::set_var("EMBEDDING_SERVICE_URL", val); }
        if let Some(val) = old_project { env::set_var("GCP_PROJECT_ID", val); }
        if let Some(val) = old_location { env::set_var("GCP_LOCATION", val); }
        if let Some(val) = old_chat_model { env::set_var("GCP_CHAT_MODEL_ID", val); }
    }

    #[test]
    fn test_config_custom_values() {
        let _guard = ENV_MUTEX.lock().unwrap();
        let old_rabbitmq = env::var("RABBITMQ_URL").ok();
        let old_database = env::var("DATABASE_URL").ok();

        env::set_var("RABBITMQ_URL", "amqp://user:pass@localhost:5672");
        env::set_var("DATABASE_URL", "postgresql://user:pass@localhost:5432/db");

        let config = Config::from_env();
        assert!(config.is_ok());
        let cfg = config.unwrap();
        assert_eq!(cfg.rabbitmq_url, "amqp://user:pass@localhost:5672");
        assert_eq!(cfg.database_url, "postgresql://user:pass@localhost:5432/db");

        if let Some(val) = old_rabbitmq { env::set_var("RABBITMQ_URL", val); } else { env::remove_var("RABBITMQ_URL"); }
        if let Some(val) = old_database { env::set_var("DATABASE_URL", val); } else { env::remove_var("DATABASE_URL"); }
    }
}
