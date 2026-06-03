use anyhow::{Context, Result};
use sqlx::postgres::PgPoolOptions;
use std::env;

mod config;
mod db;
mod engine;
mod rabbitmq;

#[cfg(test)]
mod tests;

#[tokio::main]
async fn main() -> Result<()> {
    println!("Workflow Worker starting (DAG Engine)...");

    // Load configuration
    let config = config::Config::load();

    // Connect to Postgres
    println!("Connecting to Database at {}...", config.database_url);
    let db_pool = PgPoolOptions::new()
        .max_connections(5)
        .connect(&config.database_url)
        .await
        .context("Failed to connect to database")?;
    println!("Database connected successfully.");

    // Spawn Heartbeat Task
    tokio::spawn(async {
        loop {
            tokio::time::sleep(tokio::time::Duration::from_secs(60)).await;
            println!("Workflow Worker heartbeat");
        }
    });

    // Spawn Health check server (Axum) on port 8000
    tokio::spawn(async {
        let app = axum::Router::new().route("/healthz", axum::routing::get(|| async { "OK" }));
        let listener = tokio::net::TcpListener::bind("0.0.0.0:8000")
            .await
            .unwrap_or_else(|e| panic!("Failed to bind health check port: {}", e));
        println!("Health check server listening on 0.0.0.0:8000");
        if let Err(e) = axum::serve(listener, app).await {
            println!("Health check server failed: {}", e);
        }
    });

    // Run RabbitMQ Consumer loop (this blocks until shutdown/error)
    rabbitmq::start_consumer(db_pool, &config.rabbitmq_url).await?;

    Ok(())
}
