use crate::config::Config;
use crate::error::WorkerError;
use crate::anythingllm::AnythingLLMClient;
use anyhow::Result;
use lapin::{
    options::*,
    types::FieldTable,
    Connection, ConnectionProperties, Channel,
};
use serde::{Deserialize, Serialize};
use std::time::Duration;
use tokio::time::sleep;
use futures_lite::stream::StreamExt;

#[derive(Deserialize, Debug)]
struct RetrievalJob {
    execution_id: uuid::Uuid,
    tenant_id: uuid::Uuid,
    query: String,
}

#[derive(Serialize, Debug)]
struct RetrievalStartedEvent {
    event_type: &'static str,
    execution_id: uuid::Uuid,
    timestamp: String,
}

#[derive(Serialize, Debug)]
struct ChunkData {
    id: serde_json::Value,
    content: String,
    score: f32,
}

#[derive(Serialize, Debug)]
struct RetrievalCompletedPayload {
    response: String,
    chunks: Vec<ChunkData>,
}

#[derive(Serialize, Debug)]
struct RetrievalCompletedEvent {
    event_type: &'static str,
    execution_id: uuid::Uuid,
    timestamp: String,
    pub payload: RetrievalCompletedPayload,
}

#[derive(Serialize, Debug)]
struct AgentExecutionFailedPayload {
    error: String,
}

#[derive(Serialize, Debug)]
struct AgentExecutionFailedEvent {
    event_type: &'static str,
    execution_id: uuid::Uuid,
    timestamp: String,
    payload: AgentExecutionFailedPayload,
}

pub struct RabbitMQManager {
    channel: Channel,
    exchange: String,
    queue: String,
    routing_key_out: String,
}

impl RabbitMQManager {
    pub async fn connect(config: &Config) -> Result<Self, WorkerError> {
        let rabbitmq_url = &config.rabbitmq_url;
        println!("Connecting to RabbitMQ at {}...", rabbitmq_url);

        let mut rabbit_conn = None;
        for attempt in 1..=10 {
            match Connection::connect(rabbitmq_url, ConnectionProperties::default()).await {
                Ok(conn) => {
                    rabbit_conn = Some(conn);
                    break;
                }
                Err(e) => {
                    println!("Attempt {} to connect to RabbitMQ failed: {}. Retrying in 5s...", attempt, e);
                    sleep(Duration::from_secs(5)).await;
                }
            }
        }

        let conn = rabbit_conn.ok_or_else(|| {
            WorkerError::RabbitMQ("Failed to connect to RabbitMQ after 10 attempts".to_string())
        })?;

        let channel = conn.create_channel().await?;
        println!("RabbitMQ channel created successfully.");

        let exchange = "agent.execution.exchange".to_string();
        let queue = "agent.retrieval.queue".to_string();
        let routing_key_in = "agent.retrieval.requested".to_string();
        let routing_key_out = "agent.execution.event".to_string();

        // Declarar Exchange e Fila
        channel.exchange_declare(
            &exchange,
            lapin::ExchangeKind::Direct,
            ExchangeDeclareOptions {
                durable: true,
                ..Default::default()
            },
            FieldTable::default(),
        ).await?;

        channel.queue_declare(
            &queue,
            QueueDeclareOptions {
                durable: true,
                ..Default::default()
            },
            FieldTable::default(),
        ).await?;

        channel.queue_bind(
            &queue,
            &exchange,
            &routing_key_in,
            QueueBindOptions::default(),
            FieldTable::default(),
        ).await?;

        // QoS
        channel.basic_qos(1, BasicQosOptions::default()).await?;

        Ok(Self {
            channel,
            exchange,
            queue,
            routing_key_out,
        })
    }

    pub async fn run_consumer(&self, client: AnythingLLMClient) -> Result<(), WorkerError> {
        println!("Listening to '{}' queue...", self.queue);

        let mut consumer = self.channel
            .basic_consume(
                &self.queue,
                "rag_worker_tag",
                BasicConsumeOptions::default(),
                FieldTable::default(),
            )
            .await?;

        while let Some(delivery) = consumer.next().await {
            let delivery = match delivery {
                Ok(d) => d,
                Err(e) => {
                    println!("Error in RabbitMQ delivery: {}", e);
                    continue;
                }
            };

            let body = String::from_utf8_lossy(&delivery.data);
            println!("Received RAG job: {}", body);

            match self.process_job(&body, &client).await {
                Ok(_) => {
                    println!("RAG job processed successfully. Acknowledging.");
                    delivery.ack(BasicAckOptions::default()).await?;
                }
                Err(e) => {
                    println!("Error processing RAG job: {}. Negative acknowledging.", e);
                    delivery.nack(BasicNackOptions {
                        requeue: false,
                        ..Default::default()
                    }).await?;
                }
            }
        }

        Ok(())
    }

    async fn process_job(&self, body: &str, client: &AnythingLLMClient) -> Result<(), WorkerError> {
        let job: RetrievalJob = serde_json::from_str(body)
            .map_err(|e| WorkerError::Serialization(format!("Invalid RAG Job format: {}", e)))?;

        let timestamp = chrono::Utc::now().to_rfc3339();

        // 1. Publicar RetrievalStarted
        let started_event = RetrievalStartedEvent {
            event_type: "RetrievalStarted",
            execution_id: job.execution_id,
            timestamp: timestamp.clone(),
        };

        let started_payload = serde_json::to_string(&started_event)?;
        self.publish_event(&started_payload).await?;

        // 2. Chamar AnythingLLM com Retry
        let workspace_slug = format!("tenant-{}", job.tenant_id);
        let mut anything_resp = None;
        let mut delay = Duration::from_secs(2);

        for attempt in 1..=3 {
            match client.query_rag(&workspace_slug, &job.query).await {
                Ok(resp) => {
                    anything_resp = Some(resp);
                    break;
                }
                Err(e) => {
                    println!("Attempt {} to query AnythingLLM failed: {}. Retrying in {:?}...", attempt, e, delay);
                    if attempt < 3 {
                        sleep(delay).await;
                        delay *= 2;
                    } else {
                        // 3. Publicar AgentExecutionFailed
                        let failed_event = AgentExecutionFailedEvent {
                            event_type: "AgentExecutionFailed",
                            execution_id: job.execution_id,
                            timestamp: chrono::Utc::now().to_rfc3339(),
                            payload: AgentExecutionFailedPayload {
                                error: format!("AnythingLLM query failed: {}", e),
                            },
                        };
                        let failed_payload = serde_json::to_string(&failed_event)?;
                        self.publish_event(&failed_payload).await?;
                        return Err(e);
                    }
                }
            }
        }

        let resp = anything_resp.unwrap();

        // 4. Publicar RetrievalCompleted
        let mut chunks = Vec::new();
        if let Some(sources) = resp.sources {
            for src in sources {
                chunks.push(ChunkData {
                    id: src.id.unwrap_or(serde_json::Value::Null),
                    content: src.text.unwrap_or_default(),
                    score: src.score.unwrap_or(0.0),
                });
            }
        }

        let completed_event = RetrievalCompletedEvent {
            event_type: "RetrievalCompleted",
            execution_id: job.execution_id,
            timestamp: chrono::Utc::now().to_rfc3339(),
            payload: RetrievalCompletedPayload {
                response: resp.text,
                chunks,
            },
        };

        let completed_payload = serde_json::to_string(&completed_event)?;
        self.publish_event(&completed_payload).await?;

        Ok(())
    }

    async fn publish_event(&self, payload: &str) -> Result<(), WorkerError> {
        self.channel
            .basic_publish(
                &self.exchange,
                &self.routing_key_out,
                BasicPublishOptions::default(),
                payload.as_bytes(),
                lapin::BasicProperties::default(),
            )
            .await?;
        Ok(())
    }
}
