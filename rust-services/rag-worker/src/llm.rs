//! Cliente HTTP para geração da resposta final do RAG via API generateContent do Gemini.
//!
//! Suporta dois providers com o mesmo formato de request/response:
//! - Vertex AI (`{location}-aiplatform.googleapis.com`), autenticado via ADC (OAuth token).
//! - Google AI Studio (`generativelanguage.googleapis.com`), autenticado via API key.
//!
//! `generate_response` tenta Vertex AI primeiro (quando há token) e cai para o AI Studio
//! quando a chamada falha ou quando não há token disponível (ADC não configurado).

use crate::error::WorkerError;
use serde::{Deserialize, Serialize};

/// Base URL padrão da API do Google AI Studio.
pub const AI_STUDIO_DEFAULT_BASE_URL: &str = "https://generativelanguage.googleapis.com";

#[derive(Serialize, Debug)]
pub struct GeminiPart {
    pub text: String,
}

#[derive(Serialize, Debug)]
pub struct GeminiContent {
    pub role: String,
    pub parts: Vec<GeminiPart>,
}

#[derive(Serialize, Debug)]
pub struct GeminiSystemInstruction {
    pub parts: Vec<GeminiPart>,
}

#[derive(Serialize, Debug)]
pub struct GeminiGenerationConfig {
    pub temperature: Option<f32>,
    #[serde(rename = "maxOutputTokens")]
    pub max_output_tokens: Option<usize>,
}

#[derive(Serialize, Debug)]
pub struct GeminiRequest {
    pub contents: Vec<GeminiContent>,
    #[serde(rename = "systemInstruction")]
    pub system_instruction: Option<GeminiSystemInstruction>,
    #[serde(rename = "generationConfig")]
    pub generation_config: Option<GeminiGenerationConfig>,
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

/// Monta o corpo do request para a API generateContent, comum a Vertex AI e AI Studio.
pub fn build_gemini_request(
    system_instruction: &str,
    user_content: &str,
    temperature: f32,
    max_output_tokens: usize,
) -> GeminiRequest {
    GeminiRequest {
        contents: vec![GeminiContent {
            role: "user".to_string(),
            parts: vec![GeminiPart {
                text: user_content.to_string(),
            }],
        }],
        system_instruction: Some(GeminiSystemInstruction {
            parts: vec![GeminiPart {
                text: system_instruction.to_string(),
            }],
        }),
        generation_config: Some(GeminiGenerationConfig {
            temperature: Some(temperature),
            max_output_tokens: Some(max_output_tokens),
        }),
    }
}

/// Monta a URL de generateContent do Vertex AI para o projeto/localização/modelo informados.
pub fn vertex_ai_url(location: &str, project_id: &str, model_id: &str) -> String {
    format!(
        "https://{location}-aiplatform.googleapis.com/v1/projects/{project_id}/locations/{location}/publishers/google/models/{model_id}:generateContent"
    )
}

/// Monta a URL de generateContent do Google AI Studio a partir de uma base URL (injetável em
/// testes) e do modelo informado.
pub fn ai_studio_url(base_url: &str, model_id: &str) -> String {
    format!("{base_url}/v1beta/models/{model_id}:generateContent")
}

fn extract_text(response: GeminiResponse, provider: &str) -> Result<String, WorkerError> {
    response
        .candidates
        .and_then(|c| c.into_iter().next())
        .and_then(|cand| cand.content.parts.into_iter().next())
        .and_then(|part| part.text)
        .ok_or_else(|| {
            WorkerError::VertexAI(format!("Empty text response received from {}", provider))
        })
}

/// Chama a API generateContent do Vertex AI, autenticada via Bearer token (OAuth/ADC).
pub async fn call_vertex_ai(
    client: &reqwest::Client,
    url: &str,
    token: &str,
    request: &GeminiRequest,
) -> Result<String, WorkerError> {
    let res = client
        .post(url)
        .header("Content-Type", "application/json")
        .header("Authorization", format!("Bearer {}", token))
        .json(request)
        .send()
        .await
        .map_err(|e| WorkerError::VertexAI(format!("HTTP error calling Vertex AI: {}", e)))?;

    let status = res.status();
    if !status.is_success() {
        let err_body = res.text().await.unwrap_or_default();
        return Err(WorkerError::VertexAI(format!(
            "Vertex AI API returned error status {}: {}",
            status, err_body
        )));
    }

    let parsed: GeminiResponse = res.json().await.map_err(|e| {
        WorkerError::Serialization(format!("Failed to parse Vertex AI response body: {}", e))
    })?;

    extract_text(parsed, "Vertex AI")
}

/// Chama a API generateContent do Google AI Studio, autenticada via API key.
pub async fn call_ai_studio(
    client: &reqwest::Client,
    url: &str,
    api_key: &str,
    request: &GeminiRequest,
) -> Result<String, WorkerError> {
    let res = client
        .post(url)
        .header("Content-Type", "application/json")
        .header("x-goog-api-key", api_key)
        .json(request)
        .send()
        .await
        .map_err(|e| {
            WorkerError::VertexAI(format!("HTTP error calling Google AI Studio: {}", e))
        })?;

    let status = res.status();
    if !status.is_success() {
        let err_body = res.text().await.unwrap_or_default();
        return Err(WorkerError::VertexAI(format!(
            "Google AI Studio API returned error status {}: {}",
            status, err_body
        )));
    }

    let parsed: GeminiResponse = res.json().await.map_err(|e| {
        WorkerError::Serialization(format!(
            "Failed to parse Google AI Studio response body: {}",
            e
        ))
    })?;

    extract_text(parsed, "Google AI Studio")
}

/// Orquestra a geração da resposta: tenta Vertex AI (quando há token OAuth disponível) e cai
/// para o Google AI Studio quando a chamada falhar ou quando não há token (ADC não configurado).
/// Retorna erro apenas se nenhum dos dois providers estiver disponível ou ambos falharem.
pub async fn generate_response(
    client: &reqwest::Client,
    vertex_url: &str,
    vertex_token: Option<&str>,
    ai_studio_url: &str,
    ai_studio_api_key: Option<&str>,
    request: &GeminiRequest,
) -> Result<String, WorkerError> {
    if let Some(token) = vertex_token {
        match call_vertex_ai(client, vertex_url, token, request).await {
            Ok(text) => return Ok(text),
            Err(e) => {
                if let Some(api_key) = ai_studio_api_key {
                    println!(
                        "WARNING: Vertex AI call failed ({}). Falling back to Google AI Studio.",
                        e
                    );
                    return call_ai_studio(client, ai_studio_url, api_key, request).await;
                }
                return Err(e);
            }
        }
    }

    if let Some(api_key) = ai_studio_api_key {
        println!("Vertex AI token indisponível (ADC não configurado). Usando Google AI Studio.");
        return call_ai_studio(client, ai_studio_url, api_key, request).await;
    }

    Err(WorkerError::Config(
        "Nenhum provider de LLM disponível: GCP Authenticator (Vertex AI) não inicializado e \
         GOOGLE_AI_STUDIO_API_KEY não configurada."
            .to_string(),
    ))
}

#[cfg(test)]
mod tests {
    use super::*;
    use wiremock::matchers::{header, method, path};
    use wiremock::{Mock, MockServer, ResponseTemplate};

    fn success_body(text: &str) -> serde_json::Value {
        serde_json::json!({
            "candidates": [{
                "content": {
                    "parts": [{ "text": text }]
                }
            }]
        })
    }

    fn sample_request() -> GeminiRequest {
        build_gemini_request("system prompt", "user question", 0.2, 2048)
    }

    #[test]
    fn test_vertex_ai_url_format() {
        let url = vertex_ai_url("us-central1", "alfabra-platform", "gemini-2.5-flash");
        assert_eq!(
            url,
            "https://us-central1-aiplatform.googleapis.com/v1/projects/alfabra-platform/locations/us-central1/publishers/google/models/gemini-2.5-flash:generateContent"
        );
    }

    #[test]
    fn test_ai_studio_url_format() {
        let url = ai_studio_url(AI_STUDIO_DEFAULT_BASE_URL, "gemini-2.5-flash");
        assert_eq!(
            url,
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent"
        );
    }

    #[tokio::test]
    async fn test_generate_response_uses_vertex_ai_when_it_succeeds() {
        let mock_server = MockServer::start().await;
        Mock::given(method("POST"))
            .and(path("/vertex"))
            .and(header("Authorization", "Bearer fake-token"))
            .respond_with(ResponseTemplate::new(200).set_body_json(success_body("resposta vertex")))
            .expect(1)
            .mount(&mock_server)
            .await;

        let client = reqwest::Client::new();
        let vertex_url = format!("{}/vertex", mock_server.uri());
        let ai_studio_url = format!("{}/ai-studio", mock_server.uri());

        let result = generate_response(
            &client,
            &vertex_url,
            Some("fake-token"),
            &ai_studio_url,
            Some("fake-api-key"),
            &sample_request(),
        )
        .await;

        assert_eq!(result.unwrap(), "resposta vertex");
    }

    #[tokio::test]
    async fn test_generate_response_falls_back_to_ai_studio_when_vertex_ai_fails() {
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
                ResponseTemplate::new(200).set_body_json(success_body("resposta ai studio")),
            )
            .expect(1)
            .mount(&mock_server)
            .await;

        let client = reqwest::Client::new();
        let vertex_url = format!("{}/vertex", mock_server.uri());
        let ai_studio_url = format!("{}/ai-studio", mock_server.uri());

        let result = generate_response(
            &client,
            &vertex_url,
            Some("fake-token"),
            &ai_studio_url,
            Some("fake-api-key"),
            &sample_request(),
        )
        .await;

        assert_eq!(result.unwrap(), "resposta ai studio");
    }

    #[tokio::test]
    async fn test_generate_response_uses_ai_studio_directly_when_no_vertex_token() {
        let mock_server = MockServer::start().await;
        Mock::given(method("POST"))
            .and(path("/ai-studio"))
            .and(header("x-goog-api-key", "fake-api-key"))
            .respond_with(
                ResponseTemplate::new(200).set_body_json(success_body("sem ADC, direto AI Studio")),
            )
            .expect(1)
            .mount(&mock_server)
            .await;

        let client = reqwest::Client::new();
        let vertex_url = format!("{}/vertex", mock_server.uri());
        let ai_studio_url = format!("{}/ai-studio", mock_server.uri());

        let result = generate_response(
            &client,
            &vertex_url,
            None,
            &ai_studio_url,
            Some("fake-api-key"),
            &sample_request(),
        )
        .await;

        assert_eq!(result.unwrap(), "sem ADC, direto AI Studio");
    }

    #[tokio::test]
    async fn test_generate_response_errors_when_vertex_fails_and_no_ai_studio_key() {
        let mock_server = MockServer::start().await;
        Mock::given(method("POST"))
            .and(path("/vertex"))
            .respond_with(ResponseTemplate::new(500).set_body_string("Internal Server Error"))
            .expect(1)
            .mount(&mock_server)
            .await;

        let client = reqwest::Client::new();
        let vertex_url = format!("{}/vertex", mock_server.uri());

        let result = generate_response(
            &client,
            &vertex_url,
            Some("fake-token"),
            "http://unused.invalid",
            None,
            &sample_request(),
        )
        .await;

        assert!(result.is_err());
    }

    #[tokio::test]
    async fn test_generate_response_errors_when_no_provider_available() {
        let client = reqwest::Client::new();

        let result = generate_response(
            &client,
            "http://unused.invalid/vertex",
            None,
            "http://unused.invalid/ai-studio",
            None,
            &sample_request(),
        )
        .await;

        assert!(matches!(result, Err(WorkerError::Config(_))));
    }
}
