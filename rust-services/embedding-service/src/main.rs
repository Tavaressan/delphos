mod embedding_client;

use axum::{
    extract::State,
    http::StatusCode,
    response::IntoResponse,
    routing::{get, post},
    Json, Router,
};
use serde::{Deserialize, Serialize};

/// Número máximo de tentativas de chamada à Vertex AI antes de desistir,
/// configurável via EMBEDDING_MAX_RETRIES (padrão 3).
const DEFAULT_MAX_RETRIES: u32 = 3;

#[derive(Clone)]
pub struct AppState {
    pub authenticator: Option<shared::gcp::GcpAuthenticator>,
}

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

pub fn app(state: AppState) -> Router {
    Router::new()
        .route("/healthz", get(|| async { "OK" }))
        .route("/embeddings", post(handle_embeddings))
        .with_state(state)
}

async fn handle_embeddings(
    State(state): State<AppState>,
    Json(payload): Json<EmbeddingsRequest>,
) -> impl IntoResponse {
    if payload.input.is_empty() {
        return (
            StatusCode::BAD_REQUEST,
            "A lista de inputs não pode estar vazia.".to_string(),
        )
            .into_response();
    }

    let provider = std::env::var("EMBEDDING_PROVIDER").unwrap_or_else(|_| "real".to_string());
    let model =
        std::env::var("EMBEDDING_MODEL").unwrap_or_else(|_| "gemini-embedding-001".to_string());
    let dimensions = payload.dimensions.unwrap_or(768);

    if provider == "mock" {
        let data: Vec<EmbeddingData> = payload
            .input
            .iter()
            .enumerate()
            .map(|(idx, text)| EmbeddingData {
                object: "embedding",
                index: idx,
                embedding: generate_mock_embedding(text, dimensions),
            })
            .collect();

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

    let ai_studio_api_key = std::env::var("GOOGLE_AI_STUDIO_API_KEY").ok();

    let vertex_token: Option<String> = match &state.authenticator {
        Some(auth) => match auth
            .get_token(&["https://www.googleapis.com/auth/cloud-platform"])
            .await
        {
            Ok(t) => Some(t.as_str().to_string()),
            Err(e) => {
                println!(
                    "WARNING: falha ao obter token GCP ({}). Tentando fallback para Google AI Studio, se configurado.",
                    e
                );
                None
            }
        },
        None => None,
    };

    if vertex_token.is_none() && ai_studio_api_key.is_none() {
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            "Erro de autenticação: GOOGLE_APPLICATION_CREDENTIALS não configurado e GOOGLE_AI_STUDIO_API_KEY ausente."
                .to_string(),
        )
            .into_response();
    }

    let project_id =
        std::env::var("GCP_PROJECT_ID").unwrap_or_else(|_| "alfabra-platform".to_string());
    let region = std::env::var("GCP_LOCATION").unwrap_or_else(|_| "us-central1".to_string());

    let vertex_url = embedding_client::vertex_ai_url(&region, &project_id, &model);
    let ai_studio_url =
        embedding_client::ai_studio_url(embedding_client::AI_STUDIO_DEFAULT_BASE_URL, &model);
    let vertex_request = embedding_client::build_vertex_request(&payload.input, dimensions);

    let client = reqwest::Client::new();
    let max_retries: u32 = std::env::var("EMBEDDING_MAX_RETRIES")
        .ok()
        .and_then(|v| v.parse().ok())
        .unwrap_or(DEFAULT_MAX_RETRIES);

    let embeddings = match embedding_client::generate_embeddings(
        &client,
        &vertex_url,
        vertex_token.as_deref(),
        &vertex_request,
        max_retries,
        &ai_studio_url,
        ai_studio_api_key.as_deref(),
        &payload.input,
        dimensions,
        &model,
    )
    .await
    {
        Ok(e) => e,
        Err(e) => {
            return (StatusCode::INTERNAL_SERVER_ERROR, e).into_response();
        }
    };

    let data: Vec<EmbeddingData> = embeddings
        .into_iter()
        .enumerate()
        .map(|(idx, values)| EmbeddingData {
            object: "embedding",
            index: idx,
            embedding: values,
        })
        .collect();

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
    let provider = std::env::var("EMBEDDING_PROVIDER").unwrap_or_else(|_| "real".to_string());

    let authenticator = if provider == "real" {
        println!("Inicializando GcpAuthenticator para o provider real...");
        let auth = match shared::gcp::GcpAuthenticator::new().await {
            Ok(a) => a,
            Err(e) => {
                eprintln!("Erro crítico ao inicializar o autenticador GCP: {}", e);
                std::process::exit(1);
            }
        };
        println!("Verificando conectividade com o GCP...");
        if let Err(e) = auth.verify_connectivity().await {
            eprintln!("Erro crítico: falha ao obter token GCP no startup: {}", e);
            eprintln!("Verifique se ADC_PATH aponta para credenciais válidas e ativas.");
            std::process::exit(1);
        }
        println!("Conectividade com GCP confirmada.");
        Some(auth)
    } else {
        println!("Provider configurado como mock. GCP Autenticador ignorado.");
        None
    };

    let state = AppState { authenticator };
    let app = app(state);

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
    use http_body_util::BodyExt;
    use std::sync::Mutex;
    use tower::ServiceExt;

    static ENV_MUTEX: Mutex<()> = Mutex::new(());

    #[tokio::test]
    async fn test_healthz() {
        let state = AppState {
            authenticator: None,
        };
        let app = app(state);

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
        let state = AppState {
            authenticator: None,
        };
        let app = app(state);

        let response = app
            .oneshot(
                Request::builder()
                    .method("POST")
                    .uri("/embeddings")
                    .header("Content-Type", "application/json")
                    .body(Body::from(r#"{"input": [], "dimensions": 768}"#))
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
        let _guard = ENV_MUTEX.lock().unwrap();
        std::env::set_var("EMBEDDING_PROVIDER", "mock");
        std::env::set_var("EMBEDDING_MODEL", "gemini-embedding-001");

        let state = AppState {
            authenticator: None,
        };
        let app = app(state);

        let response = app
            .oneshot(
                Request::builder()
                    .method("POST")
                    .uri("/embeddings")
                    .header("Content-Type", "application/json")
                    .body(Body::from(r#"{"input": ["Olá Mundo"], "dimensions": 768}"#))
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::OK);

        let body = response.into_body().collect().await.unwrap().to_bytes();
        let json: serde_json::Value = serde_json::from_slice(&body).unwrap();

        assert_eq!(json["object"], "list");
        assert_eq!(json["model"], "gemini-embedding-001");
        assert!(json["data"].is_array());
        assert_eq!(json["data"][0]["index"], 0);
        assert!(json["data"][0]["embedding"].is_array());
        assert_eq!(json["data"][0]["embedding"].as_array().unwrap().len(), 768);
    }

    #[test]
    fn test_generate_mock_embedding_is_deterministic_and_normalized() {
        let text1 = "Qualidade e conformidade";
        let text2 = "Outro texto de teste";

        let emb1_a = generate_mock_embedding(text1, 768);
        let emb1_b = generate_mock_embedding(text1, 768);
        let emb2 = generate_mock_embedding(text2, 768);

        assert_eq!(emb1_a, emb1_b);
        assert_ne!(emb1_a, emb2);
        assert_eq!(emb1_a.len(), 768);

        let sum_sq: f32 = emb1_a.iter().map(|v| v * v).sum();
        assert!((sum_sq - 1.0).abs() < 0.001, "Magnitude: {}", sum_sq);
    }

    #[tokio::test]
    async fn test_embeddings_real_provider_no_credentials() {
        let _guard = ENV_MUTEX.lock().unwrap();
        std::env::set_var("EMBEDDING_PROVIDER", "real");
        std::env::remove_var("GOOGLE_APPLICATION_CREDENTIALS");
        std::env::remove_var("GOOGLE_AI_STUDIO_API_KEY");

        let state = AppState {
            authenticator: None,
        };
        let app = app(state);

        let response = app
            .oneshot(
                Request::builder()
                    .method("POST")
                    .uri("/embeddings")
                    .header("Content-Type", "application/json")
                    .body(Body::from(r#"{"input": ["Olá Mundo"], "dimensions": 768}"#))
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::INTERNAL_SERVER_ERROR);

        let body = response.into_body().collect().await.unwrap().to_bytes();
        let body_str = String::from_utf8_lossy(&body);
        assert!(body_str.contains("GOOGLE_APPLICATION_CREDENTIALS não configurado"));
    }
}
