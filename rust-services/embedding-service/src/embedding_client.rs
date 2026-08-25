//! Cliente HTTP para geração de embeddings via Vertex AI, Google AI Studio ou VoyageAI
//! (cadeia de fallback).
//!
//! Vertex AI (`{location}-aiplatform.googleapis.com`) é autenticado via ADC (OAuth token) e
//! chamado primeiro quando há token disponível. Ao falhar (ou quando não há token/ADC
//! configurado), cai para o Google AI Studio (`generativelanguage.googleapis.com`), autenticado
//! via API key, usando o endpoint `batchEmbedContents`. Se o Google AI Studio também falhar (ou
//! não estiver configurado), cai para a VoyageAI (`api.voyageai.com`), autenticada via API key.
//!
//! A transição entre elos é fail-fast: AI Studio e VoyageAI fazem uma única tentativa (sem
//! retry) e retornam erro imediatamente em qualquer status não-2xx (429, 5xx, etc.) ou erro de
//! conexão, deixando o próximo elo ser tentado sem esperar um timeout completo. O client HTTP
//! (`build_http_client`) usa timeouts curtos de conexão/resposta para que uma conexão pendurada
//! (sem erro nem resposta) também não trave a cadeia inteira. Vertex AI é a exceção: mantém seu
//! próprio retry com backoff (`call_vertex_with_retry`, `max_retries` configurável) para erros
//! transitórios antes de passar a vez ao próximo elo.

use serde::{Deserialize, Serialize};
use std::time::Duration;

/// Base URL padrão da API do Google AI Studio.
pub const AI_STUDIO_DEFAULT_BASE_URL: &str = "https://generativelanguage.googleapis.com";

/// Base URL padrão da API da VoyageAI.
pub const VOYAGE_DEFAULT_BASE_URL: &str = "https://api.voyageai.com";

const BASE_BACKOFF_MS: u64 = 200;

/// Timeout de conexão TCP para chamadas a providers de embeddings. Curto o suficiente para não
/// travar a cadeia de fallback quando um provider não responde (ex.: firewall descartando
/// pacotes silenciosamente) — erros explícitos (429/5xx/connection refused) já retornam antes
/// disso, sem precisar esperar timeout algum.
const CONNECT_TIMEOUT_SECS: u64 = 5;

/// Timeout total (conexão + resposta) para chamadas a providers de embeddings.
const REQUEST_TIMEOUT_SECS: u64 = 20;

/// Monta o `reqwest::Client` usado pela cadeia de fallback de embeddings, com timeouts curtos e
/// explícitos. Sem esse limite, uma conexão pendurada (sem erro nem resposta) travaria a cadeia
/// de fallback inteira em vez de pular rapidamente para o próximo provider.
pub fn build_http_client() -> reqwest::Client {
    reqwest::Client::builder()
        .connect_timeout(Duration::from_secs(CONNECT_TIMEOUT_SECS))
        .timeout(Duration::from_secs(REQUEST_TIMEOUT_SECS))
        .build()
        .expect("failed to build reqwest client for embedding providers")
}

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

/// Limite documentado da API batchEmbedContents do Google AI Studio: no máximo 100
/// requests por chamada (erro 400 INVALID_ARGUMENT acima disso). Documentos com mais
/// chunks que isso (ex.: PDFs longos) estouravam esse teto em uma única chamada — ver
/// issue #424.
const AI_STUDIO_MAX_BATCH_SIZE: usize = 100;

/// Chama a API batchEmbedContents do Google AI Studio, autenticada via API key.
///
/// Pagina `texts` internamente em lotes de até `AI_STUDIO_MAX_BATCH_SIZE`, já que a API
/// rejeita com 400 qualquer chamada com mais requests que isso em um único batch.
pub async fn call_ai_studio_embeddings(
    client: &reqwest::Client,
    url: &str,
    api_key: &str,
    texts: &[String],
    dimensions: usize,
    model_id: &str,
) -> Result<Vec<Vec<f32>>, String> {
    let mut all_embeddings = Vec::with_capacity(texts.len());

    for batch in texts.chunks(AI_STUDIO_MAX_BATCH_SIZE) {
        let body = AiStudioBatchRequest {
            requests: batch
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

        all_embeddings.extend(parsed.embeddings.into_iter().map(|e| e.values));
    }

    Ok(all_embeddings)
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

#[derive(Serialize, Debug)]
struct VoyageEmbedRequest<'a> {
    input: &'a [String],
    model: &'a str,
    #[serde(skip_serializing_if = "Option::is_none")]
    output_dimension: Option<usize>,
}

#[derive(Deserialize, Debug)]
struct VoyageEmbeddingData {
    embedding: Vec<f32>,
    index: usize,
}

#[derive(Deserialize, Debug)]
struct VoyageEmbeddingsResponse {
    data: Vec<VoyageEmbeddingData>,
}

/// Dimensões de output aceitas pelo parâmetro `output_dimension` da VoyageAI, suportado apenas
/// pelos modelos flexíveis (voyage-3-large, voyage-3.5, voyage-3.5-lite, voyage-code-3,
/// voyage-4*). Ver https://docs.voyageai.com/reference/embeddings-api. Note que 768 — a dimensão
/// atualmente usada pelo schema pgvector (`vector(${embedding.dimension})`, padrão 768) — **não**
/// está nessa lista: nenhum modelo VoyageAI produz nativamente 768 dimensões.
const VOYAGE_SUPPORTED_OUTPUT_DIMENSIONS: [usize; 4] = [256, 512, 1024, 2048];

/// Monta a URL do endpoint de embeddings da VoyageAI a partir de uma base URL (injetável em
/// testes).
pub fn voyage_ai_url(base_url: &str) -> String {
    format!("{base_url}/v1/embeddings")
}

/// Chama a API de embeddings da VoyageAI, autenticada via API key (`Authorization: Bearer`).
///
/// Valida explicitamente que a dimensionalidade retornada bate com `dimensions` (a dimensão
/// esperada pelo schema pgvector) — se não bater, retorna erro em vez de deixar o INSERT falhar
/// silenciosamente mais adiante (regressão análoga à issue #382, mas para um provider cuja
/// dimensão nativa pode não ser configurável para o valor pedido).
pub async fn call_voyage_ai_embeddings(
    client: &reqwest::Client,
    url: &str,
    api_key: &str,
    texts: &[String],
    dimensions: usize,
    model_id: &str,
) -> Result<Vec<Vec<f32>>, String> {
    let output_dimension = VOYAGE_SUPPORTED_OUTPUT_DIMENSIONS
        .contains(&dimensions)
        .then_some(dimensions);

    let body = VoyageEmbedRequest {
        input: texts,
        model: model_id,
        output_dimension,
    };

    let res = client
        .post(url)
        .header("Content-Type", "application/json")
        .header("Authorization", format!("Bearer {}", api_key))
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("HTTP error calling VoyageAI: {}", e))?;

    let status = res.status();
    if !status.is_success() {
        let err_body = res.text().await.unwrap_or_default();
        return Err(format!(
            "VoyageAI API returned error status {}: {}",
            status, err_body
        ));
    }

    let mut parsed: VoyageEmbeddingsResponse = res
        .json()
        .await
        .map_err(|e| format!("Failed to parse VoyageAI response body: {}", e))?;

    parsed.data.sort_by_key(|d| d.index);

    for entry in &parsed.data {
        if entry.embedding.len() != dimensions {
            return Err(format!(
                "VoyageAI returned embeddings with {} dimensions, but {} were expected by the \
                 pgvector schema. Model '{}' may not support output_dimension={} — see \
                 https://docs.voyageai.com/docs/embeddings for supported dimensions per model.",
                entry.embedding.len(),
                dimensions,
                model_id,
                dimensions
            ));
        }
    }

    Ok(parsed.data.into_iter().map(|d| d.embedding).collect())
}

/// Orquestra a geração de embeddings tentando, em ordem: Vertex AI (quando há token OAuth
/// disponível), Google AI Studio e VoyageAI. Cada elo só é tentado se o anterior falhar (ou
/// estiver indisponível) e se houver credencial configurada para ele. Retorna erro apenas se
/// nenhum provider estiver disponível ou se todos os configurados falharem.
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
    voyage_url: &str,
    voyage_api_key: Option<&str>,
    voyage_model: &str,
) -> Result<Vec<Vec<f32>>, String> {
    let mut last_error: Option<String> = None;

    if let Some(token) = vertex_token {
        match call_vertex_with_retry(client, vertex_url, token, vertex_request, max_retries).await {
            Ok(embeddings) => return Ok(embeddings),
            Err(e) => {
                println!(
                    "WARNING: Vertex AI call failed ({}). Trying next fallback.",
                    e
                );
                last_error = Some(e);
            }
        }
    }

    if let Some(api_key) = ai_studio_api_key {
        match call_ai_studio_embeddings(
            client,
            ai_studio_url,
            api_key,
            texts,
            dimensions,
            ai_studio_model,
        )
        .await
        {
            Ok(embeddings) => return Ok(embeddings),
            Err(e) => {
                println!(
                    "WARNING: Google AI Studio call failed ({}). Trying next fallback.",
                    e
                );
                last_error = Some(e);
            }
        }
    }

    if let Some(api_key) = voyage_api_key {
        match call_voyage_ai_embeddings(
            client,
            voyage_url,
            api_key,
            texts,
            dimensions,
            voyage_model,
        )
        .await
        {
            Ok(embeddings) => return Ok(embeddings),
            Err(e) => {
                println!("WARNING: VoyageAI call failed ({}).", e);
                last_error = Some(e);
            }
        }
    }

    Err(last_error.unwrap_or_else(|| {
        "Nenhum provider de embeddings disponível: GCP Authenticator (Vertex AI) não \
         inicializado, GOOGLE_AI_STUDIO_API_KEY não configurada, e VOYAGE_API_KEY não \
         configurada."
            .to_string()
    }))
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

    fn voyage_success_body(values: Vec<f32>) -> serde_json::Value {
        serde_json::json!({ "data": [{ "object": "embedding", "index": 0, "embedding": values }] })
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
            "http://unused.invalid/voyage",
            Some("fake-voyage-key"),
            "voyage-3.5-lite",
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
            "http://unused.invalid/voyage",
            Some("fake-voyage-key"),
            "voyage-3.5-lite",
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
            "http://unused.invalid/voyage",
            Some("fake-voyage-key"),
            "voyage-3.5-lite",
        )
        .await;

        assert_eq!(result.unwrap(), vec![vec![0.5]]);
    }

    #[tokio::test]
    async fn test_generate_embeddings_errors_when_vertex_fails_and_no_other_provider_configured() {
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
            "http://unused.invalid/voyage",
            None,
            "voyage-3.5-lite",
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
            "http://unused.invalid/voyage",
            None,
            "voyage-3.5-lite",
        )
        .await;

        assert!(result.is_err());
    }

    #[tokio::test]
    async fn test_generate_embeddings_falls_back_to_voyage_when_vertex_and_ai_studio_fail() {
        let mock_server = MockServer::start().await;
        Mock::given(method("POST"))
            .and(path("/vertex"))
            .respond_with(ResponseTemplate::new(503).set_body_string("Service Unavailable"))
            .expect(1)
            .mount(&mock_server)
            .await;

        Mock::given(method("POST"))
            .and(path("/ai-studio"))
            .respond_with(ResponseTemplate::new(500).set_body_string("Internal Server Error"))
            .expect(1)
            .mount(&mock_server)
            .await;

        Mock::given(method("POST"))
            .and(path("/voyage"))
            .and(header("Authorization", "Bearer fake-voyage-key"))
            .respond_with(
                ResponseTemplate::new(200).set_body_json(voyage_success_body(vec![0.6, 0.7])),
            )
            .expect(1)
            .mount(&mock_server)
            .await;

        let client = reqwest::Client::new();
        let vertex_url = format!("{}/vertex", mock_server.uri());
        let ai_studio_url = format!("{}/ai-studio", mock_server.uri());
        let voyage_url = format!("{}/voyage", mock_server.uri());
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
            &voyage_url,
            Some("fake-voyage-key"),
            "voyage-3.5-lite",
        )
        .await;

        assert_eq!(result.unwrap(), vec![vec![0.6, 0.7]]);
    }

    #[tokio::test]
    async fn test_generate_embeddings_uses_voyage_directly_when_no_other_provider_configured() {
        let mock_server = MockServer::start().await;
        Mock::given(method("POST"))
            .and(path("/voyage"))
            .and(header("Authorization", "Bearer fake-voyage-key"))
            .respond_with(ResponseTemplate::new(200).set_body_json(voyage_success_body(vec![0.9])))
            .expect(1)
            .mount(&mock_server)
            .await;

        let client = reqwest::Client::new();
        let vertex_url = format!("{}/vertex", mock_server.uri());
        let voyage_url = format!("{}/voyage", mock_server.uri());
        let texts = sample_texts();
        let request = build_vertex_request(&texts, 1);

        let result = generate_embeddings(
            &client,
            &vertex_url,
            None,
            &request,
            0,
            "http://unused.invalid/ai-studio",
            None,
            &texts,
            1,
            "gemini-embedding-001",
            &voyage_url,
            Some("fake-voyage-key"),
            "voyage-3.5-lite",
        )
        .await;

        assert_eq!(result.unwrap(), vec![vec![0.9]]);
    }

    /// Requisito de fail-fast: um 429 (rate limit) do AI Studio deve pular IMEDIATAMENTE para o
    /// próximo elo (VoyageAI) — sem retry no próprio AI Studio. `.expect(1)` no mock garante que
    /// nenhuma segunda tentativa foi feita.
    #[tokio::test]
    async fn test_generate_embeddings_skips_to_next_link_on_429_without_retrying_same_provider() {
        let mock_server = MockServer::start().await;
        Mock::given(method("POST"))
            .and(path("/ai-studio"))
            .respond_with(ResponseTemplate::new(429).set_body_string("Too Many Requests"))
            .expect(1)
            .mount(&mock_server)
            .await;

        Mock::given(method("POST"))
            .and(path("/voyage"))
            .respond_with(ResponseTemplate::new(200).set_body_json(voyage_success_body(vec![0.1])))
            .expect(1)
            .mount(&mock_server)
            .await;

        let client = reqwest::Client::new();
        let ai_studio_url = format!("{}/ai-studio", mock_server.uri());
        let voyage_url = format!("{}/voyage", mock_server.uri());
        let texts = sample_texts();
        let request = build_vertex_request(&texts, 1);

        let result = generate_embeddings(
            &client,
            "http://unused.invalid/vertex",
            None,
            &request,
            0,
            &ai_studio_url,
            Some("fake-api-key"),
            &texts,
            1,
            "gemini-embedding-001",
            &voyage_url,
            Some("fake-voyage-key"),
            "voyage-3.5-lite",
        )
        .await;

        assert_eq!(result.unwrap(), vec![vec![0.1]]);
    }

    /// Requisito de fail-fast: um 5xx do AI Studio deve pular IMEDIATAMENTE para o próximo elo
    /// (VoyageAI) — sem retry no próprio AI Studio (diferente do Vertex, que tem retry próprio
    /// controlado por `max_retries`).
    #[tokio::test]
    async fn test_generate_embeddings_skips_to_next_link_on_5xx_without_retrying_same_provider() {
        let mock_server = MockServer::start().await;
        Mock::given(method("POST"))
            .and(path("/ai-studio"))
            .respond_with(ResponseTemplate::new(500).set_body_string("Internal Server Error"))
            .expect(1)
            .mount(&mock_server)
            .await;

        Mock::given(method("POST"))
            .and(path("/voyage"))
            .respond_with(ResponseTemplate::new(200).set_body_json(voyage_success_body(vec![0.2])))
            .expect(1)
            .mount(&mock_server)
            .await;

        let client = reqwest::Client::new();
        let ai_studio_url = format!("{}/ai-studio", mock_server.uri());
        let voyage_url = format!("{}/voyage", mock_server.uri());
        let texts = sample_texts();
        let request = build_vertex_request(&texts, 1);

        let result = generate_embeddings(
            &client,
            "http://unused.invalid/vertex",
            None,
            &request,
            0,
            &ai_studio_url,
            Some("fake-api-key"),
            &texts,
            1,
            "gemini-embedding-001",
            &voyage_url,
            Some("fake-voyage-key"),
            "voyage-3.5-lite",
        )
        .await;

        assert_eq!(result.unwrap(), vec![vec![0.2]]);
    }

    /// Requisito de fail-fast: um erro de conexão (porta fechada, connection refused) no AI
    /// Studio deve pular IMEDIATAMENTE para o próximo elo (VoyageAI), sem esperar um timeout
    /// completo. Usa um endereço loopback com porta fechada — o SO retorna "connection refused"
    /// imediatamente, sem envolver o `CONNECT_TIMEOUT_SECS`/`REQUEST_TIMEOUT_SECS` do client (que
    /// só entram em jogo quando a conexão fica pendurada, não quando é recusada).
    #[tokio::test]
    async fn test_generate_embeddings_skips_to_next_link_on_connection_error() {
        let mock_server = MockServer::start().await;
        Mock::given(method("POST"))
            .and(path("/voyage"))
            .respond_with(ResponseTemplate::new(200).set_body_json(voyage_success_body(vec![0.3])))
            .expect(1)
            .mount(&mock_server)
            .await;

        let client = embedding_client_test_client();
        // Porta 1 em loopback: nenhum serviço escuta ali, então a conexão é recusada de
        // imediato (sem envolver o timeout configurado no client).
        let ai_studio_url = "http://127.0.0.1:1/ai-studio".to_string();
        let voyage_url = format!("{}/voyage", mock_server.uri());
        let texts = sample_texts();
        let request = build_vertex_request(&texts, 1);

        let started = std::time::Instant::now();
        let result = generate_embeddings(
            &client,
            "http://unused.invalid/vertex",
            None,
            &request,
            0,
            &ai_studio_url,
            Some("fake-api-key"),
            &texts,
            1,
            "gemini-embedding-001",
            &voyage_url,
            Some("fake-voyage-key"),
            "voyage-3.5-lite",
        )
        .await;
        let elapsed = started.elapsed();

        assert_eq!(result.unwrap(), vec![vec![0.3]]);
        assert!(
            elapsed < Duration::from_secs(CONNECT_TIMEOUT_SECS),
            "connection refused deveria ser instantâneo, não esperar o connect timeout: {:?}",
            elapsed
        );
    }

    fn embedding_client_test_client() -> reqwest::Client {
        build_http_client()
    }

    #[test]
    fn test_voyage_ai_url_format() {
        let url = voyage_ai_url(VOYAGE_DEFAULT_BASE_URL);
        assert_eq!(url, "https://api.voyageai.com/v1/embeddings");
    }

    #[tokio::test]
    async fn test_call_voyage_ai_embeddings_sends_output_dimension_when_supported() {
        let mock_server = MockServer::start().await;
        Mock::given(method("POST"))
            .and(path("/voyage"))
            .respond_with(
                ResponseTemplate::new(200).set_body_json(voyage_success_body(vec![0.0; 1024])),
            )
            .expect(1)
            .mount(&mock_server)
            .await;

        let client = reqwest::Client::new();
        let voyage_url = format!("{}/voyage", mock_server.uri());

        call_voyage_ai_embeddings(
            &client,
            &voyage_url,
            "fake-voyage-key",
            &sample_texts(),
            1024,
            "voyage-3.5-lite",
        )
        .await
        .expect("chamada ao mock deve suceder");

        let requests = mock_server.received_requests().await.unwrap();
        let body: serde_json::Value = serde_json::from_slice(&requests[0].body).unwrap();
        assert_eq!(body["output_dimension"], 1024);
        assert_eq!(body["model"], "voyage-3.5-lite");
    }

    /// Ponto crítico da issue #428: nenhum modelo VoyageAI produz nativamente 768 dimensões (a
    /// dimensão atual do schema pgvector, `vector(${embedding.dimension})`, padrão 768) — os
    /// valores de `output_dimension` suportados pelos modelos flexíveis são 256/512/1024/2048.
    /// Em vez de assumir compatibilidade, o cliente deve falhar explicitamente quando a
    /// dimensionalidade retornada não bate com a esperada.
    #[tokio::test]
    async fn test_call_voyage_ai_embeddings_errors_on_dimension_mismatch() {
        let mock_server = MockServer::start().await;
        Mock::given(method("POST"))
            .and(path("/voyage"))
            .respond_with(
                // O provider devolve 1024 dims (dimensão nativa/default do modelo) mesmo tendo
                // sido pedido 768, que não é um output_dimension suportado.
                ResponseTemplate::new(200).set_body_json(voyage_success_body(vec![0.0; 1024])),
            )
            .expect(1)
            .mount(&mock_server)
            .await;

        let client = reqwest::Client::new();
        let voyage_url = format!("{}/voyage", mock_server.uri());

        let result = call_voyage_ai_embeddings(
            &client,
            &voyage_url,
            "fake-voyage-key",
            &sample_texts(),
            768,
            "voyage-3.5-lite",
        )
        .await;

        let err = result.expect_err("dimensão incompatível deve falhar explicitamente");
        assert!(
            err.contains("1024"),
            "erro deve mencionar dimensão retornada: {err}"
        );
        assert!(
            err.contains("768"),
            "erro deve mencionar dimensão esperada: {err}"
        );
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
