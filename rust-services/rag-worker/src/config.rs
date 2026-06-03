use std::env;

#[derive(Clone, Debug)]
pub struct Config {
    pub rabbitmq_url: String,
    pub anythingllm_api_key: String,
    pub anythingllm_api_url: String,
}

impl Config {
    pub fn from_env() -> Result<Self, String> {
        let rabbitmq_url = env::var("RABBITMQ_URL")
            .unwrap_or_else(|_| "amqp://guest:guest@rabbitmq:5672".to_string());

        let anythingllm_api_key = env::var("ANYTHINGLLM_API_KEY")
            .map_err(|_| "ANYTHINGLLM_API_KEY environment variable is not set".to_string())?;

        let anythingllm_api_url = env::var("ANYTHINGLLM_API_URL")
            .unwrap_or_else(|_| "http://anythingllm:3001/api/v1".to_string());

        Ok(Config {
            rabbitmq_url,
            anythingllm_api_key,
            anythingllm_api_url,
        })
    }
}
