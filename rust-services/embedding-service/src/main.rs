use axum::{
    routing::{get, post},
    http::StatusCode,
    response::IntoResponse,
    Json, Router,
};
use serde::{Deserialize, Serialize};

#[derive(Deserialize)]
struct EmbeddingsRequest {
    input: Vec<String>,
    dimensions: Option<usize>,
}

#[derive(Serialize)]
struct EmbeddingData {
    object: &'static str,
    index: usize,
    embedding: Vec<f32>,
}

#[derive(Serialize)]
struct Usage {
    prompt_tokens: usize,
    total_tokens: usize,
}

#[derive(Serialize)]
struct EmbeddingsResponse {
    object: &'static str,
    data: Vec<EmbeddingData>,
    model: String,
    usage: Usage,
}

#[derive(Serialize)]
struct VertexInstances {
    content: String,
}

#[derive(Serialize)]
struct VertexParameters {
    #[serde(rename = "outputDimensionality")]
    output_dimensionality: usize,
}

#[derive(Serialize)]
struct VertexRequest {
    instances: Vec<VertexInstances>,
    parameters: VertexParameters,
}

#[derive(Deserialize)]
struct VertexEmbeddingValues {
    values: Vec<f32>,
}

#[derive(Deserialize)]
struct VertexPrediction {
    embeddings: VertexEmbeddingValues,
}

#[derive(Deserialize)]
struct VertexResponse {
    predictions: Vec<VertexPrediction>,
}

pub fn app() -> Router {
    Router::new()
        .route("/healthz", get(|| async { "OK" }))
        .route("/embeddings", post(handle_embeddings))
}

async fn handle_embeddings(
    Json(payload): Json<EmbeddingsRequest>,
) -> impl IntoResponse {
    if payload.input.is_empty() {
        return (StatusCode::BAD_REQUEST, "A lista de inputs não pode estar vazia.".to_string()).into_response();
    }

    let provider = std::env::var("EMBEDDING_PROVIDER").unwrap_or_else(|_| "real".to_string());
    let model = std::env::var("EMBEDDING_MODEL").unwrap_or_else(|_| "text-embedding-004".to_string());
    let dimensions = payload.dimensions.unwrap_or(1536);

    if provider == "mock" {
        let data: Vec<EmbeddingData> = payload.input.iter().enumerate().map(|(idx, text)| {
            EmbeddingData {
                object: "embedding",
                index: idx,
                embedding: generate_mock_embedding(text, dimensions),
            }
        }).collect();

        let response = EmbeddingsResponse {
            object: "list",
            data,
            model,
            usage: Usage {
                prompt_tokens: payload.input.len() * 2,
                total_tokens: payload.input.len() * 2,
            },
        };
        return (StatusCode::OK, Json(response)).into_response();
    }

    let project_id = std::env::var("VERTEX_AI_PROJECT_ID").unwrap_or_else(|_| "alfabra-platform".to_string());
    let region = std::env::var("VERTEX_AI_REGION").unwrap_or_else(|_| "us-central1".to_string());
    let api_key = std::env::var("VERTEX_AI_API_KEY").unwrap_or_default();

    let url = format!(
        "https://{}-aiplatform.googleapis.com/v1/projects/{}/locations/{}/publishers/google/models/{}:predict",
        region, project_id, region, model
    );

    let instances: Vec<VertexInstances> = payload.input.iter().map(|text| {
        VertexInstances {
            content: text.clone(),
        }
    }).collect();

    let vertex_req = VertexRequest {
        instances,
        parameters: VertexParameters {
            output_dimensionality: dimensions,
        },
    };

    let client = reqwest::Client::new();
    let req_builder = client.post(&url)
        .header("Content-Type", "application/json")
        .header("x-goog-api-key", &api_key)
        .header("Authorization", format!("Bearer {}", api_key));

    let res = match req_builder.json(&vertex_req).send().await {
        Ok(r) => r,
        Err(e) => {
            return (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to send request to Vertex AI: {}", e)).into_response();
        }
    };

    let status = res.status();
    if !status.is_success() {
        let body = res.text().await.unwrap_or_else(|_| "Unknown error".to_string());
        return (StatusCode::INTERNAL_SERVER_ERROR, format!("Vertex AI returned error {}: {}", status, body)).into_response();
    }

    let vertex_res: VertexResponse = match res.json().await {
        Ok(vr) => vr,
        Err(e) => {
            return (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to parse response from Vertex AI: {}", e)).into_response();
        }
    };

    let data: Vec<EmbeddingData> = vertex_res.predictions.into_iter().enumerate().map(|(idx, pred)| {
        EmbeddingData {
            object: "embedding",
            index: idx,
            embedding: pred.embeddings.values,
        }
    }).collect();

    let response = EmbeddingsResponse {
        object: "list",
        data,
        model,
        usage: Usage {
            prompt_tokens: payload.input.len() * 4,
            total_tokens: payload.input.len() * 4,
        },
    };

    (StatusCode::OK, Json(response)).into_response()
}

fn generate_mock_embedding(text: &str, dimension: usize) -> Vec<f32> {
    use std::collections::hash_map::DefaultHasher;
    use std::hash::{Hash, Hasher};

    let mut values = Vec::with_capacity(dimension);
    for i in 0..dimension {
        let mut hasher = DefaultHasher::new();
        text.hash(&mut hasher);
        i.hash(&mut hasher);
        let hash_val = hasher.finish();

        let val = ((hash_val % 2000) as f32 / 1000.0) - 1.0;
        values.push(val);
    }

    let mut sq_sum = 0.0;
    for v in &values {
        sq_sum += v * v;
    }

    if sq_sum > 0.0 {
        let magnitude = sq_sum.sqrt();
        for v in &mut values {
            *v /= magnitude;
        }
    } else {
        values[0] = 1.0;
    }

    values
}

#[tokio::main]
async fn main() {
    let app = app();

    let listener = tokio::net::TcpListener::bind("0.0.0.0:8000").await.unwrap();
    println!(
        "Embedding Service listening on {}",
        listener.local_addr().unwrap()
    );
    axum::serve(listener, app).await.unwrap();
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::{
        body::Body,
        http::{Request, StatusCode},
    };
    use tower::ServiceExt;
    use http_body_util::BodyExt;

    #[tokio::test]
    async fn test_healthz() {
        let app = app();

        let response = app
            .oneshot(
                Request::builder()
                    .uri("/healthz")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::OK);

        let body = response.into_body().collect().await.unwrap().to_bytes();
        assert_eq!(&body[..], b"OK");
    }

    #[tokio::test]
    async fn test_embeddings_empty_input() {
        let app = app();

        let response = app
            .oneshot(
                Request::builder()
                    .method("POST")
                    .uri("/embeddings")
                    .header("Content-Type", "application/json")
                    .body(Body::from(r#"{"input": [], "dimensions": 1536}"#))
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::BAD_REQUEST);

        let body = response.into_body().collect().await.unwrap().to_bytes();
        let body_str = String::from_utf8_lossy(&body);
        assert_eq!(body_str, "A lista de inputs não pode estar vazia.");
    }

    #[tokio::test]
    async fn test_embeddings_mock() {
        std::env::set_var("EMBEDDING_PROVIDER", "mock");
        std::env::set_var("EMBEDDING_MODEL", "text-embedding-004");

        let app = app();

        let response = app
            .oneshot(
                Request::builder()
                    .method("POST")
                    .uri("/embeddings")
                    .header("Content-Type", "application/json")
                    .body(Body::from(r#"{"input": ["Olá Mundo"], "dimensions": 1536}"#))
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::OK);

        let body = response.into_body().collect().await.unwrap().to_bytes();
        let json: serde_json::Value = serde_json::from_slice(&body).unwrap();

        assert_eq!(json["object"], "list");
        assert_eq!(json["model"], "text-embedding-004");
        assert!(json["data"].is_array());
        assert_eq!(json["data"][0]["index"], 0);
        assert!(json["data"][0]["embedding"].is_array());
        assert_eq!(json["data"][0]["embedding"].as_array().unwrap().len(), 1536);
    }
}
