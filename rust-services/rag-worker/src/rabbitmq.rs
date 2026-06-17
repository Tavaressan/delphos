use crate::config::Config;
use crate::error::WorkerError;
use anyhow::Result;
use futures_lite::stream::StreamExt;
use lapin::{options::*, types::FieldTable, Channel, Connection, ConnectionProperties};
use serde::{Deserialize, Serialize};
use shared::gcp::GcpAuthenticator;
use sqlx::{PgPool, Row};
use std::time::Duration;
use tokio::time::sleep;

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

#[derive(Serialize, Debug, Clone)]
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

#[derive(Serialize, Debug)]
struct GeminiPart {
    text: String,
}

#[derive(Serialize, Debug)]
struct GeminiContent {
    role: String,
    parts: Vec<GeminiPart>,
}

#[derive(Serialize, Debug)]
struct GeminiSystemInstruction {
    parts: Vec<GeminiPart>,
}

#[derive(Serialize, Debug)]
struct GeminiGenerationConfig {
    temperature: Option<f32>,
    #[serde(rename = "maxOutputTokens")]
    max_output_tokens: Option<usize>,
}

#[derive(Serialize, Debug)]
struct GeminiRequest {
    contents: Vec<GeminiContent>,
    #[serde(rename = "systemInstruction")]
    system_instruction: Option<GeminiSystemInstruction>,
    #[serde(rename = "generationConfig")]
    generation_config: Option<GeminiGenerationConfig>,
}

#[derive(Deserialize, Debug)]
struct GeminiResponsePart {
    text: Option<String>,
}

#[derive(Deserialize, Debug)]
struct GeminiResponseContent {
    parts: Vec<GeminiResponsePart>,
}

#[derive(Deserialize, Debug)]
struct GeminiCandidate {
    content: GeminiResponseContent,
}

#[derive(Deserialize, Debug)]
struct GeminiResponse {
    candidates: Option<Vec<GeminiCandidate>>,
}

pub struct RabbitMQManager {
    channel: Channel,
    exchange: String,
    queue: String,
    routing_key_out: String,
    config: Config,
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
                    println!(
                        "Attempt {} to connect to RabbitMQ failed: {}. Retrying in 5s...",
                        attempt, e
                    );
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
        channel
            .exchange_declare(
                &exchange,
                lapin::ExchangeKind::Direct,
                ExchangeDeclareOptions {
                    durable: true,
                    ..Default::default()
                },
                FieldTable::default(),
            )
            .await?;

        channel
            .queue_declare(
                &queue,
                QueueDeclareOptions {
                    durable: true,
                    ..Default::default()
                },
                FieldTable::default(),
            )
            .await?;

        channel
            .queue_bind(
                &queue,
                &exchange,
                &routing_key_in,
                QueueBindOptions::default(),
                FieldTable::default(),
            )
            .await?;

        // QoS
        channel.basic_qos(1, BasicQosOptions::default()).await?;

        Ok(Self {
            channel,
            exchange,
            queue,
            routing_key_out,
            config: config.clone(),
        })
    }

    pub async fn run_consumer(
        &self,
        db_pool: PgPool,
        authenticator: Option<GcpAuthenticator>,
    ) -> Result<(), WorkerError> {
        println!("Listening to '{}' queue...", self.queue);

        let mut consumer = self
            .channel
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

            match self.process_job(&body, &db_pool, &authenticator).await {
                Ok(_) => {
                    println!("RAG job processed successfully. Acknowledging.");
                    delivery.ack(BasicAckOptions::default()).await?;
                }
                Err(e) => {
                    println!("Error processing RAG job: {}. Negative acknowledging.", e);
                    delivery
                        .nack(BasicNackOptions {
                            multiple: false,
                            requeue: false,
                        })
                        .await?;
                }
            }
        }

        Ok(())
    }

    async fn process_job(
        &self,
        body: &str,
        db_pool: &PgPool,
        authenticator: &Option<GcpAuthenticator>,
    ) -> Result<(), WorkerError> {
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
        if let Err(e) = self.publish_event(&started_payload).await {
            println!("Failed to publish RetrievalStarted event: {}", e);
        }

        // Executar fluxo RAG
        match self.execute_rag(&job, db_pool, authenticator).await {
            Ok((response_text, chunks)) => {
                // 4. Publicar RetrievalCompleted
                let completed_event = RetrievalCompletedEvent {
                    event_type: "RetrievalCompleted",
                    execution_id: job.execution_id,
                    timestamp: chrono::Utc::now().to_rfc3339(),
                    payload: RetrievalCompletedPayload {
                        response: response_text,
                        chunks,
                    },
                };

                let completed_payload = serde_json::to_string(&completed_event)?;
                self.publish_event(&completed_payload).await?;
                Ok(())
            }
            Err(e) => {
                println!("RAG execution failed: {}", e);
                // Publicar AgentExecutionFailed
                let failed_event = AgentExecutionFailedEvent {
                    event_type: "AgentExecutionFailed",
                    execution_id: job.execution_id,
                    timestamp: chrono::Utc::now().to_rfc3339(),
                    payload: AgentExecutionFailedPayload {
                        error: format!("{}", e),
                    },
                };
                if let Ok(failed_payload) = serde_json::to_string(&failed_event) {
                    if let Err(pub_err) = self.publish_event(&failed_payload).await {
                        println!("Failed to publish AgentExecutionFailed event: {}", pub_err);
                    }
                }
                Err(e)
            }
        }
    }

    async fn execute_rag(
        &self,
        job: &RetrievalJob,
        db_pool: &PgPool,
        authenticator: &Option<GcpAuthenticator>,
    ) -> Result<(String, Vec<ChunkData>), WorkerError> {
        // 1. Obter embeddings do embedding-service
        println!("Calling embedding-service for query embedding...");
        let client = reqwest::Client::new();

        #[derive(Serialize)]
        struct EmbeddingRequest {
            input: Vec<String>,
            dimensions: usize,
        }

        #[derive(Deserialize)]
        struct RespEmbeddingData {
            embedding: Vec<f32>,
        }

        #[derive(Deserialize)]
        struct RespPayload {
            data: Vec<RespEmbeddingData>,
        }

        let start_emb = std::time::Instant::now();
        let emb_res = client
            .post(&self.config.embedding_service_url)
            .json(&EmbeddingRequest {
                input: vec![job.query.clone()],
                dimensions: 768,
            })
            .send()
            .await
            .map_err(|e| {
                WorkerError::Embedding(format!("HTTP error calling embedding-service: {}", e))
            })?;

        let duration_emb = start_emb.elapsed();
        println!("Embedding generation completed in {:?}", duration_emb);

        let status = emb_res.status();
        if !status.is_success() {
            let err_body = emb_res.text().await.unwrap_or_default();
            return Err(WorkerError::Embedding(format!(
                "Embedding-service error {}: {}",
                status, err_body
            )));
        }

        let emb_payload: RespPayload = emb_res.json().await.map_err(|e| {
            WorkerError::Serialization(format!("Failed to parse embedding response: {}", e))
        })?;

        let embedding = emb_payload
            .data
            .first()
            .ok_or_else(|| WorkerError::Embedding("Empty embedding list received".to_string()))?
            .embedding
            .clone();

        // Fetch agent_id from agent_executions
        let execution_row: Option<sqlx::postgres::PgRow> =
            sqlx::query("SELECT agent_id FROM agent_executions WHERE id = $1")
                .bind(job.execution_id)
                .fetch_optional(db_pool)
                .await
                .map_err(|e| {
                    WorkerError::Database(format!(
                        "SQL execution error fetching execution agent_id: {}",
                        e
                    ))
                })?;

        let agent_id: Option<uuid::Uuid> = match execution_row {
            Some(row) => row.try_get("agent_id").ok(),
            None => None,
        };

        // 2. Busca vetorial por similaridade (cosseno) no Postgres
        println!(
            "Searching database for similar chunks (agent_id={:?})...",
            agent_id
        );
        let start_db = std::time::Instant::now();
        let rows = if let Some(aid) = agent_id {
            sqlx::query(
                "SELECT dc.id, dc.content, 1 - (dc.embedding <=> $1::vector) as similarity \
                 FROM document_chunks dc \
                 JOIN documents d ON dc.document_id = d.id \
                 WHERE dc.tenant_id = $2 AND (d.agent_id = $3 OR d.agent_id IS NULL) \
                 ORDER BY similarity DESC \
                 LIMIT 5",
            )
            .bind(&embedding)
            .bind(job.tenant_id)
            .bind(aid)
            .fetch_all(db_pool)
            .await
        } else {
            sqlx::query(
                "SELECT dc.id, dc.content, 1 - (dc.embedding <=> $1::vector) as similarity \
                 FROM document_chunks dc \
                 JOIN documents d ON dc.document_id = d.id \
                 WHERE dc.tenant_id = $2 AND d.agent_id IS NULL \
                 ORDER BY similarity DESC \
                 LIMIT 5",
            )
            .bind(&embedding)
            .bind(job.tenant_id)
            .fetch_all(db_pool)
            .await
        }
        .map_err(|e| WorkerError::Database(format!("SQL execution error: {}", e)))?;

        let duration_db = start_db.elapsed();
        println!(
            "Vector search for tenant_id={} completed in {:?}",
            job.tenant_id, duration_db
        );

        let mut chunks = Vec::new();
        for row in rows {
            let id: uuid::Uuid = row.try_get("id")?;
            let content: String = row.try_get("content")?;
            let similarity: f64 = row.try_get("similarity")?;

            chunks.push(ChunkData {
                id: serde_json::json!(id),
                content,
                score: similarity as f32,
            });
        }

        // 3. Construir prompt do sistema
        let mut context_str = String::new();
        for (i, chunk) in chunks.iter().enumerate() {
            context_str.push_str(&format!(
                "Documento {} (Similaridade: {:.4}):\n{}\n\n",
                i + 1,
                chunk.score,
                chunk.content
            ));
        }

        let mut system_instruction = "Você é um assistente virtual especialista no contexto de negócios e transportes verticais da Alfabra. \
                                      Use as informações do Contexto abaixo para responder de forma precisa, objetiva e em português à pergunta do usuário. \
                                      Se o contexto não tiver a resposta ou as informações necessárias, utilize o seu conhecimento geral para fornecer a resposta técnica mais adequada, informando porém que a resposta não consta diretamente dos documentos indexados.".to_string();

        if let Some(aid) = agent_id {
            if let Ok(Some(row)) =
                sqlx::query("SELECT system_instructions FROM agents WHERE id = $1")
                    .bind(aid)
                    .fetch_optional(db_pool)
                    .await
            {
                if let Ok(instructions) = row.try_get::<String, _>("system_instructions") {
                    if !instructions.trim().is_empty() {
                        system_instruction = instructions;
                    }
                }
            }
        }

        let user_content = format!(
            "Contexto:\n{}\nPergunta: {}\n\nResposta:",
            context_str, job.query
        );

        // 4. Chamada de chat para a API do Vertex AI
        println!(
            "Calling Vertex AI Gemini chat API (model: {})...",
            self.config.gcp_chat_model_id
        );
        let auth = authenticator.as_ref().ok_or_else(|| {
            WorkerError::Config("GCP Authenticator is not initialized".to_string())
        })?;

        let token = auth
            .get_token(&["https://www.googleapis.com/auth/cloud-platform"])
            .await
            .map_err(|e| WorkerError::VertexAI(format!("Failed to retrieve OAuth token: {}", e)))?;

        let url = format!(
            "https://{}-aiplatform.googleapis.com/v1/projects/{}/locations/{}/publishers/google/models/{}:generateContent",
            self.config.gcp_location,
            self.config.gcp_project_id,
            self.config.gcp_location,
            self.config.gcp_chat_model_id
        );

        let request_body = GeminiRequest {
            contents: vec![GeminiContent {
                role: "user".to_string(),
                parts: vec![GeminiPart { text: user_content }],
            }],
            system_instruction: Some(GeminiSystemInstruction {
                parts: vec![GeminiPart {
                    text: system_instruction.to_string(),
                }],
            }),
            generation_config: Some(GeminiGenerationConfig {
                temperature: Some(0.2),
                max_output_tokens: Some(2048),
            }),
        };

        let start_llm = std::time::Instant::now();
        let llm_res = client
            .post(&url)
            .header("Content-Type", "application/json")
            .header("Authorization", format!("Bearer {}", token.as_str()))
            .json(&request_body)
            .send()
            .await
            .map_err(|e| WorkerError::VertexAI(format!("HTTP error calling Vertex AI: {}", e)))?;

        let duration_llm = start_llm.elapsed();
        println!("Vertex AI call completed in {:?}", duration_llm);

        let status = llm_res.status();
        if !status.is_success() {
            let err_body = llm_res.text().await.unwrap_or_default();
            return Err(WorkerError::VertexAI(format!(
                "Vertex AI API returned error status {}: {}",
                status, err_body
            )));
        }

        let response_body: GeminiResponse = llm_res.json().await.map_err(|e| {
            WorkerError::Serialization(format!("Failed to parse Vertex AI response body: {}", e))
        })?;

        let response_text = response_body
            .candidates
            .and_then(|c| c.into_iter().next())
            .and_then(|cand| cand.content.parts.into_iter().next())
            .and_then(|part| part.text)
            .ok_or_else(|| {
                WorkerError::VertexAI("Empty text response received from Gemini".to_string())
            })?;

        Ok((response_text, chunks))
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
