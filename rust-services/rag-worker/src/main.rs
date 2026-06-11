mod config;
mod error;
mod rabbitmq;
mod tests;

use crate::config::Config;
use crate::rabbitmq::RabbitMQManager;
use axum::{routing::get, Router};
use std::net::SocketAddr;
use sqlx::postgres::PgPoolOptions;

#[tokio::main]
async fn main() {
    println!("RAG Worker starting Semântico/HNSW (Native SQL & Vertex AI)...");

    // 1. Carregar Configurações
    let config = match Config::from_env() {
        Ok(cfg) => cfg,
        Err(e) => {
            eprintln!("Configuration error: {}", e);
            std::process::exit(1);
        }
    };

    // 2. Conectar ao Postgres
    println!("Connecting to Database at {}...", config.database_url);
    let db_pool = match PgPoolOptions::new()
        .max_connections(5)
        .connect(&config.database_url)
        .await
    {
        Ok(pool) => pool,
        Err(e) => {
            eprintln!("Failed to connect to database: {}", e);
            std::process::exit(1);
        }
    };
    println!("Database connected successfully.");

    // 3. Inicializar GcpAuthenticator se aplicável
    let authenticator = match shared::gcp::GcpAuthenticator::new().await {
        Ok(auth) => {
            println!("GcpAuthenticator initialized successfully.");
            Some(auth)
        }
        Err(e) => {
            println!("Warning: GCP Authenticator could not be initialized: {}. Vertex AI calls will fail if credentials are required.", e);
            None
        }
    };

    // 4. Inicializar Servidor HTTP de Healthcheck (Axum na porta 8000)
    let app = Router::new().route("/healthz", get(|| async { "OK" }));
    let addr = SocketAddr::from(([0, 0, 0, 0], 8000));
    
    println!("HTTP Healthcheck server listening on http://{}", addr);
    tokio::spawn(async move {
        let listener = match tokio::net::TcpListener::bind(addr).await {
            Ok(l) => l,
            Err(e) => {
                eprintln!("Failed to bind Axum healthcheck server to {}: {}", addr, e);
                return;
            }
        };
        if let Err(e) = axum::serve(listener, app).await {
            eprintln!("Axum server error: {}", e);
        }
    });

    // 5. Conectar e Executar Consumidor RabbitMQ
    let manager = match RabbitMQManager::connect(&config).await {
        Ok(m) => m,
        Err(e) => {
            eprintln!("Failed to setup RabbitMQ: {}", e);
            std::process::exit(1);
        }
    };

    if let Err(e) = manager.run_consumer(db_pool, authenticator).await {
        eprintln!("Consumer execution failed: {}", e);
        std::process::exit(1);
    }
}
