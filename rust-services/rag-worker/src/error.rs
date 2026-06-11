use std::fmt;

#[derive(Debug)]
pub enum WorkerError {
    Config(String),
    RabbitMQ(String),
    Database(String),
    Embedding(String),
    VertexAI(String),
    Serialization(String),
}

impl std::error::Error for WorkerError {}

impl fmt::Display for WorkerError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            WorkerError::Config(msg) => write!(f, "Configuration Error: {}", msg),
            WorkerError::RabbitMQ(msg) => write!(f, "RabbitMQ Error: {}", msg),
            WorkerError::Database(msg) => write!(f, "Database Error: {}", msg),
            WorkerError::Embedding(msg) => write!(f, "Embedding Error: {}", msg),
            WorkerError::VertexAI(msg) => write!(f, "Vertex AI Error: {}", msg),
            WorkerError::Serialization(msg) => write!(f, "Serialization Error: {}", msg),
        }
    }
}

impl From<lapin::Error> for WorkerError {
    fn from(err: lapin::Error) -> Self {
        WorkerError::RabbitMQ(err.to_string())
    }
}

impl From<sqlx::Error> for WorkerError {
    fn from(err: sqlx::Error) -> Self {
        WorkerError::Database(err.to_string())
    }
}

impl From<reqwest::Error> for WorkerError {
    fn from(err: reqwest::Error) -> Self {
        WorkerError::VertexAI(err.to_string())
    }
}

impl From<serde_json::Error> for WorkerError {
    fn from(err: serde_json::Error) -> Self {
        WorkerError::Serialization(err.to_string())
    }
}
