use anyhow::{Context, Result};
use chrono::Utc;
use futures_lite::stream::StreamExt;
use lapin::{
    options::*, types::FieldTable, BasicProperties, Channel, Connection, ConnectionProperties,
};
use serde_json::json;
use sqlx::PgPool;
use tokio::time::{sleep, Duration};
use uuid::Uuid;

use crate::db::load_dag;
use crate::engine::WorkflowEngine;

#[derive(serde::Deserialize, Debug)]
struct WorkflowJob {
    workflow_id: Uuid,
    workflow_version: i32,
    tenant_id: String,
    execution_id: Uuid,
}

#[derive(serde::Serialize, Debug)]
struct WorkflowEvent {
    #[serde(rename = "eventId")]
    event_id: String,
    #[serde(rename = "eventType")]
    event_type: String,
    #[serde(rename = "executionId")]
    execution_id: Uuid,
    timestamp: String,
    payload: serde_json::Value,
}

pub async fn start_consumer(pool: PgPool, rabbitmq_url: &str) -> Result<()> {
    println!("Connecting to RabbitMQ at {}...", rabbitmq_url);

    let mut rabbit_conn = None;
    for attempt in 1..=10 {
        match Connection::connect(rabbitmq_url, ConnectionProperties::default()).await {
            Ok(conn) => {
                rabbit_conn = Some(conn);
                break;
            }
            Err(e) => {
                println!(
                    "Attempt {} to connect to RabbitMQ failed: {}. Retrying in 5s...",
                    attempt, e
                );
                sleep(Duration::from_secs(5)).await;
            }
        }
    }

    let conn = rabbit_conn.context("Failed to connect to RabbitMQ after 10 attempts")?;
    let channel = conn
        .create_channel()
        .await
        .context("Failed to create RabbitMQ channel")?;
    println!("RabbitMQ channel created successfully.");

    let exchange = "agent.execution.exchange";
    channel
        .exchange_declare(
            exchange,
            lapin::ExchangeKind::Direct,
            ExchangeDeclareOptions {
                durable: true,
                ..Default::default()
            },
            FieldTable::default(),
        )
        .await
        .context("Failed to declare exchange")?;

    let queue = "agent.workflow.queue";
    channel
        .queue_declare(
            queue,
            QueueDeclareOptions {
                durable: true,
                ..Default::default()
            },
            FieldTable::default(),
        )
        .await
        .context("Failed to declare queue")?;

    channel
        .queue_bind(
            queue,
            exchange,
            "agent.workflow.requested",
            QueueBindOptions::default(),
            FieldTable::default(),
        )
        .await
        .context("Failed to bind queue")?;

    channel
        .basic_qos(1, BasicQosOptions::default())
        .await
        .context("Failed to set QoS")?;

    println!("Listening to '{}' queue...", queue);

    let mut consumer = channel
        .basic_consume(
            queue,
            "workflow_worker_tag",
            BasicConsumeOptions::default(),
            FieldTable::default(),
        )
        .await
        .context("Failed to start basic consume")?;

    while let Some(delivery) = consumer.next().await {
        let delivery = match delivery {
            Ok(d) => d,
            Err(e) => {
                println!("Error in delivery: {}", e);
                continue;
            }
        };

        let body = String::from_utf8_lossy(&delivery.data);
        println!("Received workflow job: {}", body);

        match process_delivery(&pool, &channel, &body).await {
            Ok(_) => {
                println!("Workflow job processed successfully. Acknowledging.");
                delivery
                    .ack(BasicAckOptions::default())
                    .await
                    .unwrap_or_else(|e| {
                        println!("Failed to ACK message: {}", e);
                    });
            }
            Err(e) => {
                println!(
                    "Error processing workflow job: {}. Negative acknowledging.",
                    e
                );
                delivery
                    .nack(BasicNackOptions {
                        multiple: false,
                        requeue: false,
                    })
                    .await
                    .unwrap_or_else(|ne| {
                        println!("Failed to NACK message: {}", ne);
                    });
            }
        }
    }

    Ok(())
}

async fn publish_event(
    channel: &Channel,
    event_type: &str,
    execution_id: Uuid,
    payload: serde_json::Value,
) -> Result<()> {
    let event = WorkflowEvent {
        event_id: Uuid::new_v4().to_string(),
        event_type: event_type.to_string(),
        execution_id,
        timestamp: Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Secs, true),
        payload,
    };

    let body = serde_json::to_vec(&event).context("Failed to serialize event")?;
    channel
        .basic_publish(
            "agent.execution.exchange",
            event_type,
            BasicPublishOptions::default(),
            &body,
            BasicProperties::default(),
        )
        .await
        .context("Failed to publish event to RabbitMQ")?;

    println!(
        "[RabbitMQ] Published event '{}' for execution '{}'",
        event_type, execution_id
    );
    Ok(())
}

async fn process_delivery(pool: &PgPool, channel: &Channel, body: &str) -> Result<()> {
    let job: WorkflowJob =
        serde_json::from_str(body).context("Failed to parse workflow job JSON")?;

    // 1. Publish agent.workflow.started
    publish_event(
        channel,
        "agent.workflow.started",
        job.execution_id,
        json!({}),
    )
    .await?;

    // 2. Load DAG from Postgres
    let start_time = Utc::now();
    println!(
        "Loading DAG for workflow {} (v{})",
        job.workflow_id, job.workflow_version
    );

    let parsed_tenant_id =
        Uuid::parse_str(&job.tenant_id).map_err(|_| anyhow::anyhow!("INVALID_TENANT_ID"))?;

    let (nodes, edges) = match load_dag(
        pool,
        parsed_tenant_id,
        job.workflow_id,
        job.workflow_version,
    )
    .await
    {
        Ok(res) => res,
        Err(err) => {
            let error_msg = format!("Failed to load DAG from Postgres: {}", err);
            publish_event(
                channel,
                "agent.workflow.failed",
                job.execution_id,
                json!({
                    "errorMessage": error_msg,
                    "errorCode": "DATABASE_ERROR"
                }),
            )
            .await?;
            return Err(anyhow::anyhow!("DATABASE_ERROR"));
        }
    };

    // 3. Execute DAG
    let engine = WorkflowEngine::new(nodes, edges);
    match engine.execute(channel, job.execution_id).await {
        Ok(result_msg) => {
            let elapsed = Utc::now()
                .signed_duration_since(start_time)
                .num_milliseconds();
            publish_event(
                channel,
                "agent.workflow.completed",
                job.execution_id,
                json!({
                    "outputResult": result_msg,
                    "executionTimeMs": elapsed
                }),
            )
            .await?;
            Ok(())
        }
        Err(err) => {
            let error_msg = err.to_string();
            let error_code = if error_msg == "TIMEOUT" {
                "TIMEOUT"
            } else {
                "EXECUTION_ERROR"
            };

            publish_event(
                channel,
                "agent.workflow.failed",
                job.execution_id,
                json!({
                    "errorMessage": error_msg,
                    "errorCode": error_code
                }),
            )
            .await?;

            Err(anyhow::anyhow!(error_code))
        }
    }
}
