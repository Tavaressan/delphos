//! Cliente HTTP para geração da resposta final do RAG.
//!
//! Suporta uma cadeia de fallback ordenada com quatro providers:
//! - Google AI Studio (`generativelanguage.googleapis.com`), autenticado via API key. Provider
//!   primário: sem cota de free tier expirada, ao contrário do Vertex AI.
//! - Ollama (`OLLAMA_BASE_URL`, default `http://ollama:11434`), provider local sem
//!   autenticação, usado como segundo elo — continuidade de serviço degradado quando o AI
//!   Studio está indisponível. Formato de request/response próprio (`/api/chat`), incompatível
//!   com o formato Gemini, daí o adaptador dedicado abaixo.
//! - OpenRouter (`openrouter.ai`), API OpenAI-compatible autenticada via API key, usada como
//!   terceiro elo gratuito quando AI Studio e Ollama falharem ou não estiverem configurados.
//! - Vertex AI (`{location}-aiplatform.googleapis.com`), autenticado via ADC (OAuth token).
//!   Último elo: o free tier do projeto GCP está expirado, então toda chamada paga uma
//!   tentativa fadada ao fracasso antes de poder cair para o próximo provider — por isso fica
//!   por último em vez de primeiro.
//!
//! `generate_response` tenta o Google AI Studio primeiro (quando há API key), cai para o Ollama
//! quando a chamada falha ou quando não há API key disponível, cai para o OpenRouter quando
//! Ollama falhar ou não estiver configurado e, por fim, recorre ao Vertex AI se nenhum dos
//! providers anteriores estiver disponível ou todos falharem.
//!
//! Nenhum provider faz retry interno: um erro com código claro (429, 5xx, erro de
//! conexão/DNS) é propagado imediatamente para o próximo elo (fail-fast). O cliente HTTP usado
//! por esta cadeia (ver `rabbitmq.rs`) é configurado com `connect_timeout` curto para que erros
//! de conexão também falhem rápido; a única espera aplicável é a de uma chamada que nunca
//! retorna erro nem resposta (caso ambíguo), limitada pelo timeout default do cliente.

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

/// Chama a API de chat completions do OpenRouter, autenticada via API key (formato
/// OpenAI-compatible). Elo de fallback gratuito adicional, usado quando AI Studio e Ollama
/// estiverem indisponíveis ou não configurados.
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

/// Orquestra a geração da resposta em uma cadeia de fallback ordenada: Google AI Studio (quando
/// há API key disponível) → Ollama (quando a chamada anterior falhar ou quando não há API key,
/// apenas se `ollama_model` estiver configurado) → OpenRouter (quando os dois elos anteriores
/// falharem ou não estiverem configurados, apenas se `openrouter_api_key` estiver configurada)
/// → Vertex AI (último elo, quando há token OAuth disponível). Vertex fica por último porque o
/// free tier do projeto GCP está expirado: toda chamada paga uma tentativa fadada ao fracasso
/// antes de poder degradar para o próximo provider, então não faz sentido tentá-lo primeiro.
/// Nenhum elo faz retry interno: erros com código claro (429/5xx/conexão) propagam
/// imediatamente para o próximo elo. Retorna erro apenas se todos os providers configurados
/// falharem ou nenhum estiver disponível.
#[allow(clippy::too_many_arguments)]
pub async fn generate_response(
    client: &reqwest::Client,
    vertex_url: &str,
    vertex_token: Option<&str>,
    ai_studio_url: &str,
    ai_studio_api_key: Option<&str>,
    ollama_url: &str,
    ollama_model: Option<&str>,
    openrouter_url: &str,
    openrouter_api_key: Option<&str>,
    openrouter_model: &str,
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

    if let Some(api_key) = openrouter_api_key {
        println!("Falling back to OpenRouter (model: {}).", openrouter_model);
        match call_openrouter(client, openrouter_url, api_key, openrouter_model, request).await {
            Ok(text) => return Ok(text),
            Err(e) => {
                println!(
                    "WARNING: OpenRouter call failed ({}). Trying next provider.",
                    e
                );
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
             OLLAMA_CHAT_MODEL não configurado, OPENROUTER_API_KEY não configurada e \
             GCP Authenticator (Vertex AI) não inicializado."
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

    #[test]
    fn test_ollama_chat_url_format() {
        assert_eq!(
            ollama_chat_url("http://ollama:11434"),
            "http://ollama:11434/api/chat"
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
        let ai_studio_url = format!("{}/ai-studio", mock_server.uri());

        let result = generate_response(
            &client,
            "http://unused.invalid/vertex",
            Some("fake-token"),
            &ai_studio_url,
            Some("fake-api-key"),
            "http://unused.invalid/ollama",
            None,
            "http://unused.invalid/openrouter",
            None,
            "test/model:free",
            "system prompt",
            "user question",
            &sample_request(),
        )
        .await;

        assert_eq!(result.unwrap(), "resposta ai studio");
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
            "http://unused.invalid/openrouter",
            None,
            "test/model:free",
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
            "http://unused.invalid/openrouter",
            None,
            "test/model:free",
            "system prompt",
            "user question",
            &sample_request(),
        )
        .await;

        assert_eq!(result.unwrap(), "resposta ollama direto");
    }

    #[tokio::test]
    async fn test_generate_response_falls_back_to_openrouter_when_ai_studio_and_ollama_fail() {
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
        let ai_studio_url = format!("{}/ai-studio", mock_server.uri());
        let ollama_url = ollama_chat_url(&mock_server.uri());
        let openrouter_url = format!("{}/openrouter", mock_server.uri());

        let result = generate_response(
            &client,
            "http://unused.invalid/vertex",
            None,
            &ai_studio_url,
            Some("fake-api-key"),
            &ollama_url,
            Some("llama3.2"),
            &openrouter_url,
            Some("fake-openrouter-key"),
            "test/model:free",
            "system prompt",
            "user question",
            &sample_request(),
        )
        .await;

        assert_eq!(result.unwrap(), "resposta openrouter");
    }

    #[tokio::test]
    async fn test_generate_response_uses_openrouter_directly_when_no_ai_studio_or_ollama() {
        let mock_server = MockServer::start().await;
        Mock::given(method("POST"))
            .and(path("/openrouter"))
            .and(header("Authorization", "Bearer fake-openrouter-key"))
            .respond_with(
                ResponseTemplate::new(200).set_body_json(openrouter_success_body(
                    "sem AI Studio/Ollama, direto OpenRouter",
                )),
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
            "http://unused.invalid/ollama",
            None,
            &openrouter_url,
            Some("fake-openrouter-key"),
            "test/model:free",
            "system prompt",
            "user question",
            &sample_request(),
        )
        .await;

        assert_eq!(result.unwrap(), "sem AI Studio/Ollama, direto OpenRouter");
    }

    #[tokio::test]
    async fn test_generate_response_falls_back_to_vertex_when_all_free_providers_fail() {
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
            .and(path("/openrouter"))
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
        let openrouter_url = format!("{}/openrouter", mock_server.uri());

        let result = generate_response(
            &client,
            &vertex_url,
            Some("fake-token"),
            &ai_studio_url,
            Some("fake-api-key"),
            &ollama_url,
            Some("llama3.2"),
            &openrouter_url,
            Some("fake-openrouter-key"),
            "test/model:free",
            "system prompt",
            "user question",
            &sample_request(),
        )
        .await;

        assert_eq!(result.unwrap(), "resposta vertex");
    }

    #[tokio::test]
    async fn test_generate_response_uses_vertex_directly_when_no_other_provider_configured() {
        let mock_server = MockServer::start().await;
        Mock::given(method("POST"))
            .and(path("/vertex"))
            .and(header("Authorization", "Bearer fake-token"))
            .respond_with(
                ResponseTemplate::new(200)
                    .set_body_json(success_body("sem outros providers, direto Vertex")),
            )
            .expect(1)
            .mount(&mock_server)
            .await;

        let client = reqwest::Client::new();
        let vertex_url = format!("{}/vertex", mock_server.uri());

        let result = generate_response(
            &client,
            &vertex_url,
            Some("fake-token"),
            "http://unused.invalid/ai-studio",
            None,
            "http://unused.invalid/ollama",
            None,
            "http://unused.invalid/openrouter",
            None,
            "test/model:free",
            "system prompt",
            "user question",
            &sample_request(),
        )
        .await;

        assert_eq!(result.unwrap(), "sem outros providers, direto Vertex");
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
            "http://unused.invalid/openrouter",
            None,
            "test/model:free",
            "system prompt",
            "user question",
            &sample_request(),
        )
        .await;

        assert!(matches!(result, Err(WorkerError::Config(_))));
    }

    #[tokio::test]
    async fn test_generate_response_errors_when_all_configured_providers_fail() {
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
            "http://unused.invalid/openrouter",
            None,
            "test/model:free",
            "system prompt",
            "user question",
            &sample_request(),
        )
        .await;

        assert!(result.is_err());
    }

    /// 429 (rate limit) deve pular imediatamente para o próximo elo, sem retry no mesmo
    /// provider. O `expect(1)` no mock do AI Studio garante que nenhuma segunda tentativa é
    /// feita.
    #[tokio::test]
    async fn test_generate_response_skips_to_next_provider_on_429_without_retry() {
        let mock_server = MockServer::start().await;
        Mock::given(method("POST"))
            .and(path("/ai-studio"))
            .respond_with(ResponseTemplate::new(429).set_body_string("Too Many Requests"))
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

        let start = std::time::Instant::now();
        let result = generate_response(
            &client,
            "http://unused.invalid/vertex",
            None,
            &ai_studio_url,
            Some("fake-api-key"),
            &ollama_url,
            Some("llama3.2"),
            "http://unused.invalid/openrouter",
            None,
            "test/model:free",
            "system prompt",
            "user question",
            &sample_request(),
        )
        .await;
        let elapsed = start.elapsed();

        assert_eq!(result.unwrap(), "resposta ollama");
        // Sem retry/backoff no mesmo provider: a chamada inteira deve ser rápida.
        assert!(
            elapsed < std::time::Duration::from_secs(2),
            "esperava fallback imediato, levou {:?}",
            elapsed
        );
    }

    /// 5xx no AI Studio e no Ollama devem pular imediatamente para o OpenRouter, sem retry.
    #[tokio::test]
    async fn test_generate_response_skips_to_openrouter_on_5xx_without_retry() {
        let mock_server = MockServer::start().await;
        Mock::given(method("POST"))
            .and(path("/ai-studio"))
            .respond_with(ResponseTemplate::new(500).set_body_string("Internal Server Error"))
            .expect(1)
            .mount(&mock_server)
            .await;

        Mock::given(method("POST"))
            .and(path("/api/chat"))
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
        let ai_studio_url = format!("{}/ai-studio", mock_server.uri());
        let ollama_url = ollama_chat_url(&mock_server.uri());
        let openrouter_url = format!("{}/openrouter", mock_server.uri());

        let start = std::time::Instant::now();
        let result = generate_response(
            &client,
            "http://unused.invalid/vertex",
            None,
            &ai_studio_url,
            Some("fake-api-key"),
            &ollama_url,
            Some("llama3.2"),
            &openrouter_url,
            Some("fake-openrouter-key"),
            "test/model:free",
            "system prompt",
            "user question",
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
            .and(path("/api/chat"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!({
                "message": { "role": "assistant", "content": "resposta ollama" }
            })))
            .expect(1)
            .mount(&mock_server)
            .await;

        let client = reqwest::Client::new();
        // Porta baixa sem listener: connection refused imediato (não é timeout de DNS/rede).
        let ai_studio_url = "http://127.0.0.1:1/ai-studio".to_string();
        let ollama_url = ollama_chat_url(&mock_server.uri());

        let start = std::time::Instant::now();
        let result = generate_response(
            &client,
            "http://unused.invalid/vertex",
            None,
            &ai_studio_url,
            Some("fake-api-key"),
            &ollama_url,
            Some("llama3.2"),
            "http://unused.invalid/openrouter",
            None,
            "test/model:free",
            "system prompt",
            "user question",
            &sample_request(),
        )
        .await;
        let elapsed = start.elapsed();

        assert_eq!(result.unwrap(), "resposta ollama");
        assert!(
            elapsed < std::time::Duration::from_secs(3),
            "esperava fallback rápido em erro de conexão, levou {:?}",
            elapsed
        );
    }
}
