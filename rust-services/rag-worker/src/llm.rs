//! Cliente HTTP para geração da resposta final do RAG.
//!
//! Suporta uma cadeia de fallback ordenada:
//! - Google AI Studio (`generativelanguage.googleapis.com`), autenticado via API key. Provider
//!   primário: sem cota de free tier expirada, ao contrário do Vertex AI.
//! - Ollama (`OLLAMA_BASE_URL`, default `http://ollama:11434`), provider local sem
//!   autenticação, usado como segundo elo — continuidade de serviço degradado quando o AI
//!   Studio está indisponível. Formato de request/response próprio (`/api/chat`), incompatível
//!   com o formato Gemini, daí o adaptador dedicado abaixo.
//! - Vertex AI (`{location}-aiplatform.googleapis.com`), autenticado via ADC (OAuth token).
//!   Último elo: o free tier do projeto GCP está expirado, então toda chamada paga uma
//!   tentativa fadada ao fracasso antes de poder cair para o próximo provider — por isso fica
//!   por último em vez de primeiro.
//!
//! `generate_response` tenta o Google AI Studio primeiro (quando há API key), cai para o Ollama
//! quando a chamada falha ou quando não há API key disponível, e só recorre ao Vertex AI se
//! ambos os providers anteriores falharem ou não estiverem configurados.

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

#[derive(Serialize, Debug)]
pub struct OllamaMessage {
    pub role: String,
    pub content: String,
}

#[derive(Serialize, Debug)]
pub struct OllamaChatRequest {
    pub model: String,
    pub messages: Vec<OllamaMessage>,
    pub stream: bool,
}

#[derive(Deserialize, Debug)]
struct OllamaResponseMessage {
    content: String,
}

#[derive(Deserialize, Debug)]
struct OllamaChatResponse {
    message: OllamaResponseMessage,
}

/// Monta o corpo do request para a API `/api/chat` do Ollama. Formato próprio, diferente do
/// Gemini: mensagens com `role`/`content` em vez de `contents`/`systemInstruction`.
pub fn build_ollama_request(
    model: &str,
    system_instruction: &str,
    user_content: &str,
) -> OllamaChatRequest {
    OllamaChatRequest {
        model: model.to_string(),
        messages: vec![
            OllamaMessage {
                role: "system".to_string(),
                content: system_instruction.to_string(),
            },
            OllamaMessage {
                role: "user".to_string(),
                content: user_content.to_string(),
            },
        ],
        stream: false,
    }
}

/// Monta a URL de chat do Ollama a partir de uma base URL (injetável em testes).
pub fn ollama_chat_url(base_url: &str) -> String {
    format!("{base_url}/api/chat")
}

/// Chama a API `/api/chat` do Ollama (provider local, sem autenticação).
pub async fn call_ollama(
    client: &reqwest::Client,
    url: &str,
    request: &OllamaChatRequest,
) -> Result<String, WorkerError> {
    let res = client
        .post(url)
        .header("Content-Type", "application/json")
        .json(request)
        .send()
        .await
        .map_err(|e| WorkerError::VertexAI(format!("HTTP error calling Ollama: {}", e)))?;

    let status = res.status();
    if !status.is_success() {
        let err_body = res.text().await.unwrap_or_default();
        return Err(WorkerError::VertexAI(format!(
            "Ollama API returned error status {}: {}",
            status, err_body
        )));
    }

    let parsed: OllamaChatResponse = res.json().await.map_err(|e| {
        WorkerError::Serialization(format!("Failed to parse Ollama response body: {}", e))
    })?;

    Ok(parsed.message.content)
}

/// Orquestra a geração da resposta em uma cadeia de fallback ordenada: Google AI Studio (quando
/// há API key disponível) → Ollama (quando a chamada falhar ou quando não há API key, apenas se
/// `ollama_model` estiver configurado) → Vertex AI (último elo, quando há token OAuth
/// disponível). Vertex fica por último porque o free tier do projeto GCP está expirado: toda
/// chamada paga uma tentativa fadada ao fracasso antes de poder degradar para o próximo
/// provider, então não faz sentido tentá-lo primeiro.
/// Retorna erro apenas se todos os providers configurados falharem ou nenhum estiver disponível.
#[allow(clippy::too_many_arguments)]
pub async fn generate_response(
    client: &reqwest::Client,
    vertex_url: &str,
    vertex_token: Option<&str>,
    ai_studio_url: &str,
    ai_studio_api_key: Option<&str>,
    ollama_url: &str,
    ollama_model: Option<&str>,
    system_instruction: &str,
    user_content: &str,
    request: &GeminiRequest,
) -> Result<String, WorkerError> {
    let mut last_err: Option<WorkerError> = None;

    if let Some(api_key) = ai_studio_api_key {
        match call_ai_studio(client, ai_studio_url, api_key, request).await {
            Ok(text) => return Ok(text),
            Err(e) => {
                println!(
                    "WARNING: Google AI Studio call failed ({}). Trying next provider.",
                    e
                );
                last_err = Some(e);
            }
        }
    }

    if let Some(model) = ollama_model {
        let ollama_request = build_ollama_request(model, system_instruction, user_content);
        match call_ollama(client, ollama_url, &ollama_request).await {
            Ok(text) => return Ok(text),
            Err(e) => {
                println!("WARNING: Ollama call failed ({}). Trying next provider.", e);
                last_err = Some(e);
            }
        }
    }

    if let Some(token) = vertex_token {
        match call_vertex_ai(client, vertex_url, token, request).await {
            Ok(text) => return Ok(text),
            Err(e) => {
                println!("WARNING: Vertex AI call failed ({}).", e);
                last_err = Some(e);
            }
        }
    }

    Err(last_err.unwrap_or_else(|| {
        WorkerError::Config(
            "Nenhum provider de LLM disponível: GOOGLE_AI_STUDIO_API_KEY não configurada, \
             OLLAMA_CHAT_MODEL não configurado e GCP Authenticator (Vertex AI) não inicializado."
                .to_string(),
        )
    }))
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
    async fn test_generate_response_uses_ai_studio_when_it_succeeds() {
        let mock_server = MockServer::start().await;
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
            "http://unused.invalid/ollama",
            None,
            "system prompt",
            "user question",
            &sample_request(),
        )
        .await;

        assert_eq!(result.unwrap(), "resposta ai studio");
    }

    #[tokio::test]
    async fn test_generate_response_falls_back_to_vertex_ai_when_ai_studio_and_ollama_fail() {
        let mock_server = MockServer::start().await;
        Mock::given(method("POST"))
            .and(path("/ai-studio"))
            .respond_with(ResponseTemplate::new(503).set_body_string("Service Unavailable"))
            .expect(1)
            .mount(&mock_server)
            .await;

        Mock::given(method("POST"))
            .and(path("/api/chat"))
            .respond_with(ResponseTemplate::new(503).set_body_string("Service Unavailable"))
            .expect(1)
            .mount(&mock_server)
            .await;

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
        let ollama_url = ollama_chat_url(&mock_server.uri());

        let result = generate_response(
            &client,
            &vertex_url,
            Some("fake-token"),
            &ai_studio_url,
            Some("fake-api-key"),
            &ollama_url,
            Some("llama3.2"),
            "system prompt",
            "user question",
            &sample_request(),
        )
        .await;

        assert_eq!(result.unwrap(), "resposta vertex");
    }

    #[tokio::test]
    async fn test_generate_response_uses_vertex_directly_when_no_ai_studio_key_and_no_ollama_model()
    {
        let mock_server = MockServer::start().await;
        Mock::given(method("POST"))
            .and(path("/vertex"))
            .and(header("Authorization", "Bearer fake-token"))
            .respond_with(
                ResponseTemplate::new(200)
                    .set_body_json(success_body("sem AI Studio, direto Vertex")),
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
            None,
            "http://unused.invalid/ollama",
            None,
            "system prompt",
            "user question",
            &sample_request(),
        )
        .await;

        assert_eq!(result.unwrap(), "sem AI Studio, direto Vertex");
    }

    #[tokio::test]
    async fn test_generate_response_errors_when_ai_studio_fails_and_no_ollama_or_vertex() {
        let mock_server = MockServer::start().await;
        Mock::given(method("POST"))
            .and(path("/ai-studio"))
            .respond_with(ResponseTemplate::new(500).set_body_string("Internal Server Error"))
            .expect(1)
            .mount(&mock_server)
            .await;

        let client = reqwest::Client::new();
        let ai_studio_url = format!("{}/ai-studio", mock_server.uri());

        let result = generate_response(
            &client,
            "http://unused.invalid/vertex",
            None,
            &ai_studio_url,
            Some("fake-api-key"),
            "http://unused.invalid/ollama",
            None,
            "system prompt",
            "user question",
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
            "http://unused.invalid/ollama",
            None,
            "system prompt",
            "user question",
            &sample_request(),
        )
        .await;

        assert!(matches!(result, Err(WorkerError::Config(_))));
    }

    #[test]
    fn test_ollama_chat_url_format() {
        assert_eq!(
            ollama_chat_url("http://ollama:11434"),
            "http://ollama:11434/api/chat"
        );
    }

    #[tokio::test]
    async fn test_generate_response_falls_back_to_ollama_when_ai_studio_fails() {
        let mock_server = MockServer::start().await;
        Mock::given(method("POST"))
            .and(path("/ai-studio"))
            .respond_with(ResponseTemplate::new(503).set_body_string("Service Unavailable"))
            .expect(1)
            .mount(&mock_server)
            .await;

        Mock::given(method("POST"))
            .and(path("/api/chat"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
                "message": { "role": "assistant", "content": "resposta ollama" }
            })))
            .expect(1)
            .mount(&mock_server)
            .await;

        let client = reqwest::Client::new();
        let ai_studio_url = format!("{}/ai-studio", mock_server.uri());
        let ollama_url = ollama_chat_url(&mock_server.uri());

        let result = generate_response(
            &client,
            "http://unused.invalid/vertex",
            Some("fake-token"),
            &ai_studio_url,
            Some("fake-api-key"),
            &ollama_url,
            Some("llama3.2"),
            "system prompt",
            "user question",
            &sample_request(),
        )
        .await;

        assert_eq!(result.unwrap(), "resposta ollama");
    }

    #[tokio::test]
    async fn test_generate_response_uses_ollama_directly_when_no_ai_studio_key_configured() {
        let mock_server = MockServer::start().await;
        Mock::given(method("POST"))
            .and(path("/api/chat"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
                "message": { "role": "assistant", "content": "resposta ollama direto" }
            })))
            .expect(1)
            .mount(&mock_server)
            .await;

        let client = reqwest::Client::new();
        let ollama_url = ollama_chat_url(&mock_server.uri());

        let result = generate_response(
            &client,
            "http://unused.invalid/vertex",
            None,
            "http://unused.invalid/ai-studio",
            None,
            &ollama_url,
            Some("llama3.2"),
            "system prompt",
            "user question",
            &sample_request(),
        )
        .await;

        assert_eq!(result.unwrap(), "resposta ollama direto");
    }

    #[tokio::test]
    async fn test_generate_response_falls_back_to_vertex_when_ollama_fails_and_completes_chain() {
        let mock_server = MockServer::start().await;
        Mock::given(method("POST"))
            .and(path("/api/chat"))
            .respond_with(ResponseTemplate::new(500).set_body_string("Internal Server Error"))
            .expect(1)
            .mount(&mock_server)
            .await;

        Mock::given(method("POST"))
            .and(path("/vertex"))
            .and(header("Authorization", "Bearer fake-token"))
            .respond_with(ResponseTemplate::new(200).set_body_json(success_body("resposta vertex")))
            .expect(1)
            .mount(&mock_server)
            .await;

        let client = reqwest::Client::new();
        let vertex_url = format!("{}/vertex", mock_server.uri());
        let ollama_url = ollama_chat_url(&mock_server.uri());

        let result = generate_response(
            &client,
            &vertex_url,
            Some("fake-token"),
            "http://unused.invalid/ai-studio",
            None,
            &ollama_url,
            Some("llama3.2"),
            "system prompt",
            "user question",
            &sample_request(),
        )
        .await;

        assert_eq!(result.unwrap(), "resposta vertex");
    }

    #[tokio::test]
    async fn test_generate_response_errors_when_all_providers_fail_including_ollama() {
        let mock_server = MockServer::start().await;
        Mock::given(method("POST"))
            .and(path("/api/chat"))
            .respond_with(ResponseTemplate::new(500).set_body_string("Internal Server Error"))
            .expect(1)
            .mount(&mock_server)
            .await;

        let client = reqwest::Client::new();
        let ollama_url = ollama_chat_url(&mock_server.uri());

        let result = generate_response(
            &client,
            "http://unused.invalid/vertex",
            None,
            "http://unused.invalid/ai-studio",
            None,
            &ollama_url,
            Some("llama3.2"),
            "system prompt",
            "user question",
            &sample_request(),
        )
        .await;

        assert!(result.is_err());
    }
}
