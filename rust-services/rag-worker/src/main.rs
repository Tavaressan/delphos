mod config;
mod error;
mod anythingllm;
mod rabbitmq;
mod tests;

use crate::config::Config;
use crate::anythingllm::AnythingLLMClient;
use crate::rabbitmq::RabbitMQManager;
use axum::{routing::get, Router};
use std::net::SocketAddr;

#[tokio::main]
async fn main() {
    println!("RAG Worker starting Semântico/HNSW (AnythingLLM Orchestrated)...");

    // 1. Carregar Configurações
    let config = match Config::from_env() {
        Ok(cfg) => cfg,
        Err(e) => {
            eprintln!("Configuration error: {}", e);
            std::process::exit(1);
        }
    };

    // 2. Inicializar Cliente AnythingLLM
    let client = match AnythingLLMClient::new(config.anythingllm_api_url.clone(), config.anythingllm_api_key.clone()) {
        Ok(c) => c,
        Err(e) => {
            eprintln!("Failed to initialize AnythingLLM client: {}", e);
            std::process::exit(1);
        }
    };

    // 3. Inicializar Servidor HTTP de Healthcheck (Axum na porta 8000)
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

    // 4. Conectar e Executar Consumidor RabbitMQ
    let manager = match RabbitMQManager::connect(&config).await {
        Ok(m) => m,
        Err(e) => {
            eprintln!("Failed to setup RabbitMQ: {}", e);
            std::process::exit(1);
        }
    };

    if let Err(e) = manager.run_consumer(client).await {
        eprintln!("Consumer execution failed: {}", e);
        std::process::exit(1);
    }
}
