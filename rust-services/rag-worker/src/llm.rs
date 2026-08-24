//! Cliente HTTP para geração da resposta final do RAG.
//!
//! Suporta três providers, encadeados por `generate_response`:
//! - Vertex AI (`{location}-aiplatform.googleapis.com`), autenticado via ADC (OAuth token).
//! - Google AI Studio (`generativelanguage.googleapis.com`), autenticado via API key.
//! - OpenRouter (`openrouter.ai`), API OpenAI-compatible autenticada via API key, usada como
//!   último elo gratuito quando ambos os providers Google falham ou não estão configurados.
//!
//! `generate_response` tenta Vertex AI primeiro (quando há token), cai para o Google AI Studio
//! quando a chamada falha ou quando não há token disponível (ADC não configurado) e, por fim,
//! cai para o OpenRouter quando os dois providers Google falharem ou não estiverem configurados.

use crate::error::WorkerError;
use serde::{Deserialize, Serialize};

/// Base URL padrão da API do Google AI Studio.
pub const AI_STUDIO_DEFAULT_BASE_URL: &str = "https://generativelanguage.googleapis.com";

/// Base URL padrão da API do OpenRouter.
pub const OPENROUTER_DEFAULT_BASE_URL: &str = "https://openrouter.ai/api";

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

/// Monta a URL de chat completions do OpenRouter a partir de uma base URL (injetável em testes).
pub fn openrouter_url(base_url: &str) -> String {
    format!("{base_url}/v1/chat/completions")
}

#[derive(Serialize, Debug)]
struct OpenRouterMessage {
    role: String,
    content: String,
}

#[derive(Serialize, Debug)]
struct OpenRouterRequest {
    model: String,
    messages: Vec<OpenRouterMessage>,
    temperature: Option<f32>,
    max_tokens: Option<usize>,
}

#[derive(Deserialize, Debug)]
struct OpenRouterResponseMessage {
    content: Option<String>,
}

#[derive(Deserialize, Debug)]
struct OpenRouterChoice {
    message: OpenRouterResponseMessage,
}

#[derive(Deserialize, Debug)]
struct OpenRouterResponse {
    choices: Option<Vec<OpenRouterChoice>>,
}

/// Converte o `GeminiRequest` já montado (comum a Vertex AI e AI Studio) para o formato
/// OpenAI-compatible de chat completions usado pelo OpenRouter, evitando duplicar a construção
/// do prompt em `rabbitmq.rs`.
fn build_openrouter_request(model: &str, request: &GeminiRequest) -> OpenRouterRequest {
    let mut messages = Vec::new();

    if let Some(system_instruction) = &request.system_instruction {
        let system_text = system_instruction
            .parts
            .iter()
            .map(|p| p.text.as_str())
            .collect::<Vec<_>>()
            .join("\n");
        messages.push(OpenRouterMessage {
            role: "system".to_string(),
            content: system_text,
        });
    }

    let user_text = request
        .contents
        .iter()
        .flat_map(|c| c.parts.iter().map(|p| p.text.as_str()))
        .collect::<Vec<_>>()
        .join("\n");
    messages.push(OpenRouterMessage {
        role: "user".to_string(),
        content: user_text,
    });

    OpenRouterRequest {
        model: model.to_string(),
        messages,
        temperature: request
            .generation_config
            .as_ref()
            .and_then(|c| c.temperature),
        max_tokens: request
            .generation_config
            .as_ref()
            .and_then(|c| c.max_output_tokens),
    }
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

/// Chama a API de chat completions do OpenRouter, autenticada via API key (formato
/// OpenAI-compatible). Elo de fallback gratuito adicional, usado quando Vertex AI e Google AI
/// Studio estiverem indisponíveis ou não configurados.
pub async fn call_openrouter(
    client: &reqwest::Client,
    url: &str,
    api_key: &str,
    model: &str,
    request: &GeminiRequest,
) -> Result<String, WorkerError> {
    let body = build_openrouter_request(model, request);

    let res = client
        .post(url)
        .header("Content-Type", "application/json")
        .header("Authorization", format!("Bearer {}", api_key))
        .json(&body)
        .send()
        .await
        .map_err(|e| WorkerError::VertexAI(format!("HTTP error calling OpenRouter: {}", e)))?;

    let status = res.status();
    if !status.is_success() {
        let err_body = res.text().await.unwrap_or_default();
        return Err(WorkerError::VertexAI(format!(
            "OpenRouter API returned error status {}: {}",
            status, err_body
        )));
    }

    let parsed: OpenRouterResponse = res.json().await.map_err(|e| {
        WorkerError::Serialization(format!("Failed to parse OpenRouter response body: {}", e))
    })?;

    parsed
        .choices
        .and_then(|c| c.into_iter().next())
        .and_then(|choice| choice.message.content)
        .ok_or_else(|| {
            WorkerError::VertexAI("Empty text response received from OpenRouter".to_string())
        })
}

/// Orquestra a geração da resposta, encadeando três providers na ordem: Vertex AI (quando há
/// token OAuth disponível) -> Google AI Studio (API key) -> OpenRouter (API key, elo gratuito
/// adicional). Cada elo só é tentado se o anterior falhar ou não estiver configurado. Retorna
/// erro apenas se nenhum provider estiver disponível ou todos falharem.
#[allow(clippy::too_many_arguments)]
pub async fn generate_response(
    client: &reqwest::Client,
    vertex_url: &str,
    vertex_token: Option<&str>,
    ai_studio_url: &str,
    ai_studio_api_key: Option<&str>,
    openrouter_url: &str,
    openrouter_api_key: Option<&str>,
    openrouter_model: &str,
    request: &GeminiRequest,
) -> Result<String, WorkerError> {
    let mut last_err: Option<WorkerError> = None;

    if let Some(token) = vertex_token {
        match call_vertex_ai(client, vertex_url, token, request).await {
            Ok(text) => return Ok(text),
            Err(e) => {
                println!("WARNING: Vertex AI call failed ({}).", e);
                last_err = Some(e);
            }
        }
    }

    if let Some(api_key) = ai_studio_api_key {
        if last_err.is_some() {
            println!("Falling back to Google AI Studio.");
        } else {
            println!(
                "Vertex AI token indisponível (ADC não configurado). Usando Google AI Studio."
            );
        }
        match call_ai_studio(client, ai_studio_url, api_key, request).await {
            Ok(text) => return Ok(text),
            Err(e) => {
                println!("WARNING: Google AI Studio call failed ({}).", e);
                last_err = Some(e);
            }
        }
    }

    if let Some(api_key) = openrouter_api_key {
        println!("Falling back to OpenRouter (model: {}).", openrouter_model);
        match call_openrouter(client, openrouter_url, api_key, openrouter_model, request).await {
            Ok(text) => return Ok(text),
            Err(e) => {
                println!("WARNING: OpenRouter call failed ({}).", e);
                last_err = Some(e);
            }
        }
    }

    match last_err {
        Some(e) => Err(e),
        None => Err(WorkerError::Config(
            "Nenhum provider de LLM disponível: GCP Authenticator (Vertex AI) não inicializado, \
             GOOGLE_AI_STUDIO_API_KEY não configurada e OPENROUTER_API_KEY não configurada."
                .to_string(),
        )),
    }
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

    fn openrouter_success_body(text: &str) -> serde_json::Value {
        serde_json::json!({
            "choices": [{
                "message": { "content": text }
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

    #[test]
    fn test_openrouter_url_format() {
        let url = openrouter_url(OPENROUTER_DEFAULT_BASE_URL);
        assert_eq!(url, "https://openrouter.ai/api/v1/chat/completions");
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
            "http://unused.invalid/openrouter",
            Some("fake-openrouter-key"),
            "test/model:free",
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
            "http://unused.invalid/openrouter",
            Some("fake-openrouter-key"),
            "test/model:free",
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
            "http://unused.invalid/openrouter",
            Some("fake-openrouter-key"),
            "test/model:free",
            &sample_request(),
        )
        .await;

        assert_eq!(result.unwrap(), "sem ADC, direto AI Studio");
    }

    #[tokio::test]
    async fn test_generate_response_falls_back_to_openrouter_when_vertex_and_ai_studio_fail() {
        let mock_server = MockServer::start().await;
        Mock::given(method("POST"))
            .and(path("/vertex"))
            .respond_with(ResponseTemplate::new(503).set_body_string("Service Unavailable"))
            .expect(1)
            .mount(&mock_server)
            .await;

        Mock::given(method("POST"))
            .and(path("/ai-studio"))
            .respond_with(ResponseTemplate::new(503).set_body_string("Service Unavailable"))
            .expect(1)
            .mount(&mock_server)
            .await;

        Mock::given(method("POST"))
            .and(path("/openrouter"))
            .and(header("Authorization", "Bearer fake-openrouter-key"))
            .respond_with(
                ResponseTemplate::new(200)
                    .set_body_json(openrouter_success_body("resposta openrouter")),
            )
            .expect(1)
            .mount(&mock_server)
            .await;

        let client = reqwest::Client::new();
        let vertex_url = format!("{}/vertex", mock_server.uri());
        let ai_studio_url = format!("{}/ai-studio", mock_server.uri());
        let openrouter_url = format!("{}/openrouter", mock_server.uri());

        let result = generate_response(
            &client,
            &vertex_url,
            Some("fake-token"),
            &ai_studio_url,
            Some("fake-api-key"),
            &openrouter_url,
            Some("fake-openrouter-key"),
            "test/model:free",
            &sample_request(),
        )
        .await;

        assert_eq!(result.unwrap(), "resposta openrouter");
    }

    #[tokio::test]
    async fn test_generate_response_uses_openrouter_directly_when_no_google_providers() {
        let mock_server = MockServer::start().await;
        Mock::given(method("POST"))
            .and(path("/openrouter"))
            .and(header("Authorization", "Bearer fake-openrouter-key"))
            .respond_with(
                ResponseTemplate::new(200)
                    .set_body_json(openrouter_success_body("sem Google, direto OpenRouter")),
            )
            .expect(1)
            .mount(&mock_server)
            .await;

        let client = reqwest::Client::new();
        let openrouter_url = format!("{}/openrouter", mock_server.uri());

        let result = generate_response(
            &client,
            "http://unused.invalid/vertex",
            None,
            "http://unused.invalid/ai-studio",
            None,
            &openrouter_url,
            Some("fake-openrouter-key"),
            "test/model:free",
            &sample_request(),
        )
        .await;

        assert_eq!(result.unwrap(), "sem Google, direto OpenRouter");
    }

    #[tokio::test]
    async fn test_generate_response_errors_when_vertex_fails_and_no_other_providers() {
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
            "http://unused.invalid/openrouter",
            None,
            "test/model:free",
            &sample_request(),
        )
        .await;

        assert!(result.is_err());
    }

    /// 429 (rate limit) deve pular imediatamente para o próximo elo, sem retry no mesmo
    /// provider. O `expect(1)` no mock do Vertex garante que nenhuma segunda tentativa é feita.
    #[tokio::test]
    async fn test_generate_response_skips_to_next_provider_on_429_without_retry() {
        let mock_server = MockServer::start().await;
        Mock::given(method("POST"))
            .and(path("/vertex"))
            .respond_with(ResponseTemplate::new(429).set_body_string("Too Many Requests"))
            .expect(1)
            .mount(&mock_server)
            .await;

        Mock::given(method("POST"))
            .and(path("/ai-studio"))
            .respond_with(
                ResponseTemplate::new(200).set_body_json(success_body("resposta ai studio")),
            )
            .expect(1)
            .mount(&mock_server)
            .await;

        let client = reqwest::Client::new();
        let vertex_url = format!("{}/vertex", mock_server.uri());
        let ai_studio_url = format!("{}/ai-studio", mock_server.uri());

        let start = std::time::Instant::now();
        let result = generate_response(
            &client,
            &vertex_url,
            Some("fake-token"),
            &ai_studio_url,
            Some("fake-api-key"),
            "http://unused.invalid/openrouter",
            None,
            "test/model:free",
            &sample_request(),
        )
        .await;
        let elapsed = start.elapsed();

        assert_eq!(result.unwrap(), "resposta ai studio");
        // Sem retry/backoff no mesmo provider: a chamada inteira deve ser rápida.
        assert!(
            elapsed < std::time::Duration::from_secs(2),
            "esperava fallback imediato, levou {:?}",
            elapsed
        );
    }

    /// 5xx no Vertex e no AI Studio devem pular imediatamente para o OpenRouter, sem retry.
    #[tokio::test]
    async fn test_generate_response_skips_to_openrouter_on_5xx_without_retry() {
        let mock_server = MockServer::start().await;
        Mock::given(method("POST"))
            .and(path("/vertex"))
            .respond_with(ResponseTemplate::new(500).set_body_string("Internal Server Error"))
            .expect(1)
            .mount(&mock_server)
            .await;

        Mock::given(method("POST"))
            .and(path("/ai-studio"))
            .respond_with(ResponseTemplate::new(502).set_body_string("Bad Gateway"))
            .expect(1)
            .mount(&mock_server)
            .await;

        Mock::given(method("POST"))
            .and(path("/openrouter"))
            .respond_with(
                ResponseTemplate::new(200)
                    .set_body_json(openrouter_success_body("resposta openrouter")),
            )
            .expect(1)
            .mount(&mock_server)
            .await;

        let client = reqwest::Client::new();
        let vertex_url = format!("{}/vertex", mock_server.uri());
        let ai_studio_url = format!("{}/ai-studio", mock_server.uri());
        let openrouter_url = format!("{}/openrouter", mock_server.uri());

        let start = std::time::Instant::now();
        let result = generate_response(
            &client,
            &vertex_url,
            Some("fake-token"),
            &ai_studio_url,
            Some("fake-api-key"),
            &openrouter_url,
            Some("fake-openrouter-key"),
            "test/model:free",
            &sample_request(),
        )
        .await;
        let elapsed = start.elapsed();

        assert_eq!(result.unwrap(), "resposta openrouter");
        assert!(
            elapsed < std::time::Duration::from_secs(2),
            "esperava fallback imediato, levou {:?}",
            elapsed
        );
    }

    /// Erro de conexão (porta fechada / connection refused) deve falhar rápido e pular para o
    /// próximo elo, sem esperar um timeout longo — connection refused é reportado pelo SO
    /// imediatamente, sem necessidade de configurar connect_timeout no client de teste.
    #[tokio::test]
    async fn test_generate_response_falls_back_on_connection_error_without_hanging() {
        let mock_server = MockServer::start().await;
        Mock::given(method("POST"))
            .and(path("/ai-studio"))
            .respond_with(
                ResponseTemplate::new(200).set_body_json(success_body("resposta ai studio")),
            )
            .expect(1)
            .mount(&mock_server)
            .await;

        let client = reqwest::Client::new();
        // Porta baixa sem listener: connection refused imediato (não é timeout de DNS/rede).
        let vertex_url = "http://127.0.0.1:1/vertex".to_string();
        let ai_studio_url = format!("{}/ai-studio", mock_server.uri());

        let start = std::time::Instant::now();
        let result = generate_response(
            &client,
            &vertex_url,
            Some("fake-token"),
            &ai_studio_url,
            Some("fake-api-key"),
            "http://unused.invalid/openrouter",
            None,
            "test/model:free",
            &sample_request(),
        )
        .await;
        let elapsed = start.elapsed();

        assert_eq!(result.unwrap(), "resposta ai studio");
        assert!(
            elapsed < std::time::Duration::from_secs(3),
            "esperava fallback rápido em erro de conexão, levou {:?}",
            elapsed
        );
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
            "http://unused.invalid/openrouter",
            None,
            "test/model:free",
            &sample_request(),
        )
        .await;

        assert!(matches!(result, Err(WorkerError::Config(_))));
    }
}
