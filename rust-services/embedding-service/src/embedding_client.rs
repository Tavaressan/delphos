//! Cliente HTTP para geração de embeddings via Vertex AI ou Google AI Studio (fallback).
//!
//! Vertex AI (`{location}-aiplatform.googleapis.com`) é autenticado via ADC (OAuth token) e
//! chamado primeiro quando há token disponível. Ao falhar (ou quando não há token/ADC
//! configurado), cai para o Google AI Studio (`generativelanguage.googleapis.com`), autenticado
//! via API key, usando o endpoint `batchEmbedContents`.

use serde::{Deserialize, Serialize};
use std::time::Duration;

/// Base URL padrão da API do Google AI Studio.
pub const AI_STUDIO_DEFAULT_BASE_URL: &str = "https://generativelanguage.googleapis.com";

const BASE_BACKOFF_MS: u64 = 200;

#[derive(Serialize, Debug)]
pub struct VertexInstance {
    pub content: String,
}

#[derive(Serialize, Debug)]
pub struct VertexParameters {
    #[serde(rename = "outputDimensionality")]
    pub output_dimensionality: usize,
}

#[derive(Serialize, Debug)]
pub struct VertexRequest {
    pub instances: Vec<VertexInstance>,
    pub parameters: VertexParameters,
}

#[derive(Deserialize, Debug)]
struct VertexEmbeddingValues {
    values: Vec<f32>,
}

#[derive(Deserialize, Debug)]
struct VertexPrediction {
    embeddings: VertexEmbeddingValues,
}

#[derive(Deserialize, Debug)]
struct VertexResponse {
    predictions: Vec<VertexPrediction>,
}

/// Monta o corpo do request de embeddings para a API predict da Vertex AI.
pub fn build_vertex_request(texts: &[String], dimensions: usize) -> VertexRequest {
    VertexRequest {
        instances: texts
            .iter()
            .map(|t| VertexInstance { content: t.clone() })
            .collect(),
        parameters: VertexParameters {
            output_dimensionality: dimensions,
        },
    }
}

/// Monta a URL de predict da Vertex AI para o projeto/localização/modelo informados.
pub fn vertex_ai_url(location: &str, project_id: &str, model_id: &str) -> String {
    format!(
        "https://{location}-aiplatform.googleapis.com/v1/projects/{project_id}/locations/{location}/publishers/google/models/{model_id}:predict"
    )
}

/// Monta a URL de batchEmbedContents do Google AI Studio a partir de uma base URL (injetável em
/// testes) e do modelo informado.
pub fn ai_studio_url(base_url: &str, model_id: &str) -> String {
    format!("{base_url}/v1beta/models/{model_id}:batchEmbedContents")
}

fn is_retryable_status(status: reqwest::StatusCode) -> bool {
    status == reqwest::StatusCode::TOO_MANY_REQUESTS || status.is_server_error()
}

fn compute_backoff_delay(attempt: u32, base_ms: u64) -> Duration {
    Duration::from_millis(base_ms.saturating_mul(2u64.saturating_pow(attempt)))
}

/// Chama a API predict da Vertex AI com retry e backoff exponencial para falhas transitórias
/// (erro de rede ou status 429/5xx), até `max_retries` tentativas adicionais além da primeira.
pub async fn call_vertex_with_retry(
    client: &reqwest::Client,
    url: &str,
    token: &str,
    body: &VertexRequest,
    max_retries: u32,
) -> Result<Vec<Vec<f32>>, String> {
    let mut attempt = 0;
    loop {
        let result = client
            .post(url)
            .header("Content-Type", "application/json")
            .header("Authorization", format!("Bearer {}", token))
            .json(body)
            .send()
            .await;

        match result {
            Ok(res) if res.status().is_success() => {
                let parsed: VertexResponse = res
                    .json()
                    .await
                    .map_err(|e| format!("Failed to parse Vertex AI response body: {}", e))?;
                return Ok(parsed
                    .predictions
                    .into_iter()
                    .map(|p| p.embeddings.values)
                    .collect());
            }
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

#[derive(Serialize, Debug)]
struct AiStudioContentPart {
    text: String,
}

#[derive(Serialize, Debug)]
struct AiStudioContent {
    parts: Vec<AiStudioContentPart>,
}

#[derive(Serialize, Debug)]
struct AiStudioEmbedRequest {
    model: String,
    content: AiStudioContent,
    // A REST API batchEmbedContents espera outputDimensionality no topo de cada request.
    // Aninhá-lo em "embedContentConfig" (nome do wrapper do SDK Python) faz a API ignorar
    // o campo silenciosamente e devolver as 3072 dimensões nativas do modelo.
    #[serde(rename = "outputDimensionality")]
    output_dimensionality: usize,
}

#[derive(Serialize, Debug)]
struct AiStudioBatchRequest {
    requests: Vec<AiStudioEmbedRequest>,
}

#[derive(Deserialize, Debug)]
struct AiStudioEmbedding {
    values: Vec<f32>,
}

#[derive(Deserialize, Debug)]
struct AiStudioBatchResponse {
    embeddings: Vec<AiStudioEmbedding>,
}

/// Chama a API batchEmbedContents do Google AI Studio, autenticada via API key.
pub async fn call_ai_studio_embeddings(
    client: &reqwest::Client,
    url: &str,
    api_key: &str,
    texts: &[String],
    dimensions: usize,
    model_id: &str,
) -> Result<Vec<Vec<f32>>, String> {
    let body = AiStudioBatchRequest {
        requests: texts
            .iter()
            .map(|t| AiStudioEmbedRequest {
                model: format!("models/{}", model_id),
                content: AiStudioContent {
                    parts: vec![AiStudioContentPart { text: t.clone() }],
                },
                output_dimensionality: dimensions,
            })
            .collect(),
    };

    let res = client
        .post(url)
        .header("Content-Type", "application/json")
        .header("x-goog-api-key", api_key)
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("HTTP error calling Google AI Studio: {}", e))?;

    let status = res.status();
    if !status.is_success() {
        let err_body = res.text().await.unwrap_or_default();
        return Err(format!(
            "Google AI Studio API returned error status {}: {}",
            status, err_body
        ));
    }

    let parsed: AiStudioBatchResponse = res
        .json()
        .await
        .map_err(|e| format!("Failed to parse Google AI Studio response body: {}", e))?;

    Ok(parsed.embeddings.into_iter().map(|e| e.values).collect())
}

#[derive(Serialize, Debug)]
struct OllamaEmbedRequest {
    model: String,
    input: Vec<String>,
}

#[derive(Deserialize, Debug)]
struct OllamaEmbedResponse {
    embeddings: Vec<Vec<f32>>,
}

/// Monta a URL do endpoint de embeddings do Ollama a partir de uma base URL (injetável em
/// testes, default `http://ollama:11434`).
pub fn ollama_embed_url(base_url: &str) -> String {
    format!("{base_url}/api/embed")
}

/// Chama a API `/api/embed` do Ollama (provider local, sem autenticação).
pub async fn call_ollama_embeddings(
    client: &reqwest::Client,
    url: &str,
    texts: &[String],
    model_id: &str,
) -> Result<Vec<Vec<f32>>, String> {
    let body = OllamaEmbedRequest {
        model: model_id.to_string(),
        input: texts.to_vec(),
    };

    let res = client
        .post(url)
        .header("Content-Type", "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("HTTP error calling Ollama: {}", e))?;

    let status = res.status();
    if !status.is_success() {
        let err_body = res.text().await.unwrap_or_default();
        return Err(format!(
            "Ollama API returned error status {}: {}",
            status, err_body
        ));
    }

    let parsed: OllamaEmbedResponse = res
        .json()
        .await
        .map_err(|e| format!("Failed to parse Ollama response body: {}", e))?;

    Ok(parsed.embeddings)
}

/// Orquestra a geração de embeddings: tenta Vertex AI (quando há token OAuth disponível) e cai
/// para o Google AI Studio quando a chamada falhar ou quando não há token (ADC não configurado).
/// Retorna erro apenas se nenhum dos dois providers estiver disponível ou ambos falharem.
#[allow(clippy::too_many_arguments)]
pub async fn generate_embeddings(
    client: &reqwest::Client,
    vertex_url: &str,
    vertex_token: Option<&str>,
    vertex_request: &VertexRequest,
    max_retries: u32,
    ai_studio_url: &str,
    ai_studio_api_key: Option<&str>,
    texts: &[String],
    dimensions: usize,
    ai_studio_model: &str,
) -> Result<Vec<Vec<f32>>, String> {
    if let Some(token) = vertex_token {
        match call_vertex_with_retry(client, vertex_url, token, vertex_request, max_retries).await {
            Ok(embeddings) => return Ok(embeddings),
            Err(e) => {
                if let Some(api_key) = ai_studio_api_key {
                    println!(
                        "WARNING: Vertex AI call failed ({}). Falling back to Google AI Studio.",
                        e
                    );
                    return call_ai_studio_embeddings(
                        client,
                        ai_studio_url,
                        api_key,
                        texts,
                        dimensions,
                        ai_studio_model,
                    )
                    .await;
                }
                return Err(e);
            }
        }
    }

    if let Some(api_key) = ai_studio_api_key {
        println!("Vertex AI token indisponível (ADC não configurado). Usando Google AI Studio.");
        return call_ai_studio_embeddings(
            client,
            ai_studio_url,
            api_key,
            texts,
            dimensions,
            ai_studio_model,
        )
        .await;
    }

    Err(
        "Nenhum provider de embeddings disponível: GCP Authenticator (Vertex AI) não inicializado \
         e GOOGLE_AI_STUDIO_API_KEY não configurada."
            .to_string(),
    )
}

#[cfg(test)]
mod tests {
    use super::*;
    use wiremock::matchers::{header, method, path};
    use wiremock::{Mock, MockServer, ResponseTemplate};

    fn vertex_success_body(values: Vec<f32>) -> serde_json::Value {
        serde_json::json!({ "predictions": [{ "embeddings": { "values": values } }] })
    }

    fn ai_studio_success_body(values: Vec<f32>) -> serde_json::Value {
        serde_json::json!({ "embeddings": [{ "values": values }] })
    }

    fn sample_texts() -> Vec<String> {
        vec!["Olá Mundo".to_string()]
    }

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

    #[test]
    fn test_vertex_ai_url_format() {
        let url = vertex_ai_url("us-central1", "alfabra-platform", "gemini-embedding-001");
        assert_eq!(
            url,
            "https://us-central1-aiplatform.googleapis.com/v1/projects/alfabra-platform/locations/us-central1/publishers/google/models/gemini-embedding-001:predict"
        );
    }

    #[test]
    fn test_ai_studio_url_format() {
        let url = ai_studio_url(AI_STUDIO_DEFAULT_BASE_URL, "gemini-embedding-001");
        assert_eq!(
            url,
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:batchEmbedContents"
        );
    }

    #[tokio::test]
    async fn test_generate_embeddings_uses_vertex_ai_when_it_succeeds() {
        let mock_server = MockServer::start().await;
        Mock::given(method("POST"))
            .and(path("/vertex"))
            .and(header("Authorization", "Bearer fake-token"))
            .respond_with(
                ResponseTemplate::new(200).set_body_json(vertex_success_body(vec![0.1, 0.2])),
            )
            .expect(1)
            .mount(&mock_server)
            .await;

        let client = reqwest::Client::new();
        let vertex_url = format!("{}/vertex", mock_server.uri());
        let ai_studio_url = format!("{}/ai-studio", mock_server.uri());
        let texts = sample_texts();
        let request = build_vertex_request(&texts, 2);

        let result = generate_embeddings(
            &client,
            &vertex_url,
            Some("fake-token"),
            &request,
            0,
            &ai_studio_url,
            Some("fake-api-key"),
            &texts,
            2,
            "gemini-embedding-001",
        )
        .await;

        assert_eq!(result.unwrap(), vec![vec![0.1, 0.2]]);
    }

    #[tokio::test]
    async fn test_generate_embeddings_falls_back_to_ai_studio_when_vertex_fails() {
        let mock_server = MockServer::start().await;
        Mock::given(method("POST"))
            .and(path("/vertex"))
            .respond_with(ResponseTemplate::new(503).set_body_string("Service Unavailable"))
            .expect(1)
            .mount(&mock_server)
            .await;

        Mock::given(method("POST"))
            .and(path("/ai-studio"))
            .and(header("x-goog-api-key", "fake-api-key"))
            .respond_with(
                ResponseTemplate::new(200).set_body_json(ai_studio_success_body(vec![0.3, 0.4])),
            )
            .expect(1)
            .mount(&mock_server)
            .await;

        let client = reqwest::Client::new();
        let vertex_url = format!("{}/vertex", mock_server.uri());
        let ai_studio_url = format!("{}/ai-studio", mock_server.uri());
        let texts = sample_texts();
        let request = build_vertex_request(&texts, 2);

        let result = generate_embeddings(
            &client,
            &vertex_url,
            Some("fake-token"),
            &request,
            0,
            &ai_studio_url,
            Some("fake-api-key"),
            &texts,
            2,
            "gemini-embedding-001",
        )
        .await;

        assert_eq!(result.unwrap(), vec![vec![0.3, 0.4]]);
    }

    #[tokio::test]
    async fn test_generate_embeddings_uses_ai_studio_directly_when_no_vertex_token() {
        let mock_server = MockServer::start().await;
        Mock::given(method("POST"))
            .and(path("/ai-studio"))
            .and(header("x-goog-api-key", "fake-api-key"))
            .respond_with(
                ResponseTemplate::new(200).set_body_json(ai_studio_success_body(vec![0.5])),
            )
            .expect(1)
            .mount(&mock_server)
            .await;

        let client = reqwest::Client::new();
        let vertex_url = format!("{}/vertex", mock_server.uri());
        let ai_studio_url = format!("{}/ai-studio", mock_server.uri());
        let texts = sample_texts();
        let request = build_vertex_request(&texts, 1);

        let result = generate_embeddings(
            &client,
            &vertex_url,
            None,
            &request,
            0,
            &ai_studio_url,
            Some("fake-api-key"),
            &texts,
            1,
            "gemini-embedding-001",
        )
        .await;

        assert_eq!(result.unwrap(), vec![vec![0.5]]);
    }

    #[tokio::test]
    async fn test_generate_embeddings_errors_when_vertex_fails_and_no_ai_studio_key() {
        let mock_server = MockServer::start().await;
        Mock::given(method("POST"))
            .and(path("/vertex"))
            .respond_with(ResponseTemplate::new(500).set_body_string("Internal Server Error"))
            .expect(1)
            .mount(&mock_server)
            .await;

        let client = reqwest::Client::new();
        let vertex_url = format!("{}/vertex", mock_server.uri());
        let texts = sample_texts();
        let request = build_vertex_request(&texts, 1);

        let result = generate_embeddings(
            &client,
            &vertex_url,
            Some("fake-token"),
            &request,
            0,
            "http://unused.invalid",
            None,
            &texts,
            1,
            "gemini-embedding-001",
        )
        .await;

        assert!(result.is_err());
    }

    #[tokio::test]
    async fn test_generate_embeddings_errors_when_no_provider_available() {
        let client = reqwest::Client::new();
        let texts = sample_texts();
        let request = build_vertex_request(&texts, 1);

        let result = generate_embeddings(
            &client,
            "http://unused.invalid/vertex",
            None,
            &request,
            0,
            "http://unused.invalid/ai-studio",
            None,
            &texts,
            1,
            "gemini-embedding-001",
        )
        .await;

        assert!(result.is_err());
    }

    /// Regressão da issue #382: o campo de dimensão precisa ir no TOPO de cada request.
    ///
    /// A REST API batchEmbedContents ignora silenciosamente campos desconhecidos, então
    /// aninhar outputDimensionality em "embedContentConfig" (nome do wrapper do SDK Python)
    /// fazia a API devolver as 3072 dimensões nativas do modelo em vez das 768 pedidas —
    /// e todo INSERT em document_chunks.embedding vector(768) falhava.
    #[tokio::test]
    async fn test_ai_studio_request_sends_output_dimensionality_at_top_level() {
        let mock_server = MockServer::start().await;
        Mock::given(method("POST"))
            .and(path("/ai-studio"))
            .respond_with(
                ResponseTemplate::new(200).set_body_json(ai_studio_success_body(vec![0.1])),
            )
            .expect(1)
            .mount(&mock_server)
            .await;

        let client = reqwest::Client::new();
        let ai_studio_url = format!("{}/ai-studio", mock_server.uri());

        call_ai_studio_embeddings(
            &client,
            &ai_studio_url,
            "fake-api-key",
            &sample_texts(),
            768,
            "gemini-embedding-001",
        )
        .await
        .expect("chamada ao mock deve suceder");

        let requests = mock_server.received_requests().await.unwrap();
        let body: serde_json::Value = serde_json::from_slice(&requests[0].body).unwrap();
        let entry = &body["requests"][0];

        assert_eq!(
            entry["outputDimensionality"], 768,
            "outputDimensionality deve estar no topo do request"
        );
        assert!(
            entry.get("embedContentConfig").is_none(),
            "embedContentConfig é do SDK Python e é ignorado pela REST API — não deve ser enviado"
        );
    }

    #[test]
    fn test_ollama_embed_url_format() {
        assert_eq!(
            ollama_embed_url("http://ollama:11434"),
            "http://ollama:11434/api/embed"
        );
    }

    #[tokio::test]
    async fn test_call_ollama_embeddings_success() {
        let mock_server = MockServer::start().await;
        Mock::given(method("POST"))
            .and(path("/api/embed"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
                "model": "nomic-embed-text",
                "embeddings": [[0.1, 0.2, 0.3]]
            })))
            .expect(1)
            .mount(&mock_server)
            .await;

        let client = reqwest::Client::new();
        let url = ollama_embed_url(&mock_server.uri());

        let result =
            call_ollama_embeddings(&client, &url, &sample_texts(), "nomic-embed-text").await;

        assert_eq!(result.unwrap(), vec![vec![0.1, 0.2, 0.3]]);

        let requests = mock_server.received_requests().await.unwrap();
        let body: serde_json::Value = serde_json::from_slice(&requests[0].body).unwrap();
        assert_eq!(body["model"], "nomic-embed-text");
        assert_eq!(body["input"][0], "Olá Mundo");
    }

    #[tokio::test]
    async fn test_call_ollama_embeddings_error_status() {
        let mock_server = MockServer::start().await;
        Mock::given(method("POST"))
            .and(path("/api/embed"))
            .respond_with(ResponseTemplate::new(500).set_body_string("internal error"))
            .expect(1)
            .mount(&mock_server)
            .await;

        let client = reqwest::Client::new();
        let url = ollama_embed_url(&mock_server.uri());

        let result =
            call_ollama_embeddings(&client, &url, &sample_texts(), "nomic-embed-text").await;

        assert!(result.is_err());
    }
}
