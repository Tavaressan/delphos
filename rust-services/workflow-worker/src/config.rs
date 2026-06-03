use std::env;

pub struct Config {
    pub database_url: String,
    pub rabbitmq_url: String,
}

impl Config {
    pub fn load() -> Self {
        let database_url = env::var("DATABASE_URL")
            .unwrap_or_else(|_| "postgresql://postgres:postgres@postgres:5432/rag_db".to_string());
        let rabbitmq_url = env::var("RABBITMQ_URL")
            .unwrap_or_else(|_| "amqp://guest:guest@rabbitmq:5672".to_string());

        Self {
            database_url,
            rabbitmq_url,
        }
    }
}
