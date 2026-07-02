use axum::{
    extract::State,
    http::StatusCode,
    response::IntoResponse,
    routing::{get, post},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use std::time::Duration;

/// Número máximo de tentativas de chamada à Vertex AI antes de desistir,
/// configurável via EMBEDDING_MAX_RETRIES (padrão 3).
const DEFAULT_MAX_RETRIES: u32 = 3;

/// Delay base do backoff exponencial em milissegundos: base_ms * 2^tentativa.
const BASE_BACKOFF_MS: u64 = 200;

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
        std::env::var("EMBEDDING_MODEL").unwrap_or_else(|_| "text-embedding-004".to_string());
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

    let project_id =
        std::env::var("GCP_PROJECT_ID").unwrap_or_else(|_| "alfabra-platform".to_string());
    let region = std::env::var("GCP_LOCATION").unwrap_or_else(|_| "us-central1".to_string());

    let authenticator = match &state.authenticator {
        Some(auth) => auth,
        None => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                "Erro de autenticação: GOOGLE_APPLICATION_CREDENTIALS não configurado.".to_string(),
            )
                .into_response();
        }
    };

    let token = match authenticator
        .get_token(&["https://www.googleapis.com/auth/cloud-platform"])
        .await
    {
        Ok(t) => t,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("Erro ao obter token GCP: {}", e),
            )
                .into_response();
        }
    };

    let url = format!(
        "https://{}-aiplatform.googleapis.com/v1/projects/{}/locations/{}/publishers/google/models/{}:predict",
        region, project_id, region, model
    );

    let instances: Vec<VertexInstances> = payload
        .input
        .iter()
        .map(|text| VertexInstances {
            content: text.clone(),
        })
        .collect();

    let vertex_req = VertexRequest {
        instances,
        parameters: VertexParameters {
            output_dimensionality: dimensions,
        },
    };

    let client = reqwest::Client::new();
    let max_retries: u32 = std::env::var("EMBEDDING_MAX_RETRIES")
        .ok()
        .and_then(|v| v.parse().ok())
        .unwrap_or(DEFAULT_MAX_RETRIES);

    let res = match call_vertex_with_retry(&client, &url, &token, &vertex_req, max_retries).await {
        Ok(r) => r,
        Err(e) => {
            return (StatusCode::INTERNAL_SERVER_ERROR, e).into_response();
        }
    };

    let vertex_res: VertexResponse = match res.json().await {
        Ok(vr) => vr,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("Failed to parse response from Vertex AI: {}", e),
            )
                .into_response();
        }
    };

    let data: Vec<EmbeddingData> = vertex_res
        .predictions
        .into_iter()
        .enumerate()
        .map(|(idx, pred)| EmbeddingData {
            object: "embedding",
            index: idx,
            embedding: pred.embeddings.values,
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

/// Indica se um status HTTP de resposta da Vertex AI justifica uma nova
/// tentativa: erros transitórios (429 rate limit e 5xx de servidor).
fn is_retryable_status(status: reqwest::StatusCode) -> bool {
    status == reqwest::StatusCode::TOO_MANY_REQUESTS || status.is_server_error()
}

/// Calcula o delay do backoff exponencial para uma tentativa (0-indexada):
/// base_ms * 2^tentativa.
fn compute_backoff_delay(attempt: u32, base_ms: u64) -> Duration {
    Duration::from_millis(base_ms.saturating_mul(2u64.saturating_pow(attempt)))
}

/// Chama a API de predict da Vertex AI com retry e backoff exponencial para
/// falhas transitórias (erro de rede ou status 429/5xx), até `max_retries`
/// tentativas adicionais além da primeira.
async fn call_vertex_with_retry(
    client: &reqwest::Client,
    url: &str,
    token: &gcp_auth::Token,
    body: &VertexRequest,
    max_retries: u32,
) -> Result<reqwest::Response, String> {
    let mut attempt = 0;
    loop {
        let result = client
            .post(url)
            .header("Content-Type", "application/json")
            .header("Authorization", format!("Bearer {}", token.as_str()))
            .json(body)
            .send()
            .await;

        match result {
            Ok(res) if res.status().is_success() => return Ok(res),
            Ok(res) => {
                let status = res.status();
                if attempt >= max_retries || !is_retryable_status(status) {
                    let body_text = res
                        .text()
                        .await
                        .unwrap_or_else(|_| "Unknown error".to_string());
                    return Err(format!(
                        "Vertex AI returned error {}: {}",
                        status, body_text
                    ));
                }
            }
            Err(e) => {
                if attempt >= max_retries {
                    return Err(format!("Failed to send request to Vertex AI: {}", e));
                }
            }
        }

        tokio::time::sleep(compute_backoff_delay(attempt, BASE_BACKOFF_MS)).await;
        attempt += 1;
    }
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

    #[test]
    fn test_is_retryable_status_for_transient_errors() {
        assert!(is_retryable_status(reqwest::StatusCode::TOO_MANY_REQUESTS));
        assert!(is_retryable_status(
            reqwest::StatusCode::INTERNAL_SERVER_ERROR
        ));
        assert!(is_retryable_status(
            reqwest::StatusCode::SERVICE_UNAVAILABLE
        ));
    }

    #[test]
    fn test_is_retryable_status_for_non_transient_errors() {
        assert!(!is_retryable_status(reqwest::StatusCode::BAD_REQUEST));
        assert!(!is_retryable_status(reqwest::StatusCode::UNAUTHORIZED));
        assert!(!is_retryable_status(reqwest::StatusCode::NOT_FOUND));
        assert!(!is_retryable_status(reqwest::StatusCode::OK));
    }

    #[test]
    fn test_compute_backoff_delay_grows_exponentially() {
        assert_eq!(compute_backoff_delay(0, 200), Duration::from_millis(200));
        assert_eq!(compute_backoff_delay(1, 200), Duration::from_millis(400));
        assert_eq!(compute_backoff_delay(2, 200), Duration::from_millis(800));
        assert_eq!(compute_backoff_delay(3, 200), Duration::from_millis(1600));
    }

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
        std::env::set_var("EMBEDDING_MODEL", "text-embedding-004");

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
        assert_eq!(json["model"], "text-embedding-004");
        assert!(json["data"].is_array());
        assert_eq!(json["data"][0]["index"], 0);
        assert!(json["data"][0]["embedding"].is_array());
        assert_eq!(json["data"][0]["embedding"].as_array().unwrap().len(), 768);
    }

    #[tokio::test]
    async fn test_embeddings_real_provider_no_credentials() {
        let _guard = ENV_MUTEX.lock().unwrap();
        std::env::set_var("EMBEDDING_PROVIDER", "real");
        std::env::remove_var("GOOGLE_APPLICATION_CREDENTIALS");

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
