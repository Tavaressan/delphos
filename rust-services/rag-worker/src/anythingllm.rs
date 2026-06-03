use crate::error::WorkerError;
use reqwest::header::{HeaderMap, HeaderValue, AUTHORIZATION, CONTENT_TYPE, ACCEPT};
use serde::{Deserialize, Serialize};
use std::time::Duration;

#[derive(Serialize)]
struct ChatRequest<'a> {
    message: &'a str,
    mode: &'static str,
}

#[derive(Deserialize, Debug, Clone)]
pub struct AnythingLLMSource {
    pub id: Option<serde_json::Value>,
    pub text: Option<String>,
    pub score: Option<f32>,
}

#[derive(Deserialize, Debug, Clone)]
pub struct AnythingLLMResponse {
    pub text: String,
    pub sources: Option<Vec<AnythingLLMSource>>,
}

#[derive(Clone)]
pub struct AnythingLLMClient {
    client: reqwest::Client,
    api_url: String,
}

impl AnythingLLMClient {
    pub fn new(api_url: String, api_key: String) -> Result<Self, WorkerError> {
        let mut headers = HeaderMap::new();
        
        let token = format!("Bearer {}", api_key);
        let mut auth_value = HeaderValue::from_str(&token)
            .map_err(|e| WorkerError::Config(format!("Invalid API Key header format: {}", e)))?;
        auth_value.set_sensitive(true);
        
        headers.insert(AUTHORIZATION, auth_value);
        headers.insert(CONTENT_TYPE, HeaderValue::from_static("application/json"));
        headers.insert(ACCEPT, HeaderValue::from_static("application/json"));

        let client = reqwest::Client::builder()
            .default_headers(headers)
            .timeout(Duration::from_secs(25))
            .build()
            .map_err(|e| WorkerError::Config(format!("Failed to build HTTP client: {}", e)))?;

        Ok(Self {
            client,
            api_url,
        })
    }

    pub async fn query_rag(&self, workspace_slug: &str, query: &str) -> Result<AnythingLLMResponse, WorkerError> {
        let url = format!("{}/workspace/{}/chat", self.api_url, workspace_slug);
        
        println!("Sending query to AnythingLLM at workspace '{}'...", workspace_slug);
        
        let req_body = ChatRequest {
            message: query,
            mode: "query",
        };

        let response = self.client.post(&url)
            .json(&req_body)
            .send()
            .await?;

        let status = response.status();
        if !status.is_success() {
            let err_body = response.text().await.unwrap_or_else(|_| "Unknown error body".to_string());
            return Err(WorkerError::AnythingLLM(format!(
                "HTTP Status {}: {}",
                status, err_body
            )));
        }

        let resp_body: AnythingLLMResponse = response.json().await?;
        Ok(resp_body)
    }
}
